const { SlashCommandBuilder } = require('discord.js');
const vEngine = require('../modules/verificationEngine');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Lancer la vérification de sécurité pour accéder au serveur'),
    
    async execute(interaction) {
        await vEngine.startVerification(interaction.member, interaction);
    }
};
