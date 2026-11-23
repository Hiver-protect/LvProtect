const { Events, EmbedBuilder, PermissionsBitField, ActivityType } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * HIVERGUARD DASHBOARD - ULTIMATE PRO VERSION
 * Système de monitoring haute performance avec auto-récupération.
 */

let updateInterval = null;
let lastUpdateHash = "";
let isProcessing = false;

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        const CHANNEL_ID = process.env.LOG_CHANNEL_ID || "1497093661517938920";
        const STORAGE_FILE = path.join(process.cwd(), "status_storage.json");
        const log = (m) => console.log(`[📊 DASHBOARD] ${m}`);

        // Présence Discord
        client.user.setPresence({
            activities: [{ name: `/help • LvProtect Sécurité`, type: ActivityType.Watching }],
            status: 'online'
        });

        // =========================
        // 🔄 AUTO-UPDATE EN ARRIÈRE-PLAN
        // =========================
        try {
            const { startAutoUpdate } = require('../modules/auto-update');
            startAutoUpdate(client);
        } catch (e) {
            log(`⚠️ Auto-update non disponible: ${e.message}`);
        }

        // =========================
        // 🚀 AUTO-DEPLOY SLASH COMMANDS
        // =========================
        log("Initialisation et déploiement automatique des slash commands...");
        try {
            const deployer = require('../deploy-commands');
            await deployer.execute(client);
        } catch (e) {
            log(`❌ Erreur auto-déploiement : ${e.message}`);
        }

        log("Démarrage du monitoring HiverGuard...");

        // =========================
        // 🛠️ OUTILS DE MESURE
        // =========================
        
        const getHardwareInfo = () => {
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            const memPercent = Math.round((usedMem / totalMem) * 100);
            
            // Charge CPU (1 min)
            const load = os.loadavg()[0].toFixed(2);
            
            return {
                memPercent,
                memUsedGB: (usedMem / 1024 / 1024 / 1024).toFixed(2),
                memTotalGB: (totalMem / 1024 / 1024 / 1024).toFixed(2),
                load,
                cpuModel: os.cpus()[0].model.split(' ')[0]
            };
        };

        const createProgressBar = (percent) => {
            const size = 12;
            const progress = Math.round((size * percent) / 100);
            const empty = size - progress;
            return `[${"▰".repeat(progress)}${"▱".repeat(empty)}] ${percent}%`;
        };

        const getBotStats = () => {
            const totalMembers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
            return {
                servers: client.guilds.cache.size.toLocaleString(),
                members: totalMembers.toLocaleString(),
                channels: client.channels.cache.size.toLocaleString()
            };
        };

        // =========================
        // 💾 PERSISTENCE DES DONNÉES
        // =========================

        const getStoredMessageId = async () => {
            try {
                const data = await fs.readFile(STORAGE_FILE, 'utf8');
                return JSON.parse(data).messageId;
            } catch { return null; }
        };

        const saveMessageId = async (id) => {
            await fs.writeFile(STORAGE_FILE, JSON.stringify({ messageId: id }, null, 2));
        };

        // =========================
        // 🔎 INITIALISATION DU SALON
        // =========================

        const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
        if (!channel || !channel.isTextBased()) return log("❌ Salon introuvable ou invalide.");

        let statusMessage = null;
        const storedId = await getStoredMessageId();

        if (storedId) {
            statusMessage = await channel.messages.fetch(storedId).catch(() => null);
        }

        // =========================
        // 🔄 LOGIQUE DE MISE À JOUR
        // =========================

        const refreshDashboard = async () => {
            if (isProcessing) return;
            isProcessing = true;

            try {
                const hw = getHardwareInfo();
                const stats = getBotStats();
                const ping = client.ws.ping;
                const uptimeStamp = Math.floor((Date.now() - client.uptime) / 1000);
                const version = require(path.join(process.cwd(), 'package.json')).version || "1.0.0";

                // Hash de vérification (évite d'éditer si rien ne change)
                const currentHash = `${ping}-${hw.memPercent}-${stats.members}`;
                if (currentHash === lastUpdateHash && statusMessage) {
                    isProcessing = false;
                    return;
                }
                lastUpdateHash = currentHash;

                const embed = new EmbedBuilder()
                    .setTitle("🛡️ HiverGuard • System Monitoring")
                    .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
                    .setColor(ping < 100 ? 0x00FF7F : 0xFFAA00)
                    .setDescription(`**État du système :** \`OPÉRATIONNEL\`\n**Dernière actualisation :** <t:${Math.floor(Date.now()/1000)}:T>`)
                    .addFields(
                        { 
                            name: "🤖 Information Bot", 
                            value: `**Statut:** ${ping < 100 ? '🟢 Online' : '🟡 Latence'}\n**Ping:** \`${ping}ms\`\n**Version:** \`v${version}\``, 
                            inline: true 
                        },
                        { 
                            name: "📈 Statistiques Globales", 
                            value: `**Serveurs:** \`${stats.servers}\`\n**Utilisateurs:** \`${stats.members}\`\n**Salons:** \`${stats.channels}\``, 
                            inline: true 
                        },
                        { 
                            name: "⚙️ Hardware (Load: " + hw.load + ")", 
                            value: `\`\`\`prolog\nCPU: ${hw.cpuModel}\nRAM: ${hw.memUsedGB}GB / ${hw.memTotalGB}GB\n${createProgressBar(hw.memPercent)}\`\`\``, 
                            inline: false 
                        },
                        { 
                            name: "⏱️ Temps de fonctionnement", 
                            value: `Démarré le : <t:${uptimeStamp}:f> (<t:${uptimeStamp}:R>)`, 
                            inline: false 
                        }
                    )
                    .setFooter({ text: `HiverGuard Engine • Host: ${os.hostname()}`, iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();

                if (!statusMessage) {
                    statusMessage = await channel.send({ embeds: [embed] });
                    await saveMessageId(statusMessage.id);
                    log("🆕 Nouveau dashboard généré.");
                } else {
                    await statusMessage.edit({ embeds: [embed] });
                }

                // Optionnel : Mise à jour de la présence du bot
                client.user.setPresence({
                    activities: [{ name: `${stats.members} membres | ${ping}ms`, type: ActivityType.Watching }],
                    status: 'online'
                });

            } catch (error) {
                if (error.code === 10008) { // Message supprimé
                    log("⚠️ Message d'origine supprimé, recréation...");
                    statusMessage = null;
                } else {
                    log(`❌ Erreur Update: ${error.message}`);
                }
            } finally {
                isProcessing = false;
            }
        };

        // =========================
        // 🚀 LANCEMENT
        // =========================
        
        // Premier lancement
        await refreshDashboard();

        // Intervalle de sécurité (15 secondes)
        if (updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(refreshDashboard, 15000);

        log("✅ Dashboard PRO actif 24/7 (Cycle 15s)");
    }
};