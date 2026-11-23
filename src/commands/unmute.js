const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendSecurityLog } = require('../modules/antiraid');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('🔊 Rétablir la parole d\'un membre')
        .addUserOption(opt => 
            opt.setName('membre')
                .setDescription('Le membre à unmute')
                .setRequired(true))
        .addStringOption(opt => 
            opt.setName('raison')
                .setDescription('Raison de la levée de sanction')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('membre');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        const guild = interaction.guild;

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            return interaction.reply({ content: "❌ Ce membre n'est pas présent sur le serveur.", ephemeral: true });
        }

        if (!targetMember.communicationDisabledUntilTimestamp || targetMember.communicationDisabledUntilTimestamp < Date.now()) {
            return interaction.reply({ content: "⚠️ Ce membre n'est actuellement pas mute.", ephemeral: true });
        }

        if (!targetMember.moderatable) {
            return interaction.reply({ content: "❌ Je n'ai pas les permissions suffisantes pour unmute ce membre.", ephemeral: true });
        }

        try {
            await targetMember.timeout(null, `[Unmute par ${interaction.user.tag}] ${reason}`);

            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("✅ Sanction Levée")
                .setDescription(`**${targetUser.tag}** n'est plus en sourdine.`)
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            const logEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("🔊 Modération : Unmute")
                .addFields(
                    { name: "👤 Cible", value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                    { name: "👮 Modérateur", value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
                    { name: "📝 Raison", value: reason, inline: false }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            await sendSecurityLog(guild, logEmbed, client);

        } catch (err) {
            console.error("Erreur commande unmute:", err);
            await interaction.reply({ content: `❌ Erreur : ${err.message}`, ephemeral: true });
        }
    }
};
