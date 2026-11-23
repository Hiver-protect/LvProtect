const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const warns = new Map(); 
// structure future-ready: userId -> [{id, reason, date, moderator}]

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Avertir un membre')
        .addUserOption(opt =>
            opt.setName('membre')
                .setDescription('Utilisateur à avertir')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('raison')
                .setDescription('Raison du warn')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {

        const user = interaction.options.getUser('membre');
        const reason = interaction.options.getString('raison') || "Aucune raison fournie";

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                content: "❌ Membre introuvable.",
                ephemeral: true
            });
        }

        // =========================
        // 🛡️ PROTECTION STAFF
        // =========================
        if (user.id === interaction.user.id) {
            return interaction.reply({
                content: "❌ Auto-warn interdit.",
                ephemeral: true
            });
        }

        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: "❌ Impossible de warn un administrateur.",
                ephemeral: true
            });
        }

        // =========================
        // 🧠 INIT SYSTEM
        // =========================
        if (!warns.has(user.id)) {
            warns.set(user.id, []);
        }

        const userWarns = warns.get(user.id);

        const warnData = {
            id: Date.now(),
            reason,
            date: new Date(),
            moderator: interaction.user.id
        };

        userWarns.push(warnData);

        const warnCount = userWarns.length;

        // =========================
        // 📊 PALIERS AUTOMATIQUES
        // =========================
        try {

            if (member.moderatable) {

                // 3 warns → mute court
                if (warnCount === 3) {
                    await member.timeout(10 * 60 * 1000, "3 warns auto-sanction");
                }

                // 5 warns → mute long
                if (warnCount === 5) {
                    await member.timeout(60 * 60 * 1000, "5 warns sanction lourde");
                }

                // 7 warns → kick (option sévère)
                if (warnCount === 7) {
                    await member.kick("7 warns - expulsion automatique").catch(() => {});
                }
            }

        } catch {}

        // =========================
        // 📩 DM PRO
        // =========================
        try {
            const embedDM = new EmbedBuilder()
                .setColor(0xffcc00)
                .setTitle("⚠️ Avertissement reçu")
                .setDescription(`Tu as été averti sur **${interaction.guild.name}**`)
                .addFields(
                    { name: "📌 Raison", value: reason },
                    { name: "📊 Total warns", value: `${warnCount}` }
                )
                .setFooter({ text: "Respecte les règles du serveur" })
                .setTimestamp();

            await user.send({ embeds: [embedDM] }).catch(() => {});
        } catch {}

        // =========================
        // 📢 RESPONSE CLEAN
        // =========================
        await interaction.reply({
            content:
                `⚠️ **Warn appliqué avec succès**\n` +
                `👤 Utilisateur: ${user.tag}\n` +
                `📌 Raison: ${reason}\n` +
                `📊 Total warns: **${warnCount}**`,
            ephemeral: true
        });

        // =========================
        // 📜 LOG ULTRA DÉTAILLÉ
        // =========================
        const logChannel = interaction.guild.channels.cache.find(c =>
            c.name === "logs" || c.name === "mod-log"
        );

        if (logChannel) {

            const embedLog = new EmbedBuilder()
                .setColor(0xff9900)
                .setTitle("📌 Warn enregistré")
                .addFields(
                    { name: "👤 Utilisateur", value: `${user.tag} (${user.id})` },
                    { name: "🛡️ Modérateur", value: `${interaction.user.tag}` },
                    { name: "📌 Raison", value: reason },
                    { name: "📊 Total warns", value: `${warnCount}` },
                    { name: "🆔 Warn ID", value: `${warnData.id}` }
                )
                .setFooter({ text: "HiverGuard Moderation System" })
                .setTimestamp();

            logChannel.send({ embeds: [embedLog] }).catch(() => {});
        }
    }
};