const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Envoyer le panel de ticket'),

  async execute(interaction) {

    // 🔒 optionnel : restreindre au staff
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ Permission refusée", ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🎫 Support HiverGuard")
      .setDescription(
        "Besoin d'aide ?\n\n" +
        "Clique sur le bouton ci-dessous pour ouvrir un ticket.\n" +
        "Un membre du staff te répondra rapidement."
      )
      .setFooter({ text: "HiverGuard • Support" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("create_ticket")
        .setLabel("Créer un ticket")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎫")
    );

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
};
