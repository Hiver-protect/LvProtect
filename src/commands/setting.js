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

const THEME_BLUE = '#2B7FFF'; // Bleu électrique propre et moderne

/**
 * Génère l'embed correspondant à l'onglet sélectionné
 */
async function buildSettingsEmbed(guild, tab, client) {
    const config = getConfig(guild.id) || {};
    const vConf = await vEngine.getConfig(guild.id);
    const wConf = welcomeConfig.get(guild.id);
    const isLockdown = Boolean(lockdownStore.load()[guild.id]);

    const embed = new EmbedBuilder()
        .setColor(THEME_BLUE)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setFooter({ text: "LvProtect v2.0 • Les modifications s'appliquent immédiatement", iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    if (tab === 'general') {
        embed.setTitle("⚙️ Configuration ➔ 📁 Général")
            .setDescription(
                "Les réglages généraux de **LvProtect** pour ce serveur.\n" +
                "Configurez ici le salon où le bot enregistre les événements de sécurité et les alertes.\n\n" +
                "📜 **Salon de logs de sécurité**\n" +
                `│ ${config.logChannel ? `<#${config.logChannel}>` : '❌ *Non configuré*'}\n\n` +
                "🔔 **Alertes Staff & Raids**\n" +
                `│ ${config.staffAlerts !== false ? '✅ **Activé** (Notification immédiate)' : '❌ **Désactivé**'}\n\n` +
                "🌐 **Langue du système**\n" +
                "│ 🇫🇷 **Français** (Prise en charge native)\n\n" +
                "🕒 **Fuseau horaire**\n" +
                "│ ⏰ **Europe/Paris (UTC+1)**"
            );
    } else if (tab === 'arrivals') {
        embed.setTitle("⚙️ Configuration ➔ 📁 Arrivées")
            .setDescription(
                "Gérez la sécurité des nouveaux arrivants et la vérification des comptes.\n\n" +
                "🛡️ **Système de Vérification Captcha**\n" +
                `│ ${vConf.enabled ? '✅ **Activé** (Bouton & Modal interactif)' : '❌ **Désactivé**'}\n\n` +
                "✅ **Rôle Membre Vérifié**\n" +
                `│ ${vConf.roleId ? `<@&${vConf.roleId}>` : '❌ *Non configuré (Obligatoire pour le captcha)*'}\n\n` +
                "👋 **Message de Bienvenue**\n" +
                `│ ${wConf?.channelId ? `<#${wConf.channelId}> • *${wConf.message ? 'Personnalisé' : 'Standard'}*` : '❌ *Désactivé*'}\n\n` +
                "⏳ **Âge minimum du compte**\n" +
                `│ ${config.minAccountAgeDays || 0} jour(s) *(Comptes plus récents surveillés)*`
            );
    } else if (tab === 'protection') {
        embed.setTitle("⚙️ Configuration ➔ 📁 Protection & Anti-Raid")
            .setDescription(
                "Les modules de défense active pour protéger votre serveur en temps réel.\n\n" +
                "🚨 **Détection Anti-Raid (Mass-Join)**\n" +
                `│ ${config.antiRaid !== false ? '✅ **Activé** (Seuil: 6 arrivées / 15s)' : '❌ **Désactivé**'}\n\n` +
                "🤖 **Anti-Bot Rogue non autorisé**\n" +
                `│ ${config.antiBot !== false ? '✅ **Activé** (Expulsion immédiate des bots suspects)' : '❌ **Désactivé**'}\n\n` +
                "🔗 **Anti-Pub & Liens d'invitation**\n" +
                `│ ${config.antiLink !== false ? '✅ **Activé** (Suppression auto des invitations discord.gg)' : '❌ **Désactivé**'}\n\n` +
                "📢 **Anti-Mass Mentions (@everyone)**\n" +
                `│ ${config.antiMention !== false ? '✅ **Activé** (Timeout 10m en cas d\'abus de pings)' : '❌ **Désactivé**'}\n\n` +
                "💬 **Anti-Spam & Flood intelligent**\n" +
                `│ ${config.antiSpam !== false ? '✅ **Activé** (Détection par répétition et burst)' : '❌ **Désactivé**'}`
            );
    } else if (tab === 'moderation') {
        embed.setTitle("⚙️ Configuration ➔ 📁 Modération")
            .setDescription(
                "Paramètres de gestion des sanctions et sécurité administrative.\n\n" +
                "⚠️ **Paliers de Sanctions Automatiques (/warn)**\n" +
                "│ • **3 warns** ➔ Timeout 10 minutes\n" +
                "│ • **5 warns** ➔ Timeout 1 heure\n" +
                "│ • **7 warns** ➔ Expulsion automatique\n\n" +
                "🔒 **Confinement d'urgence (Lockdown)**\n" +
                `│ ${isLockdown ? '🚨 **LOCKDOWN EN COURS (Salons fermés)**' : '✅ **Serveur accessible normalement**'}\n\n` +
                "🛡️ **Protection de la Hiérarchie**\n" +
                "│ ✅ **Activée** (Interdiction de sanctionner le staff ou supérieur)"
            );
    } else if (tab === 'utils') {
        embed.setTitle("⚙️ Configuration ➔ 📁 Utilitaires & Support")
            .setDescription(
                "Modules additionnels : Support par tickets et état du système.\n\n" +
                "🎫 **Catégorie des Tickets de Support**\n" +
                `│ ${config.ticketCategory ? `📁 <#${config.ticketCategory}>` : '❌ *Non configurée*'}\n\n` +
                "📊 **Statut du Bot**\n" +
                `│ 🟢 En ligne • Ping WebSocket : **${client.ws.ping}ms**\n` +
                `│ ⏱️ Uptime : <t:${Math.floor(client.readyTimestamp / 1000)}:R>`
            );
    }

    return embed;
}

/**
 * Construit la barre d'onglets (5 boutons)
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
 * Construit les boutons d'actions spécifiques à chaque onglet
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
                .setStyle(config.staffAlerts !== false ? ButtonStyle.Danger : ButtonStyle.Success)
        );
    } else if (tab === 'arrivals') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_toggle_captcha')
                .setLabel(vConf.enabled ? 'Désactiver Captcha' : 'Activer Captcha')
                .setEmoji('🛡️')
                .setStyle(vConf.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('action_pick_role')
                .setLabel('Choisir Rôle Vérifié')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_pick_welcome')
                .setLabel('Salon Bienvenue')
                .setEmoji('👋')
                .setStyle(ButtonStyle.Secondary)
        );
    } else if (tab === 'protection') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_toggle_antilink')
                .setLabel(`Anti-Pub: ${config.antiLink !== false ? 'ON' : 'OFF'}`)
                .setEmoji('🔗')
                .setStyle(config.antiLink !== false ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('action_toggle_antispam')
                .setLabel(`Anti-Spam: ${config.antiSpam !== false ? 'ON' : 'OFF'}`)
                .setEmoji('💬')
                .setStyle(config.antiSpam !== false ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('action_toggle_antibot')
                .setLabel(`Anti-Bot: ${config.antiBot !== false ? 'ON' : 'OFF'}`)
                .setEmoji('🤖')
                .setStyle(config.antiBot !== false ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('action_toggle_antiraid')
                .setLabel(`Anti-Raid: ${config.antiRaid !== false ? 'ON' : 'OFF'}`)
                .setEmoji('🚨')
                .setStyle(config.antiRaid !== false ? ButtonStyle.Success : ButtonStyle.Secondary)
        );
    } else if (tab === 'moderation') {
        const isLockdown = Boolean(lockdownStore.load()[config.guildId || '']);
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_toggle_lockdown')
                .setLabel(isLockdown ? 'Lever le Lockdown' : 'Déclencher Lockdown')
                .setEmoji('🔒')
                .setStyle(isLockdown ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('action_warn_paliers')
                .setLabel('Infos Paliers Warns')
                .setEmoji('⚠️')
                .setStyle(ButtonStyle.Secondary)
        );
    } else if (tab === 'utils') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_pick_ticket')
                .setLabel('Catégorie Tickets')
                .setEmoji('🎫')
                .setStyle(ButtonStyle.Primary)
        );
    }

    return row;
}

/**
 * Ligne d'outils du bas (Changelog, Actualiser, etc.)
 */
function buildBottomRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('btn_changelog')
            .setLabel('Changelog v2.0')
            .setEmoji('📕')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('btn_refresh')
            .setLabel('Actualiser')
            .setEmoji('🔄')
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

            // Si un sélecteur natif Discord est actif
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

        // Collecteur de 15 minutes pour toute interaction
        const collector = reply.createMessageComponentCollector({
            time: 15 * 60 * 1000
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "❌ Seul l'administrateur ayant ouvert ce menu peut le modifier.", ephemeral: true });
            }

            const id = i.customId;

            // =========================
            // 1. CHANGEMENT D'ONGLET
            // =========================
            if (id === 'set_tab_general') currentTab = 'general';
            else if (id === 'set_tab_arrivals') currentTab = 'arrivals';
            else if (id === 'set_tab_protection') currentTab = 'protection';
            else if (id === 'set_tab_moderation') currentTab = 'moderation';
            else if (id === 'set_tab_utils') currentTab = 'utils';

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
                    content: "📋 **Paliers du système /warn :**\n• 3 warns ➔ Timeout 10m\n• 5 warns ➔ Timeout 1h\n• 7 warns ➔ Expulsion automatique\n*Toutes les sanctions sont appliquées et enregistrées automatiquement.*",
                    ephemeral: true
                });
            }
            else if (id === 'action_toggle_lockdown') {
                const data = lockdownStore.load();
                if (data[guild.id]) {
                    // Unlock
                    for (const channel of guild.channels.cache.values()) {
                        if (channel.type === ChannelType.GuildText) {
                            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }).catch(() => {});
                        }
                    }
                    delete data[guild.id];
                    lockdownStore.save(data);
                } else {
                    // Lock
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
            // 3. ACTIVATION DES SÉLECTEURS
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
            // 4. RÉCEPTION DU CHOIX DES SÉLECTEURS
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
                                "• **Panneau /settings interactif** avec onglets et sélecteurs natifs.\n" +
                                "• **Anti-Bot Rogue** : Bannissement / expulsion des bots non autorisés.\n" +
                                "• **Anti-Raid Mass Join** : Détection intelligente d'arrivées massives.\n" +
                                "• **Vérification In-Server** : Plus besoin des DMs pour se vérifier.\n" +
                                "• **Paliers de Warns** : Sanctions automatiques progressives.\n" +
                                "• **Audit Logs systématiques** sur toutes les commandes de modération."
                            )
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
            }

            // Mise à jour visuelle immédiate
            const updatedEmbed = await buildSettingsEmbed(guild, currentTab, client);
            const updatedComponents = await renderComponents();

            await i.update({
                embeds: [updatedEmbed],
                components: updatedComponents
            }).catch(() => {});
        });
    }
};
