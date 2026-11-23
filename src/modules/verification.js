const verificationEngine = require('./verificationEngine');

module.exports = {
    async startVerification(member, client, interaction = null) {
        return verificationEngine.startVerification(member, interaction);
    }
};
