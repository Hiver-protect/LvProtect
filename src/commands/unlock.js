const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const store = require('../modules/lockdownStore');
const { sendSecurityLog } = require('../modules/antiraid');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('🔓 Déverrouiller le serveur et rétablir les salons')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const data = store.load();

        if (!data[guild.id]) {
            return interaction.editReply({ 
                content: "⚠️ Aucun confinement (lockdown) n'est actuellement actif sur ce serveur." 
            });
        }

        let unlockedCount = 0;

        for (const channel of guild.channels.cache.values()) {
            if (channel.type !== ChannelType.GuildText) continue;

            const everyone = guild.roles.everyone;

            await channel.permissionOverwrites.edit(everyone, {
                SendMessages: null,
                AddReactions: null
            }).catch(() => {});

            unlockedCount++;
        }

        delete data[guild.id];
        store.save(data);

        // Annonce globale
        const liftEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("✅ CONFINEMENT TERMINÉ (UNLOCK) ✅")
            .setDescription(
                "Le serveur a été déverrouillé par l'équipe d'administration.\n" +
                "Vous pouvez à nouveau discuter normalement dans les salons."
            )
            .setFooter({ text: `Déverrouillé par ${interaction.user.tag}` })
            .setTimestamp();

        const announceChannel = guild.systemChannel || guild.channels.cache.find(c => c.type === ChannelType.GuildText);
        if (announceChannel) {
            await announceChannel.send({ embeds: [liftEmbed] }).catch(() => {});
        }

        const confirmEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("🔓 Lockdown Levé")
            .setDescription(`**${unlockedCount} salons** ont été restaurés avec succès.`)
            .setTimestamp();

        await interaction.editReply({ embeds: [confirmEmbed] });

        // Log de sécurité
        const logEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("🔓 Alerte Admin : Lockdown Levé")
            .addFields(
                { name: "👮 Administrateur", value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
                { name: "🔓 Salons restaurés", value: `${unlockedCount}`, inline: true }
            )
            .setTimestamp();

        await sendSecurityLog(guild, logEmbed, client);
    }
};
