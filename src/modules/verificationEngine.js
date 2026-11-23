/**
 * @file verificationEngine.js
 * @description Moteur de pointe pour la vérification avec Captcha, Boutons et Modals Discord.
 */

const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    PermissionsBitField 
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const { getConfig: getGuildConfig } = require('./guildConfig');

const configPath = path.join(process.cwd(), 'data', 'verification_config.json');

function readAllConfigs() {
    try {
        if (!fs.existsSync(configPath)) {
            const dir = path.dirname(configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(configPath, '{}', 'utf8');
            return {};
        }
        const content = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(content || '{}');
    } catch (e) {
        console.error("Erreur lecture verification_config:", e.message);
        return {};
    }
}

function writeAllConfigs(configs) {
    try {
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(configs, null, 2), 'utf8');
    } catch (e) {
        console.error("Erreur écriture verification_config:", e.message);
    }
}

module.exports = {
    // Configuration unifiée (vérifie d'abord verification_config puis guildConfig)
    async getConfig(guildId) {
        const configs = readAllConfigs();
        const specific = configs[guildId] || {};
        const globalCfg = getGuildConfig(guildId) || {};

        return {
            roleId: specific.roleId || globalCfg.verifiedRole || null,
            mode: specific.mode || 'CHANNEL', // 'DM' ou 'CHANNEL'
            logChannelId: specific.logChannelId || globalCfg.logChannel || null,
            enabled: specific.enabled !== undefined ? specific.enabled : Boolean(specific.roleId || globalCfg.verifiedRole)
        };
    },

    async saveConfig(guildId, newConfig) {
        const configs = readAllConfigs();
        configs[guildId] = { ...configs[guildId], ...newConfig };
        writeAllConfigs(configs);
    },

    /**
     * Génère un code de vérification aléatoire et clair
     */
    generateCaptcha(length = 6) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclut 0, O, I, 1
        return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    },

    /**
     * Lance la procédure de vérification
     */
    async startVerification(member, channelOrInteraction) {
        const config = await this.getConfig(member.guild.id);
        if (!config.roleId) {
            if (channelOrInteraction?.reply) {
                return channelOrInteraction.reply({
                    content: "❌ Le système de vérification n'est pas encore configuré (rôle manquant). Un administrateur doit utiliser `/config` ou `/verify-setup`.",
                    ephemeral: true
                });
            }
            return;
        }

        const captcha = this.generateCaptcha();
        
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Vérification de Sécurité')
            .setDescription(`Bienvenue sur **${member.guild.name}** !\n\nPour obtenir l'accès aux salons, clique sur le bouton ci-dessous et saisis le code de sécurité :\n\n# \`${captcha}\`\n\n*(Ce code est sensible à la casse)*`)
            .setColor('#5865F2')
            .setThumbnail(member.guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'HiverGuard Security System' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`verify_btn_${captcha}`)
                .setLabel('Saisir le code')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🔐')
        );

        try {
            if (config.mode === 'DM') {
                const dm = await member.send({ embeds: [embed], components: [row] }).catch(() => null);
                if (!dm) {
                    if (channelOrInteraction?.reply) {
                        return channelOrInteraction.reply({
                            content: "❌ Tes messages privés sont fermés. Impossible de t'envoyer le captcha en privé.",
                            ephemeral: true
                        });
                    }
                    return;
                }
                if (channelOrInteraction?.reply) {
                    await channelOrInteraction.reply({ content: "📩 Vérification envoyée en message privé !", ephemeral: true });
                }
            } else {
                if (channelOrInteraction?.reply) {
                    await channelOrInteraction.reply({ embeds: [embed], components: [row], ephemeral: true });
                }
            }
        } catch (error) {
            console.error("Erreur startVerification:", error.message);
        }
    },

    /**
     * Gère le clic sur le bouton de vérification (Affiche le Modal)
     */
    async handleButton(interaction) {
        if (!interaction.customId.startsWith('verify_btn_')) return;
        
        const expectedCaptcha = interaction.customId.split('_')[2];

        const modal = new ModalBuilder()
            .setCustomId(`verify_modal_${expectedCaptcha}`)
            .setTitle('Validation de Sécurité');

        const input = new TextInputBuilder()
            .setCustomId('captcha_input')
            .setLabel('Entrez le code affiché')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`Exemple : ${expectedCaptcha}`)
            .setRequired(true)
            .setMinLength(4)
            .setMaxLength(10);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    },

    /**
     * Gère la validation du formulaire Modal
     */
    async handleModal(interaction) {
        if (!interaction.customId.startsWith('verify_modal_')) return;

        const expected = interaction.customId.split('_')[2];
        const input = interaction.fields.getTextInputValue('captcha_input')?.trim();
        const config = await this.getConfig(interaction.guildId);

        if (input !== expected) {
            return interaction.reply({ 
                content: "❌ Code incorrect ! Clique à nouveau sur le bouton pour réessayer.", 
                ephemeral: true 
            });
        }

        const role = interaction.guild.roles.cache.get(config.roleId);
        if (!role) {
            return interaction.reply({ 
                content: "⚠️ Le rôle de vérification n'a pas été trouvé. Veuillez contacter un administrateur.", 
                ephemeral: true 
            });
        }

        // Vérification de la hiérarchie du bot
        const botMember = interaction.guild.members.me;
        if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles) || botMember.roles.highest.position <= role.position) {
            return interaction.reply({
                content: "❌ Le bot n'a pas les permissions suffisantes pour attribuer ce rôle (vérifiez la hiérarchie des rôles).",
                ephemeral: true
            });
        }

        try {
            await interaction.member.roles.add(role);

            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("✅ Vérification Réussie")
                .setDescription(`Félicitations, tu as été vérifié avec succès et as reçu le rôle **${role.name}** ! Tu as désormais accès au serveur.`)
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            // Log de la vérification
            if (config.logChannelId) {
                const logChan = interaction.guild.channels.cache.get(config.logChannelId);
                if (logChan && logChan.isTextBased()) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0x2ecc71)
                        .setTitle("🛡️ Nouveau membre vérifié")
                        .addFields(
                            { name: "👤 Membre", value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
                            { name: "✅ Rôle attribué", value: `${role.name}`, inline: true }
                        )
                        .setTimestamp();

                    await logChan.send({ embeds: [logEmbed] }).catch(() => {});
                }
            }
        } catch (err) {
            console.error("Erreur lors de l'ajout du rôle de vérification:", err.message);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de l'attribution de ton rôle.",
                ephemeral: true
            });
        }
    }
};
