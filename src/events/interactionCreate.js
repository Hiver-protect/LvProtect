const { Events, EmbedBuilder, PermissionsBitField } = require('discord.js');

const cooldowns = new Map();

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, client) {

    try {

      // =========================
      // 🧠 TYPES D’INTERACTIONS
      // =========================
      if (interaction.isChatInputCommand()) {
        await handleSlash(interaction, client);
      }

      else if (interaction.isButton()) {
        await handleButton(interaction, client);
      }

      else if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction, client);
      }

      else if (interaction.isModalSubmit()) {
        await handleModal(interaction, client);
      }

    } catch (error) {
      console.log("❌ Interaction globale error:", error.message);

      safeReply(interaction, "❌ Une erreur critique est survenue.");
    }
  },
};

// =========================
// ⚡ SLASH COMMAND HANDLER
// =========================
async function handleSlash(interaction, client) {

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    return safeReply(interaction, "❌ Commande introuvable.");
  }

  // =========================
  // 🛡️ VALIDATION
  // =========================
  if (typeof command.execute !== "function") {
    return safeReply(interaction, "❌ Commande invalide.");
  }

  // =========================
  // ⏱️ COOLDOWN SYSTEM
  // =========================
  const cooldownTime = command.cooldown || 3;
  const key = `${interaction.user.id}-${interaction.commandName}`;

  if (!cooldowns.has(key)) {
    cooldowns.set(key, Date.now());
  } else {
    const expire = cooldowns.get(key) + cooldownTime * 1000;

    if (Date.now() < expire) {
      const timeLeft = ((expire - Date.now()) / 1000).toFixed(1);

      return safeReply(interaction, `⏳ Attends ${timeLeft}s avant de réutiliser.`);
    }

    cooldowns.set(key, Date.now());
  }

  // =========================
  // 🔐 PERMISSIONS CHECK
  // =========================
  if (command.permissions) {

    if (!interaction.member.permissions.has(command.permissions)) {
      return safeReply(interaction, "❌ Permissions insuffisantes.");
    }
  }

  // =========================
  // 🚀 EXECUTION
  // =========================
  try {
    await command.execute(interaction, client);

  } catch (err) {

    console.log(`❌ Command error [${interaction.commandName}]`, err);

    // 📊 LOG ADMIN (optionnel)
    sendErrorLog(client, interaction, err);

    safeReply(interaction, "❌ Erreur lors de l’exécution.");
  }
}

// =========================
// 🔘 BUTTON HANDLER
// =========================
async function handleButton(interaction, client) {
  const id = interaction.customId;
  const ticketManager = require('../modules/ticketManager');
  const vEngine = require('../modules/verificationEngine');

  try {
    // --- GESTIONNAIRE DE TICKETS ---
    if (id === "create_ticket") {
      return await ticketManager.createTicket(interaction, client);
    }
    if (id === "claim_ticket") {
      return await ticketManager.claimTicket(interaction, client);
    }
    if (id === "close_ticket") {
      return await ticketManager.closeTicket(interaction, client);
    }
    if (id === "confirm_close_ticket") {
      return await ticketManager.confirmClose(interaction, client);
    }
    if (id === "cancel_close_ticket") {
      return await ticketManager.cancelClose(interaction, client);
    }
    if (id === "save_logs") {
      return await ticketManager.saveLogs(interaction, client);
    }

    // --- GESTIONNAIRE DE VÉRIFICATION ---
    if (id.startsWith('verify_btn_')) {
      return await vEngine.handleButton(interaction, client);
    }

  } catch (error) {
    console.error("❌ Erreur lors du clic sur le bouton :", error);
    return safeReply(interaction, "❌ Impossible de traiter cette action pour le moment.");
  }
}

// =========================
// 📜 SELECT MENU HANDLER
// =========================
async function handleSelectMenu(interaction, client) {
  // Optionnel : Vous pouvez ajouter d'autres fonctionnalités interactives ici si nécessaire.
  await interaction.reply({
    content: `📌 Choix sélectionné: ${interaction.values.join(", ")}`,
    ephemeral: true
  }).catch(() => {});
}

// =========================
// 📝 MODAL HANDLER
// =========================
async function handleModal(interaction, client) {
  const id = interaction.customId;
  const vEngine = require('../modules/verificationEngine');

  try {
    if (id.startsWith('verify_modal_')) {
      return await vEngine.handleModal(interaction, client);
    }
  } catch (error) {
    console.error("❌ Erreur lors de la soumission du modal :", error);
    return safeReply(interaction, "❌ Erreur de validation de formulaire.");
  }
}

// =========================
// 🧠 SAFE REPLY (anti crash)
// =========================
function safeReply(interaction, content) {

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ content, ephemeral: true }).catch(() => {});
  }

  return interaction.reply({ content, ephemeral: true }).catch(() => {});
}

// =========================
// 📊 ERROR LOG SYSTEM
// =========================
function sendErrorLog(client, interaction, error) {

  const logChannelId = process.env.ERROR_LOG_CHANNEL;
  if (!logChannelId) return;

  const channel = client.channels.cache.get(logChannelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("❌ Erreur commande")
    .addFields(
      { name: "Commande", value: interaction.commandName, inline: true },
      { name: "Utilisateur", value: interaction.user.tag, inline: true },
      { name: "Serveur", value: interaction.guild?.name || "DM", inline: true },
      { name: "Erreur", value: `\`\`\`${error.message.slice(0, 1000)}\`\`\`` }
    )
    .setTimestamp();

  channel.send({ embeds: [embed] }).catch(() => {});
}