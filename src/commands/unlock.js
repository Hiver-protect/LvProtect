const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const store = require('../modules/lockdownStore');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Réouvre le serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        await interaction.reply({ content: "🔓 Déverrouillage en cours...", ephemeral: true });

        const guild = interaction.guild;
        const data = store.load();

        if (!data[guild.id]) {
            return interaction.followUp({ content: "⚠️ Aucun lockdown actif", ephemeral: true });
        }

        for (const channel of guild.channels.cache.values()) {

            if (channel.type !== ChannelType.GuildText) continue;

            const everyone = guild.roles.everyone;

            await channel.permissionOverwrites.edit(everyone, {
                SendMessages: null
            }).catch(() => {});
        }

        delete data[guild.id];
        store.save(data);

        const firstChannel = guild.systemChannel || guild.channels.cache.find(c => c.type === ChannelType.GuildText);

        if (firstChannel) {
            firstChannel.send({
                content: "✅ **LOCKDOWN LEVÉ**\n\nLe serveur est de nouveau accessible."
            }).catch(() => {});
        }
    }
};