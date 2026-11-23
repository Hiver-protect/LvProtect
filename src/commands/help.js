const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('📖 Affiche le centre d\'aide et la liste des commandes'),

    async execute(interaction, client) {
        // Embed d'accueil principal
        const mainEmbed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle("🛡️ HiverGuard / LvProtect • Centre d'Aide")
            .setDescription(
                "Bienvenue dans le menu d'aide officiel.\n" +
                "Utilisez le menu déroulant ci-dessous pour explorer les différentes fonctionnalités du bot."
            )
            .addFields(
                { name: "🛡️ Sécurité & Anti-Raid", value: "Anti-bot, anti-pub, anti-mass join, captcha", inline: true },
                { name: "🔨 Modération", value: "Ban, kick, mute, unmute, warn, purge", inline: true },
                { name: "🎫 Support & Tickets", value: "Création, fermeture, logs de tickets", inline: true },
                { name: "⚙️ Configuration", value: "Salons de logs, bienvenue, rôles", inline: true },
                { name: "🚀 Partenariats (Bump)", value: "Système de bump automatique et cooldown", inline: true },
                { name: "📊 Statistiques", value: `${client.guilds.cache.size} serveurs protégés`, inline: true }
            )
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter({ text: "Sélectionnez une catégorie ci-dessous pour voir les commandes" })
            .setTimestamp();

        const menu = new StringSelectMenuBuilder()
            .setCustomId("help_menu")
            .setPlaceholder("📂 Choisissez une catégorie...")
            .addOptions([
                {
                    label: "Sécurité & Anti-Raid",
                    description: "Protection contre les raids, bots et spams",
                    value: "security",
                    emoji: "🔒"
                },
                {
                    label: "Modération",
                    description: "Commandes de gestion des sanctions",
                    value: "moderation",
                    emoji: "🛡️"
                },
                {
                    label: "Support & Tickets",
                    description: "Système de tickets privé et transcripts",
                    value: "tickets",
                    emoji: "🎫"
                },
                {
                    label: "Configuration & Utilitaires",
                    description: "Paramétrage du serveur et outils",
                    value: "config",
                    emoji: "⚙️"
                },
                {
                    label: "Système & Infos",
                    description: "Informations sur le bot et statut",
                    value: "system",
                    emoji: "📊"
                }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        const reply = await interaction.reply({
            embeds: [mainEmbed],
            components: [row],
            ephemeral: true
        });

        const collector = reply.createMessageComponentCollector({
            time: 120000
        });

        collector.on("collect", async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "❌ Ce menu d'aide n'est pas pour vous.", ephemeral: true });
            }

            let catEmbed;

            switch (i.values[0]) {
                case "security":
                    catEmbed = new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle("🔒 Sécurité & Anti-Raid")
                        .setDescription("Modules de protection active pour votre serveur :")
                        .addFields(
                            { name: "`/lockdown [raison]`", value: "Verrouille immédiatement tous les salons texte en cas d'urgence." },
                            { name: "`/unlock`", value: "Déverrouille le serveur et restaure les permissions." },
                            { name: "`/verify-setup`", value: "Installe le panneau de vérification par bouton & captcha." },
                            { name: "`/verify`", value: "Lance manuellement la vérification de sécurité." },
                            { name: "🛡️ Protections automatiques", value: "• **Anti-Bot Rogue :** Expulse tout bot ajouté sans droit admin.\n• **Anti-Pub :** Supprime les liens d'invitations Discord.\n• **Anti-Mass Mentions :** Sanctionne les @everyone / @here abusifs.\n• **Anti-Spam :** Timeout automatique des spammeurs." }
                        );
                    break;

                case "moderation":
                    catEmbed = new EmbedBuilder()
                        .setColor(0xe67e22)
                        .setTitle("🛡️ Commandes de Modération")
                        .addFields(
                            { name: "`/ban <membre> [raison]`", value: "Bannit un utilisateur et enregistre la sanction dans les logs." },
                            { name: "`/kick <membre> [raison]`", value: "Expulse un membre du serveur avec notification." },
                            { name: "`/mute <membre> <duree> [raison]`", value: "Met un membre en sourdine (1m, 5m, 1h, 1j, 1semaine)." },
                            { name: "`/unmute <membre> [raison]`", value: "Retire la mise en sourdine d'un membre." },
                            { name: "`/warn <add|list|remove|clear>`", value: "Système complet d'avertissements avec sanctions automatiques." },
                            { name: "`/purge <nombre> [utilisateur]`", value: "Supprime en masse jusqu'à 100 messages récents." }
                        );
                    break;

                case "tickets":
                    catEmbed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle("🎫 Système de Tickets")
                        .addFields(
                            { name: "`/ticket-panel`", value: "Envoie l'embed avec bouton pour ouvrir un ticket." },
                            { name: "`/ticket <close|add|remove|claim>`", value: "Gère les options avancées du ticket en cours." },
                            { name: "📁 Transcripts automatiques", value: "Sauvegarde complète de la discussion lors de la fermeture." }
                        );
                    break;

                case "config":
                    catEmbed = new EmbedBuilder()
                        .setColor(0x2ecc71)
                        .setTitle("⚙️ Configuration & Utilitaires")
                        .addFields(
                            { name: "`/settings` (ou `/setting`)", value: "Panneau de configuration visuel, interactif et complet avec onglets et boutons." },
                            { name: "`/config`", value: "Définit rapidement les salons de logs, tickets, rôle vérifié, anti-pub, anti-spam." },
                            { name: "`/setwelcome`", value: "Configure le message et salon de bienvenue pour les nouveaux." },
                            { name: "`/setbumpchannel`", value: "Définit le salon dédié aux bumps et partenariats." },
                            { name: "`/bump`", value: "Enregistre un bump avec cooldown de 2 heures." },
                            { name: "`/embed`", value: "Créateur visuel d'embeds personnalisés complets." }
                        );
                    break;

                case "system":
                    catEmbed = new EmbedBuilder()
                        .setColor(0x9b59b6)
                        .setTitle("📊 Système & État du Bot")
                        .addFields(
                            { name: "🌐 Serveurs", value: `${client.guilds.cache.size}`, inline: true },
                            { name: "👥 Membres", value: `${client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0)}`, inline: true },
                            { name: "⚡ Ping WebSocket", value: `${client.ws.ping} ms`, inline: true },
                            { name: "🟢 Uptime", value: `<t:${Math.floor(client.readyTimestamp / 1000)}:R>`, inline: true },
                            { name: "📦 Node.js", value: process.version, inline: true }
                        );
                    break;
            }

            catEmbed.setFooter({ text: "HiverGuard / LvProtect" }).setTimestamp();

            await i.update({
                embeds: [catEmbed],
                components: [row]
            }).catch(() => {});
        });
    }
};
