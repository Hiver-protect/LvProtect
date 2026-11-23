const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const store = require('../modules/lockdownStore');
const { sendSecurityLog } = require('../modules/antiraid');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('🔒 Verrouiller immédiatement tous les salons texte du serveur')
        .addStringOption(opt =>
            opt.setName('raison')
                .setDescription('Raison du confinement d\'urgence')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const reason = interaction.options.getString('raison') || "Mesure d'urgence de sécurité";
        const data = store.load();

        if (data[guild.id]) {
            return interaction.editReply({ 
                content: "⚠️ Un confinement (lockdown) est déjà actif sur ce serveur." 
            });
        }

        data[guild.id] = {};
        let lockedCount = 0;

        for (const channel of guild.channels.cache.values()) {
            if (channel.type !== ChannelType.GuildText) continue;

            const everyone = guild.roles.everyone;
            const currentPerms = channel.permissionOverwrites.cache.get(everyone.id);

            data[guild.id][channel.id] = currentPerms ? currentPerms.allow.bitfield.toString() : null;

            await channel.permissionOverwrites.edit(everyone, {
                SendMessages: false,
                AddReactions: false
            }).catch(() => {});

            lockedCount++;
        }

        store.save(data);

        // Annonce globale dans le premier salon accessible
        const alertEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("🚨 CONFINEMENT DU SERVEUR (LOCKDOWN) 🚨")
            .setDescription(
                "Le serveur a été temporairement verrouillé par l'équipe d'administration.\n" +
                "L'envoi de messages est temporairement suspendu pour assurer la sécurité."
            )
            .addFields(
                { name: "👮 Déclenché par", value: interaction.user.tag, inline: true },
                { name: "📝 Raison", value: reason, inline: true }
            )
            .setTimestamp();

        const announceChannel = guild.systemChannel || guild.channels.cache.find(c => c.type === ChannelType.GuildText);
        if (announceChannel) {
            await announceChannel.send({ embeds: [alertEmbed] }).catch(() => {});
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("🔒 Lockdown Activé")
            .setDescription(`**${lockedCount} salons** ont été verrouillés avec succès.`)
            .addFields({ name: "Raison", value: reason })
            .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });

        // Log de sécurité
        const logEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("🚨 Alerte Admin : Lockdown Déclenché")
            .addFields(
                { name: "👮 Administrateur", value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
                { name: "🔒 Salons verrouillés", value: `${lockedCount}`, inline: true },
                { name: "📝 Raison", value: reason, inline: false }
            )
            .setTimestamp();

        await sendSecurityLog(guild, logEmbed, client);
    }
};
