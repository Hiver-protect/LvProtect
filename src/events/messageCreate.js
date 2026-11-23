const { Events, PermissionsBitField } = require('discord.js');
const { getConfig } = require('../modules/guildConfig');

const spamCache = new Map();
const cooldown = new Map();

module.exports = {
    name: Events.MessageCreate,

    async execute(message, client) {

        try {
            if (!message.guild || message.author.bot) return;

            const guildId = message.guild.id;
            const userId = message.author.id;
            const key = `${guildId}-${userId}`;

            const now = Date.now();

            // =========================
            // 🧠 COOLDOWN SANCTION
            // =========================
            if (cooldown.has(key)) {
                const last = cooldown.get(key);
                if (now - last < 15000) return;
            }

            // =========================
            // 📦 INIT CACHE
            // =========================
            if (!spamCache.has(key)) {
                spamCache.set(key, []);
            }

            const data = spamCache.get(key);

            // ignore messages vides / trop longs spam simples
            const content = (message.content || "").trim();
            if (!content) return;

            data.push({ time: now, content });

            // =========================
            // 🧹 CLEAN (10 sec window)
            // =========================
            const filtered = data.filter(m => now - m.time < 10000);
            spamCache.set(key, filtered);

            // =========================
            // 📊 ANALYSE INTELLIGENTE
            // =========================
            let score = 0;

            const lastMessage = filtered[filtered.length - 1];

            const sameCount = filtered.filter(m => m.content === lastMessage.content).length;

            // base spam (volume)
            score += filtered.length;

            // répétition spam (spam copier/coller)
            score += sameCount * 2;

            // spam burst rapide
            const timeDiff = filtered.length > 1
                ? filtered[filtered.length - 1].time - filtered[0].time
                : 0;

            if (timeDiff < 3000) score += 2;

            // =========================
            // 🚨 THRESHOLD
            // =========================
            if (score >= 7) {

                const member = message.member;

                // =========================
                // 🛡️ TIMEOUT SAFE
                // =========================
                const isStaff = member.permissions.has(PermissionsBitField.Flags.ModerateMembers) || 
                                member.permissions.has(PermissionsBitField.Flags.Administrator);

                if (
                    member &&
                    member.moderatable &&
                    !isStaff
                ) {
                    await member.timeout(60 * 1000, "Anti-spam HiverGuard")
                        .catch(() => {});
                }

                // =========================
                // 📊 LOG CHANNEL
                // =========================
                const config = getConfig?.(guildId);

                if (config?.logChannel) {
                    const logChannel = client.channels.cache.get(config.logChannel);

                    if (logChannel) {
                        logChannel.send({
                            content:
                                `🚨 **ANTI-SPAM DETECTÉ**\n` +
                                `👤 User: ${message.author.tag}\n` +
                                `📍 Salon: <#${message.channel.id}>\n` +
                                `⚠️ Score: ${score}`
                        }).catch(() => {});
                    }
                }

                // =========================
                // 🔁 RESET + COOLDOWN
                // =========================
                spamCache.delete(key);
                cooldown.set(key, now);
            }

            // =========================
            // 🧠 MEMORY CLEANUP
            // =========================
            if (spamCache.size > 8000) {
                spamCache.clear();
            }

        } catch (err) {
            console.log("❌ Anti-spam error:", err.message);
        }
    }
};