/**
 * @file antiraid.js
 * @description Moteur de sécurité Anti-Raid, Anti-Bot et Anti-Spam de pointe.
 */

const { 
    EmbedBuilder, 
    PermissionsBitField, 
    AuditLogEvent,
    ChannelType 
} = require('discord.js');
const { getConfig } = require('./guildConfig');

// Mémoire de suivi des raids et spams
const recentJoins = new Map();       // guildId -> Array of timestamps
const messageTrackers = new Map();   // `${guildId}-${userId}` -> Array of { time, content }
const cooldowns = new Map();         // `${guildId}-${userId}` -> timestamp

/**
 * Envoie un embed de sécurité dans le salon de logs configuré
 */
async function sendSecurityLog(guild, embed, client) {
    try {
        const config = getConfig(guild.id);
        const logId = config.logChannel || process.env.LOG_CHANNEL_ID;
        if (!logId) return;

        const channel = guild.channels.cache.get(logId) || (await client.channels.fetch(logId).catch(() => null));
        if (channel && channel.isTextBased()) {
            await channel.send({ embeds: [embed] }).catch(() => {});
        }
    } catch (err) {
        console.error("Erreur sendSecurityLog:", err.message);
    }
}

/**
 * Vérifie si un membre est considéré comme membre du staff (immunisé)
 */
function isStaff(member) {
    if (!member || !member.permissions) return false;
    return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
           member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
           member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
           member.id === member.guild.ownerId;
}

/**
 * Détection et blocage de l'ajout non-autorisé de bots
 */
async function handleBotAdd(member, client) {
    if (!member.user.bot) return false;
    const guild = member.guild;

    try {
        // Attendre un instant pour que l'audit log soit disponible
        await new Promise(r => setTimeout(r, 1000));

        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.BotAdd,
            limit: 1
        }).catch(() => null);

        const entry = auditLogs?.entries?.first();
        const executor = entry?.executor;

        let authorized = false;
        if (executor) {
            if (executor.id === guild.ownerId) {
                authorized = true;
            } else {
                const execMember = await guild.members.fetch(executor.id).catch(() => null);
                if (execMember && execMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    authorized = true;
                }
            }
        }

        if (!authorized) {
            // Expulser le bot suspect
            if (member.kickable) {
                await member.kick("🚨 Anti-Bot : Ajout de bot non autorisé").catch(() => {});
            }

            const alertEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle("🚨 ALERTE SÉCURITÉ : BOT NON AUTORISÉ DÉTECTÉ")
                .setDescription(`Un bot a été ajouté sans autorisation administrateur et a été immédiatement exclu.`)
                .addFields(
                    { name: "🤖 Bot exclu", value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
                    { name: "👤 Ajouté par", value: executor ? `${executor.tag} (\`${executor.id}\`)` : "Inconnu", inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: "Protection • Système Anti-Bot", iconURL: client.user.displayAvatarURL() });

            await sendSecurityLog(guild, alertEmbed, client);
            return true;
        }
    } catch (e) {
        console.error("Erreur handleBotAdd:", e.message);
    }
    return false;
}

/**
 * Analyse des arrivées massives (Mass Join / Raid Mode)
 */
async function handleMemberJoin(member, client) {
    const guild = member.guild;
    const guildId = guild.id;
    const now = Date.now();

    // 1. Anti-Bot
    if (member.user.bot) {
        const kicked = await handleBotAdd(member, client);
        if (kicked) return;
    }

    // 2. Historique des arrivées
    let joins = recentJoins.get(guildId) || [];
    joins.push(now);
    joins = joins.filter(t => now - t < 15000); // 15 secondes
    recentJoins.set(guildId, joins);

    const config = getConfig(guildId);
    const raidThreshold = config.raidThreshold || 6;
    const accountAge = now - member.user.createdTimestamp;
    const isVeryYoung = accountAge < (24 * 60 * 60 * 1000); // moins de 24h

    // 3. Détection de Raid
    if (joins.length >= raidThreshold) {
        // ALERTE RAID EN COURS
        let actionTaken = "Surveillance renforcée";

        // Sanctionner les comptes suspects arrivant pendant le raid
        if (isVeryYoung && member.moderatable) {
            await member.timeout(60 * 60 * 1000, "🚨 Anti-Raid : Compte récent pendant un raid").catch(() => {});
            actionTaken = "Timeout 1h (compte < 24h)";
        }

        const raidEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("🚨 RAID DÉTECTÉ EN COURS !")
            .setDescription(`**${joins.length} membres** ont rejoint le serveur en moins de 15 secondes.`)
            .addFields(
                { name: "👤 Dernier membre", value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
                { name: "📅 Ancienneté", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: "🛡️ Mesure prise", value: actionTaken, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: "Protection • Système Anti-Raid" });

        await sendSecurityLog(guild, raidEmbed, client);
    }
}

/**
 * Filtre anti-spam, anti-pub (invitations) et anti-mass mentions sur les messages
 */
async function handleMessageSecurity(message, client) {
    if (!message.guild || message.author.bot) return;

    const member = message.member;
    if (!member) return;

    // Immuniser les membres du staff
    if (isStaff(member)) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const key = `${guildId}-${userId}`;
    const now = Date.now();
    const config = getConfig(guildId);

    // ===================================
    // 1. DÉTECTION LIENS D'INVITATION (Anti-Pub)
    // ===================================
    const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
    const hasInvite = inviteRegex.test(message.content);

    if (hasInvite && config.antiLink !== false) {
        await message.delete().catch(() => {});

        const warnMsg = await message.channel.send({
            content: `⚠️ ${message.author}, les invitations Discord ne sont pas autorisées ici.`
        }).catch(() => null);

        if (warnMsg) {
            setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
        }

        const logEmbed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle("🛡️ Anti-Pub : Invitation supprimée")
            .setDescription(`Un message contenant une invitation a été supprimé automatiquement.`)
            .addFields(
                { name: "👤 Auteur", value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
                { name: "📍 Salon", value: `<#${message.channel.id}>`, inline: true }
            )
            .setTimestamp();

        await sendSecurityLog(message.guild, logEmbed, client);
        return;
    }

    // ===================================
    // 2. DÉTECTION MASS MENTIONS
    // ===================================
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    const hasEveryone = message.content.includes('@everyone') || message.content.includes('@here');

    if (mentionCount >= 5 || (hasEveryone && !member.permissions.has(PermissionsBitField.Flags.MentionEveryone))) {
        await message.delete().catch(() => {});

        if (member.moderatable) {
            await member.timeout(10 * 60 * 1000, "🚨 Anti-Mass Mention").catch(() => {});
        }

        const alert = await message.channel.send({
            content: `🚨 ${message.author} a été mis en sourdine pour mention massive.`
        }).catch(() => null);
        if (alert) setTimeout(() => alert.delete().catch(() => {}), 5000);

        const logEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("🚨 Anti-Mass Mention Déclenché")
            .addFields(
                { name: "👤 Auteur", value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
                { name: "📍 Salon", value: `<#${message.channel.id}>`, inline: true },
                { name: "⚠️ Mentions", value: `${mentionCount}`, inline: true }
            )
            .setTimestamp();

        await sendSecurityLog(message.guild, logEmbed, client);
        return;
    }

    // ===================================
    // 3. ANTI-SPAM PAR FRÉQUENCE / RÉPÉTITION
    // ===================================
    if (cooldowns.has(key) && (now - cooldowns.get(key) < 15000)) {
        return; // Évite les spams de logs
    }

    if (!messageTrackers.has(key)) {
        messageTrackers.set(key, []);
    }

    const tracker = messageTrackers.get(key);
    const content = (message.content || "").trim();
    if (!content) return;

    tracker.push({ time: now, content });
    const recentMessages = tracker.filter(m => now - m.time < 7000); // 7 sec window
    messageTrackers.set(key, recentMessages);

    // Calcul du score de spam
    let score = recentMessages.length;
    const sameMessages = recentMessages.filter(m => m.content === content).length;
    score += (sameMessages - 1) * 2;

    if (score >= 6) {
        if (member.moderatable) {
            await member.timeout(2 * 60 * 1000, "Anti-Spam : Envoi excessif").catch(() => {});
        }

        const warnAlert = await message.channel.send({
            content: `⏳ ${message.author}, ralentis ! Tu as été temporairement mis en sourdine pour spam.`
        }).catch(() => null);
        if (warnAlert) setTimeout(() => warnAlert.delete().catch(() => {}), 5000);

        const logEmbed = new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle("⚠️ Anti-Spam Activé")
            .addFields(
                { name: "👤 Utilisateur", value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
                { name: "📍 Salon", value: `<#${message.channel.id}>`, inline: true },
                { name: "📊 Score de spam", value: `${score}`, inline: true }
            )
            .setTimestamp();

        await sendSecurityLog(message.guild, logEmbed, client);
        messageTrackers.delete(key);
        cooldowns.set(key, now);
    }

    // Nettoyage de mémoire périodique
    if (messageTrackers.size > 5000) {
        messageTrackers.clear();
    }
}

module.exports = {
    handleBotAdd,
    handleMemberJoin,
    handleMessageSecurity,
    sendSecurityLog,
    isStaff
};
