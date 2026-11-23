const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ChannelType 
} = require('discord.js');
const { getConfig, setConfig } = require('../modules/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('⚙️ Configuration complète de HiverGuard')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // Option : Logs
        .addChannelOption(opt =>
            opt.setName('log_channel')
                .setDescription('Salon où seront envoyés les logs de sécurité')
                .addChannelTypes(ChannelType.GuildText))
        
        // Option : Tickets
        .addChannelOption(opt =>
            opt.setName('ticket_category')
                .setDescription('Catégorie où les tickets seront créés')
                .addChannelTypes(ChannelType.GuildCategory))
        
        // Option : Rôle Vérifié
        .addRoleOption(opt =>
            opt.setName('verified_role')
                .setDescription('Rôle attribué après vérification'))
        
        // Option : Reset
        .addBooleanOption(opt =>
            opt.setName('reset')
                .setDescription('⚠️ Réinitialiser TOUTE la configuration')),

    async execute(interaction) {
        const { guild, options } = interaction;
        const guildId = guild.id;
        
        try {
            let config = getConfig(guildId) || {};
            const reset = options.getBoolean('reset');

            // 1. GESTION DU RESET
            if (reset) {
                setConfig(guildId, {});
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#ff5555')
                            .setTitle("🗑️ Configuration Réinitialisée")
                            .setDescription("Tous les paramètres de HiverGuard ont été effacés pour ce serveur.")
                    ],
                    ephemeral: true
                });
            }

            // 2. RÉCUPÉRATION DES INPUTS
            const logChannel = options.getChannel('log_channel');
            const ticketCategory = options.getChannel('ticket_category');
            const verifiedRole = options.getRole('verified_role');

            const updatedFields = [];

            // 3. MISE À JOUR DES DONNÉES
            if (logChannel) {
                config.logChannel = logChannel.id;
                updatedFields.push(`🔹 **Logs:** <#${logChannel.id}>`);
            }
            if (ticketCategory) {
                config.ticketCategory = ticketCategory.id;
                updatedFields.push(`🔹 **Tickets:** 📁 ${ticketCategory.name}`);
            }
            if (verifiedRole) {
                config.verifiedRole = verifiedRole.id;
                updatedFields.push(`🔹 **Rôle:** <@&${verifiedRole.id}>`);
            }

            // 4. SI AUCUNE OPTION : AFFICHER LA CONFIG ACTUELLE
            if (updatedFields.length === 0) {
                const currentConfigEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle(`📊 Configuration actuelle - ${guild.name}`)
                    .setThumbnail(guild.iconURL())
                    .addFields(
                        { name: '📜 Salon Logs', value: config.logChannel ? `<#${config.logChannel}>` : '❌ Non configuré', inline: true },
                        { name: '🎫 Catégorie Tickets', value: config.ticketCategory ? `📁 <#${config.ticketCategory}>` : '❌ Non configuré', inline: true },
                        { name: '✅ Rôle Vérifié', value: config.verifiedRole ? `<@&${config.verifiedRole}>` : '❌ Non configuré', inline: true }
                    )
                    .setFooter({ text: "Utilise les options de la commande pour modifier ces valeurs." });

                return interaction.reply({ embeds: [currentConfigEmbed], ephemeral: true });
            }

            // ENREGISTREMENT
            setConfig(guildId, config);

            // 5. EMBED DE CONFIRMATION
            const successEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle("✅ Configuration mise à jour")
                .setDescription(`Les paramètres suivants ont été modifiés avec succès :\n\n${updatedFields.join('\n')}`)
                .setTimestamp()
                .setFooter({ text: `Configuré par ${interaction.user.tag}` });

            return interaction.reply({
                embeds: [successEmbed],
                ephemeral: true
            });

        } catch (err) {
            console.error("❌ Error in /config:", err);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle("🚨 Erreur Système")
                .setDescription("Une erreur interne est survenue lors de l'enregistrement de la configuration.");

            return interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
        }
    }
};