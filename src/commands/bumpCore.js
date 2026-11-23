const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

const { get, set } = require('../modules/bumpConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bump')
        .setDescription('Promouvoir le serveur'),

    async execute(interaction) {

        const guildId = interaction.guild.id;
        const config = get(guildId);

        if (!config.channelId) {
            return interaction.reply({
                content: "❌ Aucun salon de bump configuré (/setbumpchannel)",
                ephemeral: true
            });
        }

        const channel = interaction.guild.channels.cache.get(config.channelId);
        if (!channel) {
            return interaction.reply({
                content: "❌ Salon introuvable",
                ephemeral: true
            });
        }

        const cooldown = 2 * 60 * 60 * 1000; // 2 heures
        const now = Date.now();
        const lastBump = config.lastBump || 0;

        if (now - lastBump < cooldown) {
            const remaining = (lastBump + cooldown) - now;
            const min = Math.floor(remaining / 60000);

            return interaction.reply({
                content: `⏳ Attends encore **${min} min** avant de pouvoir de nouveau bump !`,
                ephemeral: true
            });
        }

        // Sauvegarder le timestamp de ce bump de manière persistante
        set(guildId, { lastBump: now });

        // =========================
        // 📢 MESSAGE BUMP
        // =========================
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("🚀 Nouveau bump !")
            .setDescription(
                `Le serveur **${interaction.guild.name}** a été bump !\n\n` +
                `👤 Par : ${interaction.user}\n` +
                `⏱️ Prochain dans 2h`
            )
            .setThumbnail(interaction.guild.iconURL())
            .setTimestamp();

        await channel.send({ embeds: [embed] });

        await interaction.reply({
            content: "✅ Bump envoyé !",
            ephemeral: true
        });

        // =========================
        // 🔔 RAPPEL AUTO
        // =========================
        setTimeout(async () => {
            try {
                // Double vérification si un autre bump n'a pas été fait entre temps
                const currentConfig = get(guildId);
                if (currentConfig.lastBump === now) {
                    const reminder = new EmbedBuilder()
                        .setColor(0x2ecc71)
                        .setTitle("🔔 Bump disponible")
                        .setDescription("Le délai est écoulé ! Tu peux de nouveau faire `/bump` 🚀")
                        .setTimestamp();

                    await channel.send({ embeds: [reminder] });
                }
            } catch {}
        }, cooldown);
    }
};