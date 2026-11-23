const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Créer un embed personnalisé avancé')

        .addStringOption(opt =>
            opt.setName('titre')
                .setDescription('Titre de l’embed')
                .setRequired(true))

        .addStringOption(opt =>
            opt.setName('description')
                .setDescription('Description de l’embed')
                .setRequired(true))

        .addStringOption(opt =>
            opt.setName('couleur')
                .setDescription('Couleur HEX (#5865F2)')
                .setRequired(false))

        .addStringOption(opt =>
            opt.setName('footer')
                .setDescription('Footer')
                .setRequired(false))

        .addStringOption(opt =>
            opt.setName('author')
                .setDescription('Auteur de l’embed')
                .setRequired(false))

        .addStringOption(opt =>
            opt.setName('image')
                .setDescription('URL image')
                .setRequired(false))

        .addStringOption(opt =>
            opt.setName('thumbnail')
                .setDescription('URL thumbnail')
                .setRequired(false))

        .addStringOption(opt =>
            opt.setName('content')
                .setDescription('Message texte hors embed')
                .setRequired(false))

        .addBooleanOption(opt =>
            opt.setName('timestamp')
                .setDescription('Afficher timestamp ?')
                .setRequired(false))

        .addChannelOption(opt =>
            opt.setName('salon')
                .setDescription('Salon cible')
                .setRequired(false))

        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {

        const safeURL = (url) => {
            if (!url) return null;
            try {
                return /^https?:\/\/.+/i.test(url) ? url : null;
            } catch {
                return null;
            }
        };

        const parseColor = (input) => {
            if (!input) return 0x5865F2;
            if (/^#?[0-9A-Fa-f]{6}$/.test(input)) {
                return parseInt(input.replace('#', ''), 16);
            }
            return 0x5865F2;
        };

        try {

            const title = interaction.options.getString('titre');
            const description = interaction.options.getString('description');
            const color = parseColor(interaction.options.getString('couleur'));
            const footer = interaction.options.getString('footer');
            const author = interaction.options.getString('author');
            const image = safeURL(interaction.options.getString('image'));
            const thumbnail = safeURL(interaction.options.getString('thumbnail'));
            const content = interaction.options.getString('content');
            const useTimestamp = interaction.options.getBoolean('timestamp') ?? true;
            const channel = interaction.options.getChannel('salon') || interaction.channel;

            // 🔒 check salon valide
            if (!channel || channel.type !== ChannelType.GuildText) {
                return interaction.reply({
                    content: "❌ Salon invalide.",
                    ephemeral: true
                });
            }

            // 🔒 permissions bot
            const perms = channel.permissionsFor(interaction.guild.members.me);
            if (!perms?.has(PermissionFlagsBits.SendMessages) ||
                !perms?.has(PermissionFlagsBits.EmbedLinks)) {
                return interaction.reply({
                    content: "❌ Je n’ai pas les permissions dans ce salon.",
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(description);

            if (footer) embed.setFooter({ text: footer });
            if (author) embed.setAuthor({ name: author });
            if (image) embed.setImage(image);
            if (thumbnail) embed.setThumbnail(thumbnail);
            if (useTimestamp) embed.setTimestamp();

            await channel.send({
                content: content || null,
                embeds: [embed]
            });

            return interaction.reply({
                content: "✅ Embed envoyé avec succès.",
                ephemeral: true
            });

        } catch (err) {

            console.error("❌ /embed error:", err);

            return interaction.reply({
                content: "❌ Erreur lors de la création de l’embed.",
                ephemeral: true
            }).catch(() => {});
        }
    }
};