const { EmbedBuilder, PermissionsBitField, Events } = require('discord.js');

module.exports = {
    name: Events.GuildCreate,

    async execute(guild) {
        const client = guild.client; // Récupération propre du client
        const SUPPORT_URL = "https://discord.gg/MtdhG6JAf8";
        const LOG_CHANNEL_ID = "1497097465466454128";

        const log = (m) => console.log(`[📥 Join] ${m}`);

        try {
            // 1. Récupération des données essentielles
            const owner = await guild.fetchOwner().catch(() => null);
            const icon = guild.iconURL({ dynamic: true }) || null;
            const createdTimestamp = `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`;
            
            const me = guild.members.me;
            const botPerms = me?.permissions.toArray() || [];

            // 2. Préparation de l'Embed pour l'Owner (DM)
            const dmEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("❄️ HiverGuard • Activation réussie")
                .setThumbnail(icon)
                .setDescription(
                    `👋 Merci d'avoir ajouté **${client.user.username}** sur ton serveur !\n\n` +
                    `🛡️ Protection active sur **${guild.name}**\n` +
                    `⚡ Système opérationnel et prêt à être configuré.\n\n` +
                    `🔧 Besoin d'aide ? [Rejoindre le Support](${SUPPORT_URL})`
                )
                .addFields(
                    {
                        name: "🚀 Démarrage rapide",
                        value: "• `/setting` pour configurer le bot via le panneau interactif",
                        inline: false
                    },
                    {
                        name: "📊 Infos Serveur",
                        value: `• Membres: **${guild.memberCount}**\n• ID: \`${guild.id}\`\n• Créé: ${createdTimestamp}`,
                        inline: true
                    },
                    {
                        name: "🤖 Stats Bot",
                        value: `• Serveurs: **${client.guilds.cache.size}**\n• Permissions: **${botPerms.length}** accordées`,
                        inline: true
                    }
                )
                .setFooter({ text: "HiverGuard Security Core", iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            // Envoi du DM à l'Owner
            if (owner) {
                await owner.send({ embeds: [dmEmbed] }).catch(() => {
                    log(`DMs fermés pour l'owner de ${guild.name}`);
                });
            }

            // 3. Log interne (Ton serveur de logs)
            const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
            if (logChannel && logChannel.isTextBased()) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle("📥 Nouveau serveur rejoint")
                    .setThumbnail(icon)
                    .addFields(
                        { name: "🏷️ Nom", value: `${guild.name}`, inline: true },
                        { name: "🆔 ID", value: `\`${guild.id}\``, inline: true },
                        { name: "👑 Owner", value: owner ? `${owner.user.tag} (\`${owner.id}\`)` : "Inconnu", inline: false },
                        { name: "👥 Membres", value: `${guild.memberCount}`, inline: true },
                        { name: "🌍 Total Serveurs", value: `${client.guilds.cache.size}`, inline: true }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }

            // 4. Message de bienvenue dans le salon système du serveur rejoint
            const systemChannel = guild.systemChannel;
            if (systemChannel) {
                const canSend = systemChannel.permissionsFor(me)?.has([
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.EmbedLinks
                ]);

                if (canSend) {
                    const welcomeEmbed = new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle("🛡️ HiverGuard est prêt !")
                        .setDescription(
                            `Bonjour à tous ! Merci de m'avoir invité.\n\n` +
                            `• Utilisez **/setting** pour configurer la sécurité et les options\n\n` +
                            `🔧 **Support :** [Cliquez ici](${SUPPORT_URL})`
                        )
                        .setFooter({ text: "Sécurité & Modération" });

                    await systemChannel.send({ embeds: [welcomeEmbed] }).catch(() => {});
                }
            }

            // 5. Nettoyage anti-doublon sur le nouveau serveur
            try {
                const CLIENT_ID = process.env.CLIENT_ID || client.application?.id;
                const TOKEN = process.env.DISCORD_TOKEN;
                const GUILD_ID = process.env.GUILD_ID;
                if (!GUILD_ID && CLIENT_ID && TOKEN) {
                    const { REST, Routes } = require('discord.js');
                    const rest = new REST({ version: '10' }).setToken(TOKEN);
                    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guild.id), { body: [] }).catch(() => {});
                }
            } catch (e) {
                log(`Erreur sync anti-doublon: ${e.message}`);
            }

            log(`Serveur rejoint: ${guild.name} (${guild.id})`);

        } catch (err) {
            log(`Erreur critique dans guildCreate: ${err.message}`);
        }
    }
};