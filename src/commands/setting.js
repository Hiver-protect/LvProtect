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

const THEME_BLUE = '#5865F2'; // Bleu officiel Discord / Blurple
const SUPPORT_URL = "https://discord.gg/MtdhG6JAf8";
const DOCS_URL = "https://github.com/Hiver-protect/LvProtect";

/**
 * Construit l'embed avec la structure exacte de l'image de référence
 */
async function buildSettingsEmbed(guild, tab, client) {
    const config = getConfig(guild.id) || {};
    const vConf = await vEngine.getConfig(guild.id);
    const wConf = welcomeConfig.get(guild.id);
    const isLockdown = Boolean(lockdownStore.load()[guild.id]);

    const header = 
        `LvProtect v2.0\n\n` +
        `Les réglages de RaidProtect pour ce serveur. Pour commencer, regardez **Arrivées** (captcha, anti-raid) et **Modération** (salon de logs, sanctions).\n` +
        `Tout changement s'applique immédiatement.\n\n`;

    const embed = new EmbedBuilder()
        .setColor(THEME_BLUE)
        .setTitle("⚙️ Configuration");

    if (tab === 'general') {
        const logText = config.logChannel ? `<#${config.logChannel}>` : "Désactivé";
        const alertsText = config.staffAlerts !== false ? "Activé · Suivre les alertes" : "Désactivé";

        embed.setDescription(
            header +
            `📜 **Salon de logs**\n` +
            `│ ${logText}\n\n` +
            `🔔 **Alertes Staff**\n` +
            `│ ${alertsText}\n\n` +
            `🔑 **Permissions**\n` +
            `│ Intégrations : commandes slash seules\n\n` +
            `🕒 **Fuseau horaire**\n` +
            `│ UTC+1 · Europe/Paris`
        );
    } else if (tab === 'arrivals') {
        const captchaText = vConf.enabled ? "Activé · Bouton interactif" : "Désactivé";
        const roleText = vConf.roleId ? `<@&${vConf.roleId}>` : "Non configuré";
        const welcomeText = wConf?.channelId ? `<#${wConf.channelId}> · ${wConf.message ? 'Personnalisé' : 'Standard'}` : "Désactivé";
        const minAgeText = `${config.minAccountAgeDays || 0} jour(s) · Surveillance anti-double comptes`;

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
        const raidText = config.antiRaid !== false ? "Activé · Seuil 6 arrivées / 15s" : "Désactivé";
        const botText = config.antiBot !== false ? "Activé · Expulsion auto sans droit admin" : "Désactivé";
        const linkText = config.antiLink !== false ? "Activé · Suppression auto des invitations" : "Désactivé";
        const mentionText = config.antiMention !== false ? "Activé · Timeout 10m en cas d'abus" : "Désactivé";

        embed.setDescription(
            header +
            `🚨 **Mode Anti-Raid**\n` +
            `│ ${raidText}\n\n` +
            `🤖 **Anti-Bot Rogue**\n` +
            `│ ${botText}\n\n` +
            `🔗 **Anti-Pub & Liens**\n` +
            `│ ${linkText}\n\n` +
            `📢 **Anti-Mass Mentions**\n` +
            `│ ${mentionText}`
        );
    } else if (tab === 'moderation') {
        const lockText = isLockdown ? "Verrouillé · Salons fermés" : "Accessible · Serveur ouvert";

        embed.setDescription(
            header +
            `⚠️ **Paliers de sanctions**\n` +
            `│ 3 warns ➔ Timeout 10m · 5 warns ➔ Timeout 1h · 7 warns ➔ Expulsion\n\n` +
            `🔒 **Confinement d'urgence**\n` +
            `│ ${lockText}\n\n` +
            `🧹 **Suppression de messages**\n` +
            `│ Commande : /moderation purge\n\n` +
            `🛡️ **Protection hiérarchie**\n` +
            `│ Activée · Immunité du personnel`
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
            `│ <t:${Math.floor(client.readyTimestamp / 1000)}:R>\n\n` +
            `⚡ **Mises à jour en continu**\n` +
            `│ Activé · Synchronisation GitHub 30s`
        );
    }

    return embed;
}

/**
 * Rangée 1 : Les 5 onglets avec dossiers
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
 * Rangée 2 : Boutons bleus 'Modifier' alignés avec emojis correspondants
 */
function buildActionsRow(tab, config, vConf) {
    const row = new ActionRowBuilder();

    if (tab === 'general') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_pick_log')
                .setLabel('Modifier')
                .setEmoji('📜')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_toggle_alerts')
                .setLabel('Modifier')
                .setEmoji('🔔')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_info_perms')
                .setLabel('Modifier')
                .setEmoji('🔑')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_info_tz')
                .setLabel('Modifier')
                .setEmoji('🕒')
                .setStyle(ButtonStyle.Primary)
        );
    } else if (tab === 'arrivals') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_toggle_captcha')
                .setLabel('Modifier')
                .setEmoji('🛡️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_pick_role')
                .setLabel('Modifier')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_pick_welcome')
                .setLabel('Modifier')
                .setEmoji('👋')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_info_minage')
                .setLabel('Modifier')
                .setEmoji('⏳')
                .setStyle(ButtonStyle.Primary)
        );
    } else if (tab === 'protection') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_toggle_antiraid')
                .setLabel('Modifier')
                .setEmoji('🚨')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_toggle_antibot')
                .setLabel('Modifier')
                .setEmoji('🤖')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_toggle_antilink')
                .setLabel('Modifier')
                .setEmoji('🔗')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_toggle_antispam')
                .setLabel('Modifier')
                .setEmoji('📢')
                .setStyle(ButtonStyle.Primary)
        );
    } else if (tab === 'moderation') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_warn_paliers')
                .setLabel('Modifier')
                .setEmoji('⚠️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_toggle_lockdown')
                .setLabel('Modifier')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Primary)
        );
    } else if (tab === 'utils') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_pick_ticket')
                .setLabel('Modifier')
                .setEmoji('🎫')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_refresh_stats')
                .setLabel('Actualiser')
                .setEmoji('📊')
                .setStyle(ButtonStyle.Primary)
        );
    }

    return row;
}

/**
 * Rangée 3 : Boutons de bas de page (Serveur Support, Documentation, Personnaliser, Changelog)
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
            .setCustomId('btn_personaliser')
            .setLabel('Personnaliser')
            .setEmoji('✨')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('btn_changelog')
            .setLabel('Changelog')
            .setEmoji('📕')
            .setStyle(ButtonStyle.Secondary)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setting')
        .setDescription('Configuration et réglages du serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const guild = interaction.guild;
        let currentTab = 'general';
        let currentPicker = null;

        const renderComponents = async () => {
            const config = getConfig(guild.id) || {};
            config.guildId = guild.id;
            const vConf = await vEngine.getConfig(guild.id);

            const components = [
                buildTabsRow(currentTab),
                buildActionsRow(currentTab, config, vConf)
            ];

            // Sélecteur interactif si activé
            if (currentPicker === 'log') {
                components.push(new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('picker_select_log')
                        .setPlaceholder('📜 Sélectionner le salon de logs...')
                        .setChannelTypes(ChannelType.GuildText)
                ));
            } else if (currentPicker === 'role') {
                components.push(new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('picker_select_role')
                        .setPlaceholder('✅ Sélectionner le rôle vérifié...')
                ));
            } else if (currentPicker === 'welcome') {
                components.push(new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('picker_select_welcome')
                        .setPlaceholder('👋 Sélectionner le salon de bienvenue...')
                        .setChannelTypes(ChannelType.GuildText)
                ));
            } else if (currentPicker === 'ticket') {
                components.push(new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('picker_select_ticket')
                        .setPlaceholder('📁 Sélectionner la catégorie des tickets...')
                        .setChannelTypes(ChannelType.GuildCategory)
                ));
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
                return i.reply({ content: "❌ Seul l'administrateur ayant ouvert ce menu peut l'utiliser.", ephemeral: true });
            }

            const id = i.customId;

            // 1. NAVIGATION
            if (id === 'set_tab_general') { currentTab = 'general'; currentPicker = null; }
            else if (id === 'set_tab_arrivals') { currentTab = 'arrivals'; currentPicker = null; }
            else if (id === 'set_tab_protection') { currentTab = 'protection'; currentPicker = null; }
            else if (id === 'set_tab_moderation') { currentTab = 'moderation'; currentPicker = null; }
            else if (id === 'set_tab_utils') { currentTab = 'utils'; currentPicker = null; }

            // 2. ACTIONS MODIFIER
            else if (id === 'action_pick_log') {
                currentPicker = currentPicker === 'log' ? null : 'log';
            }
            else if (id === 'action_toggle_alerts') {
                const cfg = getConfig(guild.id);
                updateConfig(guild.id, 'staffAlerts', cfg.staffAlerts === false ? true : false);
            }
            else if (id === 'action_info_perms') {
                return i.reply({ content: "🔑 **Permissions :** Le bot utilise uniquement les commandes slash sécurisées.", ephemeral: true });
            }
            else if (id === 'action_info_tz') {
                return i.reply({ content: "🕒 **Fuseau horaire :** Le serveur est configuré sur Europe/Paris (UTC+1).", ephemeral: true });
            }

            // ARRIVÉES
            else if (id === 'action_toggle_captcha') {
                const v = await vEngine.getConfig(guild.id);
                await vEngine.saveConfig(guild.id, { enabled: !v.enabled });
            }
            else if (id === 'action_pick_role') {
                currentPicker = currentPicker === 'role' ? null : 'role';
            }
            else if (id === 'action_pick_welcome') {
                currentPicker = currentPicker === 'welcome' ? null : 'welcome';
            }
            else if (id === 'action_info_minage') {
                return i.reply({ content: "⏳ **Âge minimum :** Les comptes trop récents sont surveillés automatiquement.", ephemeral: true });
            }

            // PROTECTION
            else if (id === 'action_toggle_antiraid') {
                const cfg = getConfig(guild.id);
                updateConfig(guild.id, 'antiRaid', cfg.antiRaid === false ? true : false);
            }
            else if (id === 'action_toggle_antibot') {
                const cfg = getConfig(guild.id);
                updateConfig(guild.id, 'antiBot', cfg.antiBot === false ? true : false);
            }
            else if (id === 'action_toggle_antilink') {
                const cfg = getConfig(guild.id);
                updateConfig(guild.id, 'antiLink', cfg.antiLink === false ? true : false);
            }
            else if (id === 'action_toggle_antispam') {
                const cfg = getConfig(guild.id);
                updateConfig(guild.id, 'antiMention', cfg.antiMention === false ? true : false);
                updateConfig(guild.id, 'antiSpam', cfg.antiSpam === false ? true : false);
            }

            // MODÉRATION
            else if (id === 'action_warn_paliers') {
                return i.reply({ content: "📋 **Paliers /moderation warn :**\n• 3 warns ➔ Timeout 10m\n• 5 warns ➔ Timeout 1h\n• 7 warns ➔ Expulsion", ephemeral: true });
            }
            else if (id === 'action_toggle_lockdown') {
                const data = lockdownStore.load();
                if (data[guild.id]) {
                    for (const ch of guild.channels.cache.values()) {
                        if (ch.type === ChannelType.GuildText) {
                            await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }).catch(() => {});
                        }
                    }
                    delete data[guild.id];
                    lockdownStore.save(data);
                } else {
                    data[guild.id] = {};
                    for (const ch of guild.channels.cache.values()) {
                        if (ch.type === ChannelType.GuildText) {
                            await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }).catch(() => {});
                        }
                    }
                    lockdownStore.save(data);
                }
            }

            // UTILITAIRES
            else if (id === 'action_pick_ticket') {
                currentPicker = currentPicker === 'ticket' ? null : 'ticket';
            }
            else if (id === 'action_refresh_stats' || id === 'btn_personaliser') {
                // Refresh
            }

            // SÉLECTIONS
            else if (id === 'picker_select_log' && i.values?.length) {
                updateConfig(guild.id, 'logChannel', i.values[0]);
                currentPicker = null;
            }
            else if (id === 'picker_select_role' && i.values?.length) {
                updateConfig(guild.id, 'verifiedRole', i.values[0]);
                await vEngine.saveConfig(guild.id, { roleId: i.values[0], enabled: true });
                currentPicker = null;
            }
            else if (id === 'picker_select_welcome' && i.values?.length) {
                const existing = welcomeConfig.get(guild.id) || {};
                welcomeConfig.set(guild.id, { ...existing, channelId: i.values[0] });
                currentPicker = null;
            }
            else if (id === 'picker_select_ticket' && i.values?.length) {
                updateConfig(guild.id, 'ticketCategory', i.values[0]);
                currentPicker = null;
            }

            // CHANGELOG
            else if (id === 'btn_changelog') {
                return i.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(THEME_BLUE)
                            .setTitle("📕 Changelog • RaidProtect / LvProtect")
                            .setDescription(
                                "• **Panneau /setting** : Réplique exacte du modèle RaidProtect.\n" +
                                "• **Boutons bleus de modification** pour chaque réglage.\n" +
                                "• **Sélecteurs intégrés** en direct.\n" +
                                "• **Zéro doublon de commande**."
                            )
                    ],
                    ephemeral: true
                });
            }

            // MISE À JOUR VISUELLE
            const updatedEmbed = await buildSettingsEmbed(guild, currentTab, client);
            const updatedComponents = await renderComponents();

            await i.update({
                embeds: [updatedEmbed],
                components: updatedComponents
            }).catch(() => {});
        });
    }
};
