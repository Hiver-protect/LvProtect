const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { checkForUpdates, performUpdate } = require('../modules/auto-update');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update')
        .setDescription('🔄 Forcer la mise à jour immédiate du bot depuis GitHub')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const checkingEmbed = new EmbedBuilder()
            .setColor('#2B7FFF')
            .setTitle("🔄 Vérification des Mises à Jour")
            .setDescription("Connexion à GitHub en cours pour vérifier s'il y a de nouveaux commits...")
            .setTimestamp();

        await interaction.editReply({ embeds: [checkingEmbed] });

        const hasUpdate = await checkForUpdates();

        if (!hasUpdate) {
            const upToDateEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("✅ Bot Déjà à Jour")
                .setDescription("Le bot tourne déjà sur la version la plus récente de GitHub (`main`). Aucun redémarrage nécessaire.")
                .setTimestamp();

            return interaction.editReply({ embeds: [upToDateEmbed] });
        }

        const updatingEmbed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle("📥 Nouvelle Version Détectée !")
            .setDescription("Téléchargement des fichiers et redémarrage automatique en cours...\nLe bot sera de retour dans quelques secondes !")
            .setTimestamp();

        await interaction.editReply({ embeds: [updatingEmbed] });

        // Déclencher la procédure de mise à jour
        await performUpdate(client);
    }
};
