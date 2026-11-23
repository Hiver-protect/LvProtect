const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const store = require('../modules/lockdownStore');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lockdown')
        .setDescription('Ferme tout le serveur')
        .addStringOption(opt =>
            opt.setName('raison')
                .setDescription('Raison du lockdown')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        await interaction.reply({ content: "🔒 Lockdown en cours...", ephemeral: true });

        const guild = interaction.guild;
        const data = store.load();

        if (data[guild.id]) {
            return interaction.followUp({ content: "⚠️ Lockdown déjà actif", ephemeral: true });
        }

        data[guild.id] = {};

        // 🔒 Lock tous les salons texte
        for (const channel of guild.channels.cache.values()) {

            if (channel.type !== ChannelType.GuildText) continue;

            const everyone = guild.roles.everyone;

            const perms = channel.permissionOverwrites.cache.get(everyone.id);

            data[guild.id][channel.id] = perms ? perms.allow.bitfield : null;

            await channel.permissionOverwrites.edit(everyone, {
                SendMessages: false
            }).catch(() => {});
        }

        store.save(data);

        // 📢 Message global
        const firstChannel = guild.systemChannel || guild.channels.cache.find(c => c.type === ChannelType.GuildText);

        if (firstChannel) {
            firstChannel.send({
                content: `🚨 **LOCKDOWN ACTIVÉ** 🚨\n\n🔒 Le serveur est temporairement fermé.\n👮 Raison : ${interaction.options.getString('raison') || "Non précisée"}`
            }).catch(() => {});
        }
    }
};