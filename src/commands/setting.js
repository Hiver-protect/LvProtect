const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const settings = require('./settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setting')
        .setDescription('⚙️ Panneau de configuration interactif (alias de /settings)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        return settings.execute(interaction, client);
    }
};
