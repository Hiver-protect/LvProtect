const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const { getConfig, setConfig, updateConfig } = require('../modules/guildConfig');
const vEngine = require('../modules/verificationEngine');
const welcomeConfig = require('../modules/welcomeConfig');
const lockdownStore = require('../modules/lockdownStore');

const THEME_BLUE = '#5865F2';
const SUPPORT_URL = "https://discord.gg/MtdhG6JAf8";
const DOCS_URL = "https://discord.gg/MtdhG6JAf8";

/**
 * Construit l'embed avec la structure exacte et propre du modèle de référence
 */
async function buildSettingsEmbed(guild, tab, client) {
    const config = getConfig(guild.id) || {};
    const vConf = await vEngine.getConfig(guild.id);
    const wConf = welcomeConfig.get(guild.id);
    const isLockdown = Boolean(lockdownStore.load()[guild.id]);

    const header = 
        `Protection v3.6.1\n\n` +
        `Les réglages de protection pour ce serveur. Pour commencer, regardez **Arrivées** (captcha, anti-raid) et **Modération** (salon de logs, sanctions).\n` +
        `Tout changement s'applique immédiatement.\n\n`;

    const embed = new EmbedBuilder()
        .setColor(THEME_BLUE)
        .setTitle("⚙️ Configuration");

    if (tab === 'general') {
        const logText = config.logChannel ? `<#${config.logChannel}>` : "Désactivé";
        const alertsText = config.staffAlerts !== false ? "Activé · Suivre les alertes du serveur" : "Désactivé";

        embed.setDescription(
            header +
            `📜 **Salon de logs**\n` +
            `│ ${logText}\n\n` +
            `🔔 **Alertes Staff**\n` +
            `│ ${alertsText}\n\n` +
            `🔑 **Permissions**\n` +
            `│ Intégrations : commandes slash seules\n\n` +
            `🕒 **Fuseau horaire**\n` +
            `│ UTC+1 · Europe/Paris (Automatique)`
        );
    } else if (tab === 'arrivals') {
        const captchaText = vConf.enabled ? "Activé · Bouton interactif" : "Désactivé";
        const roleText = vConf.roleId ? `<@&${vConf.roleId}>` : "Non configuré";
        const welcomeText = wConf?.channelId ? `<#${wConf.channelId}> · ${wConf.message ? 'Personnalisé' : 'Standard'}` : "Désactivé";
        const minAgeDays = config.minAccountAgeDays || 0;
        const minAgeText = minAgeDays > 0 ? `${minAgeDays} jour(s) · Surveillance anti-double comptes` : "Désactivé · Aucun délai requis";

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
        const raidText = config.antiRaid !== false ? `Activé · Seuil ${config.raidThreshold || 6} arrivées / 15s` : "Désactivé";
        const botText = config.antiBot !== false ? "Activé · Expulsion automatique des bots non autorisés" : "Désactivé";
        const linkText = config.antiLink !== false ? "Activé · Suppression automatique des invitations" : "Désactivé";
        const mentionText = config.antiMention !== false ? "Activé · Timeout 10m en cas d'abus" : "Désactivé";

        embed.setDescription(
            header +
            `🚨 **Mode Anti-Raid**\n` +
            `│ ${raidText}\n\n` +
            `🤖 **Anti-Bot Rogue**\n` +
            `│ ${botText}\n\n` +
            `🔗 **Anti-Pub & Liens**\n` +
            `│ ${linkText}\n\n` +
            `📢 **Anti-Mass Mentions & Spam**\n` +
            `│ ${mentionText}`
        );
    } else if (tab === 'moderation') {
        const lockText = isLockdown ? "🔴 Confinement actif · Tous les salons texte sont verrouillés" : "🟢 Accessible · Salons ouverts";

        embed.setDescription(
            header +
            `⚠️ **Paliers de sanctions**\n` +
            `│ 3 avertissements ➔ Timeout 10m · 5 ➔ Timeout 1h · 7 ➔ Expulsion\n\n` +
            `🔒 **Confinement d'urgence**\n` +
            `│ ${lockText}\n\n` +
            `🧹 **Suppression de messages**\n` +
            `│ Commande : /moderation purge [nombre] [utilisateur]\n\n` +
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
            `│ En ligne depuis <t:${Math.floor(client.readyTimestamp / 1000)}:R>\n\n` +
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
 * Rangée 2 : Boutons d'action contextuels et précis selon l'onglet
 */
function buildActionsRow(tab, config, vConf, isLockdown) {
    const row = new ActionRowBuilder();

    if (tab === 'general') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_pick_log')
                .setLabel('Salon Logs')
                .setEmoji('📜')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_toggle_alerts')
                .setLabel('Alertes Staff')
                .setEmoji('🔔')
                .setStyle(config.staffAlerts !== false ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('action_info_perms')
                .setLabel('Permissions')
                .setEmoji('🔑')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('action_info_tz')
                .setLabel('Fuseau')
                .setEmoji('🕒')
                .setStyle(ButtonStyle.Secondary)
        );
    } else if (tab === 'arrivals') {
        const minDays = config.minAccountAgeDays || 0;
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_toggle_captcha')
                .setLabel('Captcha')
                .setEmoji('🛡️')
                .setStyle(vConf.enabled ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('action_pick_role')
                .setLabel('Rôle Vérifié')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_pick_welcome')
                .setLabel('Salon Bienvenue')
                .setEmoji('👋')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_cycle_minage')
                .setLabel(`Âge Min: ${minDays}j`)
                .setEmoji('⏳')
                .setStyle(minDays > 0 ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );
    } else if (tab === 'protection') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_toggle_antiraid')
                .setLabel('Anti-Raid')
                .setEmoji('🚨')
                .setStyle(config.antiRaid !== false ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('action_toggle_antibot')
                .setLabel('Anti-Bot')
                .setEmoji('🤖')
                .setStyle(config.antiBot !== false ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('action_toggle_antilink')
                .setLabel('Anti-Pub')
                .setEmoji('🔗')
                .setStyle(config.antiLink !== false ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('action_toggle_antispam')
                .setLabel('Anti-Spam')
                .setEmoji('📢')
                .setStyle(config.antiSpam !== false ? ButtonStyle.Success : ButtonStyle.Danger)
        );
    } else if (tab === 'moderation') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_warn_paliers')
                .setLabel('Paliers Warn')
                .setEmoji('⚠️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('action_toggle_lockdown')
                .setLabel(isLockdown ? 'Déverrouiller' : 'Confinement')
                .setEmoji('🔒')
                .setStyle(isLockdown ? ButtonStyle.Danger : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('action_info_purge')
                .setLabel('Purger')
                .setEmoji('🧹')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('action_info_hierarchy')
                .setLabel('Hiérarchie')
                .setEmoji('🛡️')
                .setStyle(ButtonStyle.Success)
        );
    } else if (tab === 'utils') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('action_pick_ticket')
                .setLabel('Catégorie Tickets')
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
            const isLockdown = Boolean(lockdownStore.load()[guild.id]);

            const components = [
                buildTabsRow(currentTab),
                buildActionsRow(currentTab, config, vConf, isLockdown)
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

            // 1. NAVIGATION ONGLETS
            if (id === 'set_tab_general') { currentTab = 'general'; currentPicker = null; }
            else if (id === 'set_tab_arrivals') { currentTab = 'arrivals'; currentPicker = null; }
            else if (id === 'set_tab_protection') { currentTab = 'protection'; currentPicker = null; }
            else if (id === 'set_tab_moderation') { currentTab = 'moderation'; currentPicker = null; }
            else if (id === 'set_tab_utils') { currentTab = 'utils'; currentPicker = null; }

            // 2. ACTIONS ONGLET GÉNÉRAL
            else if (id === 'action_pick_log') {
                currentPicker = currentPicker === 'log' ? null : 'log';
            }
            else if (id === 'action_toggle_alerts') {
                const cfg = getConfig(guild.id);
                updateConfig(guild.id, 'staffAlerts', cfg.staffAlerts === false ? true : false);
            }
            else if (id === 'action_info_perms') {
                return i.reply({ content: "🔑 **Permissions :** Le bot utilise exclusivement les commandes slash sécurisées.", ephemeral: true });
            }
            else if (id === 'action_info_tz') {
                return i.reply({ content: "🕒 **Fuseau horaire :** Le serveur est synchronisé sur Europe/Paris (UTC+1).", ephemeral: true });
            }

            // 3. ACTIONS ONGLET ARRIVÉES
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
            else if (id === 'action_cycle_minage') {
                const cfg = getConfig(guild.id);
                const steps = [0, 1, 3, 7, 14, 30];
                const cur = cfg.minAccountAgeDays || 0;
                const next = steps[(steps.indexOf(cur) + 1) % steps.length] || 0;
                updateConfig(guild.id, 'minAccountAgeDays', next);
            }

            // 4. ACTIONS ONGLET PROTECTION
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
                const newState = cfg.antiSpam === false ? true : false;
                updateConfig(guild.id, 'antiMention', newState);
                updateConfig(guild.id, 'antiSpam', newState);
            }

            // 5. ACTIONS ONGLET MODÉRATION
            else if (id === 'action_warn_paliers') {
                return i.reply({ 
                    content: "📋 **Paliers automatiques de /moderation warn :**\n" +
                             "• **3 avertissements** ➔ Mise en sourdine (Timeout 10m)\n" +
                             "• **5 avertissements** ➔ Mise en sourdine (Timeout 1h)\n" +
                             "• **7 avertissements** ➔ Expulsion immédiate du serveur", 
                    ephemeral: true 
                });
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
            else if (id === 'action_info_purge') {
                return i.reply({ 
                    content: "🧹 **Purge de messages :** Utilisez la commande `/moderation purge` avec le nombre souhaité (1-100) et un filtre facultatif par utilisateur.", 
                    ephemeral: true 
                });
            }
            else if (id === 'action_info_hierarchy') {
                return i.reply({ 
                    content: "🛡️ **Protection Hiérarchie :** Le système empêche tout modérateur de sanctionner un membre ayant un rôle supérieur ou égal, ainsi que le propriétaire.", 
                    ephemeral: true 
                });
            }

            // 6. ACTIONS ONGLET UTILITAIRES
            else if (id === 'action_pick_ticket') {
                currentPicker = currentPicker === 'ticket' ? null : 'ticket';
            }
            else if (id === 'action_refresh_stats') {
                // Refresh
            }

            // 7. SÉLECTIONS MENUS DÉROULANTS
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

            // 8. MODAL PERSONNALISER
            else if (id === 'btn_personaliser') {
                const currentW = welcomeConfig.get(guild.id) || {};
                const currentCfg = getConfig(guild.id) || {};

                const modal = new ModalBuilder()
                    .setCustomId('modal_custom_settings')
                    .setTitle('Personnalisation de la Protection');

                const welcomeInput = new TextInputBuilder()
                    .setCustomId('input_welcome_text')
                    .setLabel('Message de bienvenue ({user}, {server})')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Bienvenue {user} sur {server} ! Nous sommes {count} membres.')
                    .setValue(currentW.message || '')
                    .setRequired(false)
                    .setMaxLength(500);

                const raidThresholdInput = new TextInputBuilder()
                    .setCustomId('input_raid_threshold')
                    .setLabel('Seuil Anti-Raid (arrivées en 15s)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('6')
                    .setValue(String(currentCfg.raidThreshold || 6))
                    .setRequired(false)
                    .setMaxLength(3);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(welcomeInput),
                    new ActionRowBuilder().addComponents(raidThresholdInput)
                );

                await i.showModal(modal);

                const modalSubmit = await i.awaitModalSubmit({ time: 120000 }).catch(() => null);
                if (modalSubmit) {
                    const newMsg = modalSubmit.fields.getTextInputValue('input_welcome_text');
                    const newRaid = parseInt(modalSubmit.fields.getTextInputValue('input_raid_threshold'), 10);

                    if (newMsg) {
                        const existingWelcome = welcomeConfig.get(guild.id) || {};
                        welcomeConfig.set(guild.id, { ...existingWelcome, message: newMsg });
                    }
                    if (!isNaN(newRaid) && newRaid >= 2 && newRaid <= 50) {
                        updateConfig(guild.id, 'raidThreshold', newRaid);
                    }

                    const updatedEmbed = await buildSettingsEmbed(guild, currentTab, client);
                    const updatedComponents = await renderComponents();

                    return modalSubmit.update({
                        embeds: [updatedEmbed],
                        components: updatedComponents
                    }).catch(() => {});
                }
                return;
            }

            // 9. CHANGELOG
            else if (id === 'btn_changelog') {
                return i.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(THEME_BLUE)
                            .setTitle("📕 Changelog • Système de Sécurité")
                            .setDescription(
                                "• **Panneau /setting** : Interface de configuration intuitive et dynamique.\n" +
                                "• **Boutons contextuels avec indicateurs d'état** (Vert = Actif, Gris/Rouge = Inactif).\n" +
                                "• **Sélecteurs intégrés** en direct pour salons, rôles et catégories.\n" +
                                "• **Modal de personnalisation** : Configuration du message de bienvenue et du seuil anti-raid.\n" +
                                "• **Anti-doublon absolu** pour toutes les commandes Discord."
                            )
                    ],
                    ephemeral: true
                });
            }

            // MISE À JOUR VISUELLE DIRECTE
            const updatedEmbed = await buildSettingsEmbed(guild, currentTab, client);
            const updatedComponents = await renderComponents();

            await i.update({
                embeds: [updatedEmbed],
                components: updatedComponents
            }).catch(() => {});
        });
    }
};
