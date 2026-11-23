const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { set } = require('../modules/bumpConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setbumpchannel')
        .setDescription('Configurer le salon de bump')
        .addChannelOption(opt =>
            opt.setName('salon')
                .setDescription('Salon pour les bumps')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        const channel = interaction.options.getChannel('salon');

        set(interaction.guild.id, {
            channelId: channel.id
        });

        await interaction.reply({
            content: `✅ Salon de bump défini sur ${channel}`,
            ephemeral: true
        });
    }
};