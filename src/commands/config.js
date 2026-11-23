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
        .setDescription('⚙️ Configuration complète de HiverGuard / LvProtect')
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

        // Option : Anti-Pub (Liens)
        .addBooleanOption(opt =>
            opt.setName('anti_link')
                .setDescription('Activer ou désactiver l\'anti-pub (liens d\'invitations)'))

        // Option : Anti-Spam
        .addBooleanOption(opt =>
            opt.setName('anti_spam')
                .setDescription('Activer ou désactiver le filtre anti-spam'))
        
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
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
            }

            // 2. RÉCUPÉRATION DES INPUTS
            const logChannel = options.getChannel('log_channel');
            const ticketCategory = options.getChannel('ticket_category');
            const verifiedRole = options.getRole('verified_role');
            const antiLink = options.getBoolean('anti_link');
            const antiSpam = options.getBoolean('anti_spam');

            const updatedFields = [];

            // 3. MISE À JOUR DES DONNÉES
            if (logChannel) {
                config.logChannel = logChannel.id;
                updatedFields.push(`🔹 **Logs :** <#${logChannel.id}>`);
            }
            if (ticketCategory) {
                config.ticketCategory = ticketCategory.id;
                updatedFields.push(`🔹 **Tickets :** 📁 ${ticketCategory.name}`);
            }
            if (verifiedRole) {
                config.verifiedRole = verifiedRole.id;
                updatedFields.push(`🔹 **Rôle vérifié :** <@&${verifiedRole.id}>`);
            }
            if (antiLink !== null) {
                config.antiLink = antiLink;
                updatedFields.push(`🔹 **Anti-Pub :** ${antiLink ? '✅ Activé' : '❌ Désactivé'}`);
            }
            if (antiSpam !== null) {
                config.antiSpam = antiSpam;
                updatedFields.push(`🔹 **Anti-Spam :** ${antiSpam ? '✅ Activé' : '❌ Désactivé'}`);
            }

            // 4. SI AUCUNE OPTION : AFFICHER LA CONFIG ACTUELLE
            if (updatedFields.length === 0) {
                const currentConfigEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle(`📊 Configuration de ${guild.name}`)
                    .setThumbnail(guild.iconURL({ dynamic: true }))
                    .addFields(
                        { name: '📜 Salon Logs', value: config.logChannel ? `<#${config.logChannel}>` : '❌ Non configuré', inline: true },
                        { name: '🎫 Catégorie Tickets', value: config.ticketCategory ? `<#${config.ticketCategory}>` : '❌ Non configuré', inline: true },
                        { name: '✅ Rôle Vérifié', value: config.verifiedRole ? `<@&${config.verifiedRole}>` : '❌ Non configuré', inline: true },
                        { name: '🔗 Anti-Pub', value: config.antiLink !== false ? '✅ Activé' : '❌ Désactivé', inline: true },
                        { name: '💬 Anti-Spam', value: config.antiSpam !== false ? '✅ Activé' : '❌ Désactivé', inline: true }
                    )
                    .setFooter({ text: "Utilise les options de la commande pour modifier ces paramètres." })
                    .setTimestamp();

                return interaction.reply({ embeds: [currentConfigEmbed], ephemeral: true });
            }

            // ENREGISTREMENT
            setConfig(guildId, config);

            // 5. EMBED DE CONFIRMATION
            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("✅ Configuration Mise à Jour")
                .setDescription(updatedFields.join('\n'))
                .setFooter({ text: "Paramètres sauvegardés avec succès" })
                .setTimestamp();

            return interaction.reply({ embeds: [successEmbed], ephemeral: true });

        } catch (error) {
            console.error("Erreur commande config:", error);
            return interaction.reply({
                content: "❌ Une erreur est survenue lors de la configuration.",
                ephemeral: true
            });
        }
    }
};
