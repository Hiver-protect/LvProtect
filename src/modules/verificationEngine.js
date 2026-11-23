/**
 * @file verificationEngine.js
 * @description Logique de pointe pour la vérification avec Captcha et Modals.
 */

const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');

const fs = require('fs');
const path = require('path');
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
        console.error("Error reading verification configs:", e);
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
        console.error("Error writing verification configs:", e);
    }
}

module.exports = {
    // Configuration par défaut
    async getConfig(guildId) {
        const configs = readAllConfigs();
        return configs[guildId] || {
            roleId: null,
            mode: 'CHANNEL', // 'DM' ou 'CHANNEL'
            logChannelId: null,
            enabled: false
        };
    },

    async saveConfig(guildId, newConfig) {
        const configs = readAllConfigs();
        configs[guildId] = newConfig;
        writeAllConfigs(configs);
    },

    /**
     * Génère un code de vérification aléatoire
     */
    generateCaptcha(length = 6) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // On exclut 0, O, I, 1 pour éviter la confusion
        return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    },

    /**
     * Lance la procédure de vérification
     */
    async startVerification(member, channelOrInteraction) {
        const config = await this.getConfig(member.guild.id);
        if (!config.enabled || !config.roleId) return;

        const captcha = this.generateCaptcha();
        
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Vérification de Sécurité')
            .setDescription(`Bienvenue sur **${member.guild.name}**.\n\nPour accéder au serveur, merci de cliquer sur le bouton ci-dessous et de saisir le code suivant :\n# \`${captcha}\``)
            .setColor('#5865F2')
            .setFooter({ text: 'Le code est sensible à la casse.' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`verify_btn_${captcha}`)
                .setLabel('Saisir le code')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝')
        );

        // Envoyer soit en DM, soit dans le salon d'interaction
        try {
            if (config.mode === 'DM') {
                await member.send({ embeds: [embed], components: [row] });
                if (channelOrInteraction.reply) {
                    await channelOrInteraction.reply({ content: "📩 Vérification envoyée en message privé !", ephemeral: true });
                }
            } else {
                await channelOrInteraction.reply({ embeds: [embed], components: [row], ephemeral: true });
            }
        } catch (error) {
            if (config.mode === 'DM') {
                await channelOrInteraction.reply({ content: "❌ Vos DMs sont fermés. Merci de les ouvrir pour vous vérifier.", ephemeral: true });
            }
        }
    },

    /**
     * Gère la réponse au bouton (Affiche le Modal)
     */
    async handleButton(interaction) {
        if (!interaction.customId.startsWith('verify_btn_')) return;
        
        const expectedCaptcha = interaction.customId.split('_')[2];

        const modal = new ModalBuilder()
            .setCustomId(`verify_modal_${expectedCaptcha}`)
            .setTitle('Validation du Captcha');

        const input = new TextInputBuilder()
            .setCustomId('captcha_input')
            .setLabel('Entrez le code affiché sur l\'image')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(expectedCaptcha)
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    },

    /**
     * Gère la soumission du Modal
     */
    async handleModal(interaction) {
        if (!interaction.customId.startsWith('verify_modal_')) return;

        const expected = interaction.customId.split('_')[2];
        const input = interaction.fields.getTextInputValue('captcha_input');
        const config = await this.getConfig(interaction.guildId);

        if (input !== expected) {
            return interaction.reply({ content: "❌ Code incorrect. Veuillez réessayer.", ephemeral: true });
        }

        const role = interaction.guild.roles.cache.get(config.roleId);
        if (role) {
            await interaction.member.roles.add(role);
            await interaction.reply({ content: "✅ Vérification réussie ! Bienvenue.", ephemeral: true });
            
            // Log l'action
            if (config.logChannelId) {
                const logChan = interaction.guild.channels.cache.get(config.logChannelId);
                if (logChan) {
                    logChan.send({ content: `✅ **${interaction.user.tag}** a réussi la vérification.` });
                }
            }
        }
    }
};