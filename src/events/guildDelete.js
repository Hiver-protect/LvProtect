const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildDelete',

    async execute(guild, client) {
        const channelId = "1497097465466454128";

        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("📤 Bot retiré d’un serveur")
            .addFields(
                { name: "🏷️ Serveur", value: guild.name, inline: true },
                { name: "🆔 ID", value: guild.id, inline: true },
                { name: "👥 Membres", value: `${guild.memberCount || "Inconnu"}`, inline: true },
                { name: "🌍 Total serveurs", value: `${client.guilds.cache.size}`, inline: true }
            )
            .setThumbnail(guild.iconURL({ dynamic: true }) || null)
            .setTimestamp()
            .setFooter({ text: "Système de Sécurité • Logs" });

        channel.send({ embeds: [embed] }).catch(() => {});
    }
};