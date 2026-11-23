const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const configDB = require('../modules/welcomeConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwelcome')
        .setDescription('Configurer le message de bienvenue')

        .addChannelOption(opt =>
            opt.setName('salon')
                .setDescription('Salon de bienvenue')
                .setRequired(true))

        .addStringOption(opt =>
            opt.setName('message')
                .setDescription('Message (utilise {user} {server} {count})')
                .setRequired(true))

        .addBooleanOption(opt =>
            opt.setName('embed')
                .setDescription('Envoyer en embed')
                .setRequired(true))

        .addStringOption(opt =>
            opt.setName('couleur')
                .setDescription('Couleur HEX (#5865F2)')
                .setRequired(false))

        .addStringOption(opt =>
            opt.setName('image')
                .setDescription('Image URL')
                .setRequired(false))

        .addBooleanOption(opt =>
            opt.setName('actif')
                .setDescription('Activer ou désactiver')
                .setRequired(true))

        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {

        const salon = interaction.options.getChannel('salon');
        const message = interaction.options.getString('message');
        const embed = interaction.options.getBoolean('embed');
        const actif = interaction.options.getBoolean('actif');
        const couleur = interaction.options.getString('couleur');
        const image = interaction.options.getString('image');

        let colorFinal = 0x5865F2;

        if (couleur && /^#?[0-9A-Fa-f]{6}$/.test(couleur)) {
            colorFinal = parseInt(couleur.replace('#', ''), 16);
        }

        configDB.set(interaction.guild.id, {
            channelId: salon.id,
            message,
            embed,
            actif,
            color: colorFinal,
            image
        });

        const preview = message
            .replace('{user}', interaction.user)
            .replace('{server}', interaction.guild.name)
            .replace('{count}', interaction.guild.memberCount);

        const embedPreview = new EmbedBuilder()
            .setColor(colorFinal)
            .setTitle("✅ Configuration sauvegardée")
            .setDescription(preview)
            .setFooter({ text: "Preview du message" });

        if (image) embedPreview.setImage(image);

        await interaction.reply({
            embeds: [embedPreview],
            ephemeral: true
        });
    }
};