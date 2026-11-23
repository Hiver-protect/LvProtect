const { Events, EmbedBuilder } = require('discord.js');
const antiraid = require('../modules/antiraid');
const welcomeConfig = require('../modules/welcomeConfig');

module.exports = {
    name: Events.GuildMemberAdd,

    async execute(member, client) {
        try {
            // 1. Analyse Anti-Raid et Anti-Bot
            await antiraid.handleMemberJoin(member, client);

            // 2. Message de bienvenue personnalisé
            const wConf = welcomeConfig.get(member.guild.id);
            if (wConf && wConf.channelId) {
                const wChannel = member.guild.channels.cache.get(wConf.channelId);
                if (wChannel && wChannel.isTextBased()) {
                    const welcomeText = (wConf.message || "Bienvenue {user} sur **{server}** ! Nous sommes maintenant {count} membres.")
                        .replace(/{user}/g, `<@${member.id}>`)
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{count}/g, member.guild.memberCount);

                    const welcomeEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle(`👋 Bienvenue sur ${member.guild.name} !`)
                        .setDescription(welcomeText)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .setFooter({ text: `Membre #${member.guild.memberCount}` })
                        .setTimestamp();

                    await wChannel.send({ embeds: [welcomeEmbed] }).catch(() => {});
                }
            }

            // 3. Déclenchement de la vérification si configurée
            try {
                const vEngine = require('../modules/verificationEngine');
                const vConf = await vEngine.getConfig(member.guild.id);
                if (vConf && vConf.enabled && vConf.roleId) {
                    await vEngine.startVerification(member, null);
                }
            } catch (vErr) {
                console.error("Erreur vérification automatique:", vErr.message);
            }

        } catch (err) {
            console.error("❌ Erreur guildMemberAdd:", err.message);
        }
    }
};
