const { Events } = require('discord.js');
const antiraid = require('../modules/antiraid');

module.exports = {
    name: Events.MessageCreate,

    async execute(message, client) {
        try {
            // Traitement sécuritaire complet (anti-pub, anti-mass mention, anti-spam)
            await antiraid.handleMessageSecurity(message, client);
        } catch (err) {
            console.error("❌ Erreur messageCreate:", err.message);
        }
    }
};
