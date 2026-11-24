const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelType
} = require('discord.js');

const { getConfig, setConfig, updateConfig } = require('../modules/guildConfig');
const vEngine = require('../modules/verificationEngine');
const welcomeConfig = require('../modules/welcomeConfig');
const lockdownStore = require('../modules/lockdownStore');

const THEME_BLUE = '#2B7FFF'; // Bleu Discord épuré et propre
const SUPPORT_URL = "https://discord.gg/MtdhG6JAf8";
const DOCS_URL = "https://github.com/Hiver-protect/LvProtect";

/**
 * Génère l'embed avec la mise en page propre et aérée du modèle RaidProtect
 */
async function buildSettingsEmbed(guild, tab, client) {
    const config = getConfig(guild.id) || {};
    const vConf = await vEngine.getConfig(guild.id);
    const wConf = welcomeConfig.get(guild.id);
    const isLockdown = Boolean(lockdownStore.load()[guild.id]);

    const header = 
        `*LvProtect v2.0*\n\n` +
        `Les réglages de **LvProtect** pour ce serveur. Pour commencer, regardez **Arrivées** (captcha, anti-raid) et **Modération** (salon de logs, sanctions).\n` +
        `Tout changement s'applique immédiatement.\n\n` +
        `────────────────────────────────────────\n\n`;

    const embed = new EmbedBuilder()
        .setColor(THEME_BLUE)
        .setTitle("⚙️ Configuration")
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setFooter({ text: "LvProtect • Système de protection en temps réel", iconURL: client.user.displayAvatarURL() });

    if (tab === 'general') {
        const logText = config.logChannel ? `<#${config.logChannel}>` : "Désactivé";
        const alertsText = config.staffAlerts !== false ? "Activé · Notification instantanée" : "Désactivé";

        embed.setDescription(
            header +
            `📜 **Salon de logs**\n` +
            `│ ${logText}\n\n` +
            `🔔 **Alertes Staff**\n` +
            `│ ${alertsText}\n\n` +
            `🔑 **Permissions**\n` +
            `│ Intégrations : commandes slash seules\n\n` +
            `🕒 **Fuseau horaire**\n` +
            `│ Europe/Paris (UTC+1)`
        );
    } else if (tab === 'arrivals') {
        const captchaText = vConf.enabled ? "Activé · Bouton & modal sans MP" : "Désactivé";
        const roleText = vConf.roleId ? `<@&${vConf.roleId}>` : "Non configuré";
        const welcomeText = wConf?.channelId ? `<#${wConf.channelId}> · ${wConf.message ? 'Personnalisé' : 'Standard'}` : "Désactivé";
        const minAgeText = `${config.minAccountAgeDays || 0} jour(s) · Surveillance nouveaux comptes`;

        embed.setDescription(
            header +
            `🛡️ **Captcha à l'arrivée**\n` +
            `│ ${captchaText}\n\n` +
            `✅ **Rôle vérifié**\n` +
            `│ ${roleText}\n\n` +
            `👋 **Message de bienvenue**\n` +
            `│ ${welcomeText}\n\n` +
            `⏳ **Âge minimum du compte**\n` +
            `│ ${minAgeText}`
        );
    } else if (tab === 'protection') {
        const raidText = config.antiRaid !== false ? "Activé · Détection 6 arrivées / 15s" : "Désactivé";
        const botText = config.antiBot !== false ? "Activé · Expulsion auto des bots non autorisés" : "Désactivé";
        const linkText = config.antiLink !== false ? "Activé · Suppression auto des invitations" : "Désactivé";
        const mentionText = config.antiMention !== false ? "Activé · Timeout 10m en cas d'abus @everyone" : "Désactivé";
        const spamText = config.antiSpam !== false ? "Activé · Détection par rafale & flood" : "Désactivé";

        embed.setDescription(
            header +
            `🚨 **Mode Anti-Raid**\n` +
            `│ ${raidText}\n\n` +
            `🤖 **Anti-Bot Rogue**\n` +
            `│ ${botText}\n\n` +
            `🔗 **Anti-Pub & Liens**\n` +
            `│ ${linkText}\n\n` +
            `📢 **Anti-Mass Mentions**\n` +
            `│ ${mentionText}\n\n` +
            `💬 **Anti-Spam intelligent**\n` +
            `│ ${spamText}`
        );
    } else if (tab === 'moderation') {
        const lockText = isLockdown ? "🚨 Verrouillé · Salons fermés" : "✅ Accessible · Serveur ouvert";

        embed.setDescription(
            header +
            `⚠️ **Sanctions automatiques (/moderation)**\n` +
            `│ 3 avertissements ➔ Timeout 10m\n` +
            `│ 5 avertissements ➔ Timeout 1h\n` +
            `│ 7 avertissements ➔ Expulsion\n\n` +
            `🔒 **Confinement d'urgence (Lockdown)**\n` +
            `│ ${lockText}\n\n` +
            `🛡️ **Protection hiérarchie**\n` +
            `│ Activée · Interdiction de sanctionner le personnel`
        );
    } else if (tab === 'utils') {
        const ticketText = config.ticketCategory ? `📁 <#${config.ticketCategory}>` : "Non configurée";

        embed.setDescription(
            header +
            `🎫 **Catégorie des tickets**\n` +
            `│ ${ticketText}\n\n` +
            `📊 **Statut du système**\n` +
            `│ Opérationnel · Ping WebSocket : ${client.ws.ping}ms\n\n` +
            `⏱️ **Disponibilité (Uptime)**\n` +
            `│ <t:${Math.floor(client.readyTimestamp / 1000)}:R>`
        );
    }

    return embed;
}

/**
 * Construit la rangée d'onglets (5 boutons)
 */
function buildTabsRow(activeTab) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('set_tab_general')
            .setLabel('Général')
            .setEmoji('📁')
            .setStyle(activeTab === 'general' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('set_tab_arrivals')
            .setLabel('Arrivées')
            .setEmoji('📁')
            .setStyle(activeTab === 'arrivals' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('set_tab_protection')
            .setLabel('Protection')
            .setEmoji('📁')
            .setStyle(activeTab === 'protection' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('set_tab_moderation')
            .setLabel('Modération')
            .setEmoji('📁')
            .setStyle(activeTab === 'moderation' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('set_tab_utils')
            .setLabel('Utilitaires')
            .setEmoji('📁')
            .setStyle(activeTab === 'utils' ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
}

/**
 * Construit les boutons d'action bleus pour chaque onglet
 */
function buildActionsRow(tab, config, vConf) {
    const row = new ActionRowBuilder();

    if (tab === 'general') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_pick_log')
                .setLabel('Modifier Salon Logs')
                .setEmoji('📜')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_toggle_alerts')
                .setLabel(config.staffAlerts !== false ? 'Désactiver Alertes' : 'Activer Alertes')
                .setEmoji('🔔')
                .setStyle(ButtonStyle.Primary)
        );
    } else if (tab === 'arrivals') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_toggle_captcha')
                .setLabel(vConf.enabled ? 'Désactiver Captcha' : 'Activer Captcha')
                .setEmoji('🛡️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_pick_role')
                .setLabel('Modifier Rôle')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_pick_welcome')
                .setLabel('Modifier Bienvenue')
                .setEmoji('👋')
                .setStyle(ButtonStyle.Primary)
        );
    } else if (tab === 'protection') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_toggle_antilink')
                .setLabel(`Anti-Pub: ${config.antiLink !== false ? 'ON' : 'OFF'}`)
                .setEmoji('🔗')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_toggle_antispam')
                .setLabel(`Anti-Spam: ${config.antiSpam !== false ? 'ON' : 'OFF'}`)
                .setEmoji('💬')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_toggle_antibot')
                .setLabel(`Anti-Bot: ${config.antiBot !== false ? 'ON' : 'OFF'}`)
                .setEmoji('🤖')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_toggle_antiraid')
                .setLabel(`Anti-Raid: ${config.antiRaid !== false ? 'ON' : 'OFF'}`)
                .setEmoji('🚨')
                .setStyle(ButtonStyle.Primary)
        );
    } else if (tab === 'moderation') {
        const isLockdown = Boolean(lockdownStore.load()[config.guildId || '']);
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_toggle_lockdown')
                .setLabel(isLockdown ? 'Lever le Lockdown' : 'Déclencher Lockdown')
                .setEmoji('🔒')
                .setStyle(isLockdown ? ButtonStyle.Success : ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_warn_paliers')
                .setLabel('Infos Paliers')
                .setEmoji('⚠️')
                .setStyle(ButtonStyle.Primary)
        );
    } else if (tab === 'utils') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_pick_ticket')
                .setLabel('Modifier Catégorie Tickets')
                .setEmoji('🎫')
                .setStyle(ButtonStyle.Primary)
        );
    }

    return row;
}

/**
 * Construit la rangée du bas (Serveur Support, Documentation, Personnaliser)
 */
function buildBottomRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('Serveur Support')
            .setEmoji('💬')
            .setStyle(ButtonStyle.Link)
            .setURL(SUPPORT_URL),
        new ButtonBuilder()
            .setLabel('Documentation')
            .setEmoji('📖')
            .setStyle(ButtonStyle.Link)
            .setURL(DOCS_URL),
        new ButtonBuilder()
            .setCustomId('btn_changelog')
            .setLabel('Changelog')
            .setEmoji('📕')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('btn_refresh')
            .setLabel('Personnaliser')
            .setEmoji('✨')
            .setStyle(ButtonStyle.Primary)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setting')
        .setDescription('⚙️ Panneau de configuration interactif et avancé de LvProtect')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const guild = interaction.guild;
        let currentTab = 'general';
        let currentPicker = null; // 'log', 'role', 'welcome', 'ticket'

        const renderComponents = async () => {
            const config = getConfig(guild.id) || {};
            config.guildId = guild.id;
            const vConf = await vEngine.getConfig(guild.id);

            const components = [
                buildTabsRow(currentTab),
                buildActionsRow(currentTab, config, vConf)
            ];

            // Sélecteur natif Discord si activé
            if (currentPicker === 'log') {
                const pickerRow = new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('picker_select_log')
                        .setPlaceholder('📜 Sélectionner le salon de logs...')
                        .setChannelTypes(ChannelType.GuildText)
                );
                components.push(pickerRow);
            } else if (currentPicker === 'role') {
                const pickerRow = new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('picker_select_role')
                        .setPlaceholder('✅ Sélectionner le rôle membre vérifié...')
                );
                components.push(pickerRow);
            } else if (currentPicker === 'welcome') {
                const pickerRow = new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('picker_select_welcome')
                        .setPlaceholder('👋 Sélectionner le salon de bienvenue...')
                        .setChannelTypes(ChannelType.GuildText)
                );
                components.push(pickerRow);
            } else if (currentPicker === 'ticket') {
                const pickerRow = new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('picker_select_ticket')
                        .setPlaceholder('📁 Sélectionner la catégorie des tickets...')
                        .setChannelTypes(ChannelType.GuildCategory)
                );
                components.push(pickerRow);
            }

            components.push(buildBottomRow());
            return components;
        };

        const initialEmbed = await buildSettingsEmbed(guild, currentTab, client);
        const initialComponents = await renderComponents();

        const reply = await interaction.reply({
            embeds: [initialEmbed],
            components: initialComponents,
            ephemeral: true
        });

        const collector = reply.createMessageComponentCollector({
            time: 15 * 60 * 1000
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "❌ Seul l'administrateur ayant ouvert ce menu peut le modifier.", ephemeral: true });
            }

            const id = i.customId;

            // =========================
            // 1. NAVIGATION ONGLETS
            // =========================
            if (id === 'set_tab_general') { currentTab = 'general'; currentPicker = null; }
            else if (id === 'set_tab_arrivals') { currentTab = 'arrivals'; currentPicker = null; }
            else if (id === 'set_tab_protection') { currentTab = 'protection'; currentPicker = null; }
            else if (id === 'set_tab_moderation') { currentTab = 'moderation'; currentPicker = null; }
            else if (id === 'set_tab_utils') { currentTab = 'utils'; currentPicker = null; }

            // =========================
            // 2. TOGGLES & ACTIONS RAPIDES
            // =========================
            else if (id === 'action_toggle_alerts') {
                const cfg = getConfig(guild.id);
                updateConfig(guild.id, 'staffAlerts', cfg.staffAlerts === false ? true : false);
            }
            else if (id === 'action_toggle_antilink') {
                const cfg = getConfig(guild.id);
                updateConfig(guild.id, 'antiLink', cfg.antiLink === false ? true : false);
            }
            else if (id === 'action_toggle_antispam') {
                const cfg = getConfig(guild.id);
                updateConfig(guild.id, 'antiSpam', cfg.antiSpam === false ? true : false);
            }
            else if (id === 'action_toggle_antibot') {
                const cfg = getConfig(guild.id);
                updateConfig(guild.id, 'antiBot', cfg.antiBot === false ? true : false);
            }
            else if (id === 'action_toggle_antiraid') {
                const cfg = getConfig(guild.id);
                updateConfig(guild.id, 'antiRaid', cfg.antiRaid === false ? true : false);
            }
            else if (id === 'action_toggle_captcha') {
                const v = await vEngine.getConfig(guild.id);
                await vEngine.saveConfig(guild.id, { enabled: !v.enabled });
            }
            else if (id === 'action_warn_paliers') {
                return i.reply({
                    content: "📋 **Paliers du système /moderation warn :**\n• 3 warns ➔ Timeout 10m\n• 5 warns ➔ Timeout 1h\n• 7 warns ➔ Expulsion automatique\n*Toutes les sanctions sont appliquées et enregistrées automatiquement.*",
                    ephemeral: true
                });
            }
            else if (id === 'action_toggle_lockdown') {
                const data = lockdownStore.load();
                if (data[guild.id]) {
                    for (const channel of guild.channels.cache.values()) {
                        if (channel.type === ChannelType.GuildText) {
                            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }).catch(() => {});
                        }
                    }
                    delete data[guild.id];
                    lockdownStore.save(data);
                } else {
                    data[guild.id] = {};
                    for (const channel of guild.channels.cache.values()) {
                        if (channel.type === ChannelType.GuildText) {
                            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(() => {});
                        }
                    }
                    lockdownStore.save(data);
                }
            }

            // =========================
            // 3. ACTIVATION SÉLECTEURS
            // =========================
            else if (id === 'action_pick_log') {
                currentPicker = currentPicker === 'log' ? null : 'log';
            }
            else if (id === 'action_pick_role') {
                currentPicker = currentPicker === 'role' ? null : 'role';
            }
            else if (id === 'action_pick_welcome') {
                currentPicker = currentPicker === 'welcome' ? null : 'welcome';
            }
            else if (id === 'action_pick_ticket') {
                currentPicker = currentPicker === 'ticket' ? null : 'ticket';
            }

            // =========================
            // 4. RÉCEPTION DU CHOIX
            // =========================
            else if (id === 'picker_select_log' && i.values?.length) {
                const channelId = i.values[0];
                updateConfig(guild.id, 'logChannel', channelId);
                currentPicker = null;
            }
            else if (id === 'picker_select_role' && i.values?.length) {
                const roleId = i.values[0];
                updateConfig(guild.id, 'verifiedRole', roleId);
                await vEngine.saveConfig(guild.id, { roleId, enabled: true });
                currentPicker = null;
            }
            else if (id === 'picker_select_welcome' && i.values?.length) {
                const channelId = i.values[0];
                const existing = welcomeConfig.get(guild.id) || {};
                welcomeConfig.set(guild.id, { ...existing, channelId });
                currentPicker = null;
            }
            else if (id === 'picker_select_ticket' && i.values?.length) {
                const categoryId = i.values[0];
                updateConfig(guild.id, 'ticketCategory', categoryId);
                currentPicker = null;
            }

            // =========================
            // 5. CHANGELOG & REFRESH
            // =========================
            else if (id === 'btn_changelog') {
                return i.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(THEME_BLUE)
                            .setTitle("📕 Changelog • LvProtect v2.0")
                            .setDescription(
                                "🚀 **Dernières nouveautés :**\n" +
                                "• **Panneau /setting** : Design épuré, aéré et moderne en bleu.\n" +
                                "• **Commandes sans doublon** : Purge automatique des doublons sur Discord.\n" +
                                "• **Commande /moderation unifiée** : Ban, kick, mute, unmute, warn, purge, lockdown.\n" +
                                "• **Mises à jour en temps réel (30s)** : Synchronisation continue avec GitHub."
                            )
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
            }

            // Mise à jour visuelle fluide
            const updatedEmbed = await buildSettingsEmbed(guild, currentTab, client);
            const updatedComponents = await renderComponents();

            await i.update({
                embeds: [updatedEmbed],
                components: updatedComponents
            }).catch(() => {});
        });
    }
};
