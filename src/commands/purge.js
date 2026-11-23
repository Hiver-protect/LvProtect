const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendSecurityLog } = require('../modules/antiraid');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('🧹 Supprimer rapidement des messages dans le salon')
        .addIntegerOption(opt => 
            opt.setName('nombre')
                .setDescription('Nombre de messages à supprimer (1 à 100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(opt => 
            opt.setName('utilisateur')
                .setDescription('Supprimer uniquement les messages de cet utilisateur')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, client) {
        const amount = interaction.options.getInteger('nombre');
        const filterUser = interaction.options.getUser('utilisateur');
        const channel = interaction.channel;

        await interaction.deferReply({ ephemeral: true });

        try {
            const messages = await channel.messages.fetch({ limit: 100 });
            let targetMessages = messages;

            // Filtrer les messages de moins de 14 jours (limite Discord API)
            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            targetMessages = targetMessages.filter(m => m.createdTimestamp > twoWeeksAgo);

            if (filterUser) {
                targetMessages = targetMessages.filter(m => m.author.id === filterUser.id);
            }

            const toDelete = Array.from(targetMessages.values()).slice(0, amount);

            if (toDelete.length === 0) {
                return interaction.editReply({
                    content: "⚠️ Aucun message récent (< 14 jours) correspondant n'a été trouvé à supprimer."
                });
            }

            const deleted = await channel.bulkDelete(toDelete, true);

            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("🧹 Nettoyage Effectué")
                .setDescription(`**${deleted.size} message(s)** ont été supprimés avec succès dans ce salon.`)
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

            // Audit log
            const logEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("🧹 Modération : Purge de messages")
                .addFields(
                    { name: "📍 Salon", value: `<#${channel.id}>`, inline: true },
                    { name: "👮 Modérateur", value: `${interaction.user.tag}`, inline: true },
                    { name: "🗑️ Messages supprimés", value: `${deleted.size}`, inline: true },
                    { name: "🎯 Cible", value: filterUser ? `${filterUser.tag}` : "Tous", inline: true }
                )
                .setTimestamp();

            await sendSecurityLog(interaction.guild, logEmbed, client);

        } catch (err) {
            console.error("Erreur commande purge:", err);
            await interaction.editReply({ content: `❌ Erreur lors de la suppression : ${err.message}` });
        }
    }
};
