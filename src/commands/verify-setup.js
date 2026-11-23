const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const vEngine = require('../modules/verificationEngine');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify-setup')
        .setDescription('Configurer le système de vérification')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(opt => opt.setName('role').setDescription('Rôle à donner').setRequired(true))
        .addStringOption(opt => opt.setName('mode').setDescription('Mode de vérification').addChoices(
            { name: 'Message Privé (DM)', value: 'DM' },
            { name: 'Salon Actuel (Channel)', value: 'CHANNEL' }
        ).setRequired(true))
        .addChannelOption(opt => opt.setName('logs').setDescription('Salon de logs').addChannelTypes(ChannelType.GuildText)),

    async execute(interaction) {
        const config = {
            enabled: true,
            roleId: interaction.options.getRole('role').id,
            mode: interaction.options.getString('mode'),
            logChannelId: interaction.options.getChannel('logs')?.id || null
        };

        await vEngine.saveConfig(interaction.guildId, config);
        await interaction.reply({ content: `✅ Système configuré en mode **${config.mode}**.`, ephemeral: true });
    }
};