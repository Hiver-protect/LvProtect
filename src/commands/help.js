const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    data: {
        name: "help",
        description: "Affiche la liste des commandes"
    },

    async execute(interaction, client) {

        const categories = {
            moderation: "🛡️ Modération",
            security: "🔒 Sécurité",
            utils: "⚙️ Utilitaires",
            system: "📊 Système"
        };

        // =========================
        // 📦 EMBED HOME
        // =========================
        const mainEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("🛡️ HiverGuard • Help Menu")
            .setDescription(
                "Bienvenue dans le centre d’aide.\n\n" +
                "Choisis une catégorie ci-dessous pour voir les commandes."
            )
            .setFooter({ text: "HiverGuard Help System" })
            .setTimestamp();

        // =========================
        // 📋 MENU SELECT
        // =========================
        const menu = new StringSelectMenuBuilder()
            .setCustomId("help_menu")
            .setPlaceholder("📂 Choisis une catégorie")
            .addOptions([
                {
                    label: "Modération",
                    value: "moderation",
                    emoji: "🛡️"
                },
                {
                    label: "Sécurité",
                    value: "security",
                    emoji: "🔒"
                },
                {
                    label: "Utilitaires",
                    value: "utils",
                    emoji: "⚙️"
                },
                {
                    label: "Système",
                    value: "system",
                    emoji: "📊"
                }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        const msg = await interaction.reply({
            embeds: [mainEmbed],
            components: [row],
            ephemeral: true
        });

        // =========================
        // 🔄 COLLECTOR MENU
        // =========================
        const collector = msg.createMessageComponentCollector({
            time: 60000
        });

        collector.on("collect", async (i) => {

            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: "❌ Ce menu n’est pas pour toi",
                    ephemeral: true
                });
            }

            let embed;

            switch (i.values[0]) {

                // 🛡️ MODERATION
                case "moderation":
                    embed = new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle("🛡️ Modération")
                        .setDescription(
                            "`/ban`\n`/kick`\n`/mute`\n`/unmute`\n`/warn`\n`/purge`"
                        );
                    break;

                // 🔒 SECURITY
                case "security":
                    embed = new EmbedBuilder()
                        .setColor(0xf1c40f)
                        .setTitle("🔒 Sécurité")
                        .setDescription(
                            "`/lockdown`\n`/unlock`\n`/verify`\n`anti-raid system`"
                        );
                    break;

                // ⚙️ UTILS
                case "utils":
                    embed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle("⚙️ Utilitaires")
                        .setDescription(
                            "`/embed`\n`/ticket`\n`/setwelcome`"
                        );
                    break;

                // 📊 SYSTEM
                case "system":
                    embed = new EmbedBuilder()
                        .setColor(0x9b59b6)
                        .setTitle("📊 Système")
                        .setDescription(
                            `Serveurs: ${client.guilds.cache.size}\n` +
                            `Users: ${client.users.cache.size}`
                        );
                    break;
            }

            await i.update({
                embeds: [embed],
                components: [row]
            });
        });
    }
};