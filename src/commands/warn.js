const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { sendSecurityLog } = require('../modules/antiraid');

const warnsPath = path.join(process.cwd(), 'data', 'warns.json');

function loadWarns() {
    try {
        if (!fs.existsSync(warnsPath)) {
            const dir = path.dirname(warnsPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(warnsPath, '{}', 'utf8');
            return {};
        }
        return JSON.parse(fs.readFileSync(warnsPath, 'utf8') || '{}');
    } catch {
        return {};
    }
}

function saveWarns(data) {
    try {
        const dir = path.dirname(warnsPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(warnsPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error("Erreur saveWarns:", e);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('⚠️ Système de gestion des avertissements')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        
        // Sous-commande : Ajouter un avertissement
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Avertir un membre')
                .addUserOption(opt => opt.setName('membre').setDescription('Membre à avertir').setRequired(true))
                .addStringOption(opt => opt.setName('raison').setDescription('Raison de l\'avertissement').setRequired(false)))

        // Sous-commande : Voir les avertissements
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Voir la liste des avertissements d\'un membre')
                .addUserOption(opt => opt.setName('membre').setDescription('Membre concerné').setRequired(true)))

        // Sous-commande : Effacer les avertissements
        .addSubcommand(sub =>
            sub.setName('clear')
                .setDescription('Effacer tous les avertissements d\'un membre')
                .addUserOption(opt => opt.setName('membre').setDescription('Membre concerné').setRequired(true))),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('membre');
        const guildId = interaction.guild.id;
        const allWarns = loadWarns();

        if (!allWarns[guildId]) allWarns[guildId] = {};
        if (!allWarns[guildId][targetUser.id]) allWarns[guildId][targetUser.id] = [];

        const userWarns = allWarns[guildId][targetUser.id];

        // =========================
        // 1. LISTE DES WARNS
        // =========================
        if (sub === 'list') {
            if (userWarns.length === 0) {
                return interaction.reply({
                    content: `ℹ️ **${targetUser.tag}** n'a aucun avertissement enregistré sur ce serveur.`,
                    ephemeral: true
                });
            }

            const listEmbed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setTitle(`📋 Avertissements de ${targetUser.tag}`)
                .setDescription(`Total : **${userWarns.length}** avertissement(s)`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            userWarns.slice(-10).forEach((w, index) => {
                listEmbed.addFields({
                    name: `#${index + 1} • Le ${new Date(w.date).toLocaleDateString('fr-FR')}`,
                    value: `📝 **Raison :** ${w.reason}\n👮 **Modérateur :** <@${w.moderator}>`
                });
            });

            return interaction.reply({ embeds: [listEmbed], ephemeral: true });
        }

        // =========================
        // 2. EFFACER LES WARNS
        // =========================
        if (sub === 'clear') {
            const count = userWarns.length;
            allWarns[guildId][targetUser.id] = [];
            saveWarns(allWarns);

            const clearEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("🧹 Avertissements Effacés")
                .setDescription(`Tous les avertissements (**${count}**) de **${targetUser.tag}** ont été supprimés.`)
                .setTimestamp();

            return interaction.reply({ embeds: [clearEmbed], ephemeral: true });
        }

        // =========================
        // 3. AJOUTER UN WARN
        // =========================
        if (sub === 'add') {
            const reason = interaction.options.getString('raison') || "Aucune raison fournie";
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            if (targetUser.id === interaction.user.id) {
                return interaction.reply({ content: "❌ Tu ne peux pas t'avertir toi-même.", ephemeral: true });
            }
            if (targetUser.id === client.user.id) {
                return interaction.reply({ content: "❌ Je ne peux pas m'avertir moi-même.", ephemeral: true });
            }
            if (member && member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: "❌ Impossible d'avertir un administrateur.", ephemeral: true });
            }

            const warnRecord = {
                id: Date.now(),
                reason,
                date: new Date().toISOString(),
                moderator: interaction.user.id
            };

            userWarns.push(warnRecord);
            saveWarns(allWarns);

            const warnCount = userWarns.length;
            let autoSanction = "Aucune";

            // Paliers automatiques de sécurité
            if (member && member.moderatable) {
                if (warnCount === 3) {
                    await member.timeout(10 * 60 * 1000, "3 warns atteints - Timeout automatique").catch(() => {});
                    autoSanction = "Timeout 10 minutes (Palier 3)";
                } else if (warnCount === 5) {
                    await member.timeout(60 * 60 * 1000, "5 warns atteints - Timeout lourd").catch(() => {});
                    autoSanction = "Timeout 1 heure (Palier 5)";
                } else if (warnCount >= 7) {
                    await member.kick("7 warns atteints - Expulsion automatique").catch(() => {});
                    autoSanction = "Expulsion automatique (Palier 7+)";
                }
            }

            // Notification MP
            const dmEmbed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setTitle(`⚠️ Avertissement reçu sur ${interaction.guild.name}`)
                .addFields(
                    { name: "📝 Raison", value: reason },
                    { name: "📊 Total avertissements", value: `${warnCount}` }
                )
                .setFooter({ text: "Merci de respecter les règles du serveur." })
                .setTimestamp();

            await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});

            // Réponse modérateur
            const successEmbed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle("⚠️ Avertissement Appliqué")
                .setDescription(`**${targetUser.tag}** a reçu un avertissement.`)
                .addFields(
                    { name: "📝 Raison", value: reason, inline: true },
                    { name: "📊 Total", value: `${warnCount} avertissement(s)`, inline: true },
                    { name: "🛡️ Sanction automatique", value: autoSanction, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            // Log de sécurité
            const logEmbed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle("⚠️ Modération : Avertissement (Warn)")
                .addFields(
                    { name: "👤 Cible", value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                    { name: "👮 Modérateur", value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
                    { name: "📝 Raison", value: reason, inline: false },
                    { name: "📊 Total", value: `${warnCount}`, inline: true },
                    { name: "⚙️ Action automatique", value: autoSanction, inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            await sendSecurityLog(interaction.guild, logEmbed, client);
        }
    }
};
