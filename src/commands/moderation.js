const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ChannelType 
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const { sendSecurityLog } = require('../modules/antiraid');
const store = require('../modules/lockdownStore');

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
        .setName('moderation')
        .setDescription('Commandes de modération du serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        
        // --- 1. BAN ---
        .addSubcommand(sub =>
            sub.setName('ban')
                .setDescription('Bannir un membre du serveur')
                .addUserOption(opt => opt.setName('membre').setDescription('Membre à bannir').setRequired(true))
                .addStringOption(opt => opt.setName('raison').setDescription('Raison de la sanction').setRequired(false)))

        // --- 2. KICK ---
        .addSubcommand(sub =>
            sub.setName('kick')
                .setDescription('Expulser un membre du serveur')
                .addUserOption(opt => opt.setName('membre').setDescription('Membre à expulser').setRequired(true))
                .addStringOption(opt => opt.setName('raison').setDescription('Raison de la sanction').setRequired(false)))

        // --- 3. MUTE ---
        .addSubcommand(sub =>
            sub.setName('mute')
                .setDescription('Mettre un membre en sourdine')
                .addUserOption(opt => opt.setName('membre').setDescription('Membre à sanctionner').setRequired(true))
                .addIntegerOption(opt => 
                    opt.setName('duree')
                        .setDescription('Durée de la mise en sourdine')
                        .setRequired(true)
                        .addChoices(
                            { name: '1 minute', value: 1 },
                            { name: '5 minutes', value: 5 },
                            { name: '10 minutes', value: 10 },
                            { name: '1 heure', value: 60 },
                            { name: '1 jour', value: 1440 },
                            { name: '1 semaine', value: 10080 }
                        ))
                .addStringOption(opt => opt.setName('raison').setDescription('Raison de la sanction').setRequired(false)))

        // --- 4. UNMUTE ---
        .addSubcommand(sub =>
            sub.setName('unmute')
                .setDescription('Rétablir la parole d\'un membre')
                .addUserOption(opt => opt.setName('membre').setDescription('Membre à rétablir').setRequired(true))
                .addStringOption(opt => opt.setName('raison').setDescription('Raison de la levée').setRequired(false)))

        // --- 5. WARN ---
        .addSubcommand(sub =>
            sub.setName('warn')
                .setDescription('Avertir un membre')
                .addUserOption(opt => opt.setName('membre').setDescription('Membre à avertir').setRequired(true))
                .addStringOption(opt => opt.setName('raison').setDescription('Raison de l\'avertissement').setRequired(false)))

        // --- 6. WARNS (LIST) ---
        .addSubcommand(sub =>
            sub.setName('warns')
                .setDescription('Afficher les avertissements d\'un membre')
                .addUserOption(opt => opt.setName('membre').setDescription('Membre concerné').setRequired(true)))

        // --- 7. CLEARWARNS ---
        .addSubcommand(sub =>
            sub.setName('clearwarns')
                .setDescription('Effacer les avertissements d\'un membre')
                .addUserOption(opt => opt.setName('membre').setDescription('Membre concerné').setRequired(true)))

        // --- 8. PURGE ---
        .addSubcommand(sub =>
            sub.setName('purge')
                .setDescription('Supprimer des messages récents')
                .addIntegerOption(opt => opt.setName('nombre').setDescription('Nombre de messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
                .addUserOption(opt => opt.setName('utilisateur').setDescription('Filtrer par utilisateur').setRequired(false)))

        // --- 9. LOCKDOWN ---
        .addSubcommand(sub =>
            sub.setName('lockdown')
                .setDescription('Verrouiller les salons du serveur')
                .addStringOption(opt => opt.setName('raison').setDescription('Raison du confinement').setRequired(false)))

        // --- 10. UNLOCK ---
        .addSubcommand(sub =>
            sub.setName('unlock')
                .setDescription('Déverrouiller les salons du serveur')),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const guild = interaction.guild;
        const executor = interaction.member;

        // ==========================================
        // 🔨 1. BAN
        // ==========================================
        if (sub === 'ban') {
            if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interaction.reply({ content: "❌ Tu n'as pas la permission de bannir des membres.", ephemeral: true });
            }

            const targetUser = interaction.options.getUser('membre');
            const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';

            if (targetUser.id === interaction.user.id) return interaction.reply({ content: "❌ Tu ne peux pas te bannir toi-même.", ephemeral: true });
            if (targetUser.id === client.user.id) return interaction.reply({ content: "❌ Je ne peux pas me bannir moi-même.", ephemeral: true });
            if (targetUser.id === guild.ownerId) return interaction.reply({ content: "❌ Impossible de bannir le propriétaire du serveur.", ephemeral: true });

            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (targetMember) {
                if (executor.id !== guild.ownerId && targetMember.roles.highest.position >= executor.roles.highest.position) {
                    return interaction.reply({ content: "❌ Ce membre a un rôle supérieur ou égal au tien.", ephemeral: true });
                }
                if (!targetMember.bannable) {
                    return interaction.reply({ content: "❌ Le bot n'a pas les permissions suffisantes pour bannir ce membre.", ephemeral: true });
                }

                // DM
                const dmEmbed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle(`🔨 Tu as été banni de ${guild.name}`)
                    .addFields(
                        { name: "👮 Modérateur", value: interaction.user.tag, inline: true },
                        { name: "📝 Raison", value: reason, inline: true }
                    )
                    .setTimestamp();
                await targetMember.send({ embeds: [dmEmbed] }).catch(() => {});
            }

            await guild.members.ban(targetUser.id, { reason: `[Par ${interaction.user.tag}] ${reason}` });

            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("✅ Membre Banni")
                .setDescription(`**${targetUser.tag}** (\`${targetUser.id}\`) a été banni avec succès.`)
                .addFields({ name: "📝 Raison", value: reason })
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            const logEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle("🔨 Modération : Bannissement")
                .addFields(
                    { name: "👤 Cible", value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                    { name: "👮 Modérateur", value: `${interaction.user.tag}`, inline: true },
                    { name: "📝 Raison", value: reason, inline: false }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            return sendSecurityLog(guild, logEmbed, client);
        }

        // ==========================================
        // 👢 2. KICK
        // ==========================================
        if (sub === 'kick') {
            if (!executor.permissions.has(PermissionFlagsBits.KickMembers)) {
                return interaction.reply({ content: "❌ Tu n'as pas la permission d'expulser des membres.", ephemeral: true });
            }

            const targetUser = interaction.options.getUser('membre');
            const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';

            if (targetUser.id === interaction.user.id) return interaction.reply({ content: "❌ Tu ne peux pas t'expulser toi-même.", ephemeral: true });
            if (targetUser.id === guild.ownerId) return interaction.reply({ content: "❌ Impossible d'expulser le propriétaire.", ephemeral: true });

            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) return interaction.reply({ content: "❌ Ce membre n'est pas sur le serveur.", ephemeral: true });

            if (executor.id !== guild.ownerId && targetMember.roles.highest.position >= executor.roles.highest.position) {
                return interaction.reply({ content: "❌ Ce membre a un rôle supérieur ou égal au tien.", ephemeral: true });
            }
            if (!targetMember.kickable) {
                return interaction.reply({ content: "❌ Permissions insuffisantes pour expulser ce membre.", ephemeral: true });
            }

            const dmEmbed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle(`👢 Tu as été expulsé de ${guild.name}`)
                .addFields(
                    { name: "👮 Modérateur", value: interaction.user.tag, inline: true },
                    { name: "📝 Raison", value: reason, inline: true }
                )
                .setTimestamp();
            await targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

            await targetMember.kick(`[Par ${interaction.user.tag}] ${reason}`);

            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("✅ Membre Expulsé")
                .setDescription(`**${targetUser.tag}** a été expulsé avec succès.`)
                .addFields({ name: "📝 Raison", value: reason })
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            const logEmbed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle("👢 Modération : Expulsion")
                .addFields(
                    { name: "👤 Cible", value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                    { name: "👮 Modérateur", value: `${interaction.user.tag}`, inline: true },
                    { name: "📝 Raison", value: reason, inline: false }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            return sendSecurityLog(guild, logEmbed, client);
        }

        // ==========================================
        // 🔇 3. MUTE
        // ==========================================
        if (sub === 'mute') {
            const targetUser = interaction.options.getUser('membre');
            const minutes = interaction.options.getInteger('duree');
            const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';

            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });

            if (executor.id !== guild.ownerId && targetMember.roles.highest.position >= executor.roles.highest.position) {
                return interaction.reply({ content: "❌ Ce membre a un rôle supérieur ou égal au tien.", ephemeral: true });
            }
            if (!targetMember.moderatable) {
                return interaction.reply({ content: "❌ Impossible de mettre ce membre en sourdine.", ephemeral: true });
            }

            await targetMember.timeout(minutes * 60 * 1000, `[Par ${interaction.user.tag}] ${reason}`);

            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("🔇 Membre Mis en Sourdine")
                .setDescription(`**${targetUser.tag}** a été mute pendant **${minutes} minute(s)**.`)
                .addFields({ name: "📝 Raison", value: reason })
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            const logEmbed = new EmbedBuilder()
                .setColor(0xf1c40f)
                .setTitle("🔇 Modération : Timeout / Mute")
                .addFields(
                    { name: "👤 Cible", value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                    { name: "👮 Modérateur", value: `${interaction.user.tag}`, inline: true },
                    { name: "⏱️ Durée", value: `${minutes} min`, inline: true },
                    { name: "📝 Raison", value: reason, inline: false }
                )
                .setTimestamp();

            return sendSecurityLog(guild, logEmbed, client);
        }

        // ==========================================
        // 🔊 4. UNMUTE
        // ==========================================
        if (sub === 'unmute') {
            const targetUser = interaction.options.getUser('membre');
            const reason = interaction.options.getString('raison') || 'Sanction levée';

            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) return interaction.reply({ content: "❌ Membre introuvable.", ephemeral: true });

            if (!targetMember.communicationDisabledUntilTimestamp || targetMember.communicationDisabledUntilTimestamp < Date.now()) {
                return interaction.reply({ content: "⚠️ Ce membre n'est actuellement pas mute.", ephemeral: true });
            }

            await targetMember.timeout(null, `[Par ${interaction.user.tag}] ${reason}`);

            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("🔊 Sourdine Levée")
                .setDescription(`**${targetUser.tag}** n'est plus en sourdine.`)
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            const logEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("🔊 Modération : Unmute")
                .addFields(
                    { name: "👤 Cible", value: `${targetUser.tag}`, inline: true },
                    { name: "👮 Modérateur", value: `${interaction.user.tag}`, inline: true }
                )
                .setTimestamp();

            return sendSecurityLog(guild, logEmbed, client);
        }

        // ==========================================
        // ⚠️ 5. WARN
        // ==========================================
        if (sub === 'warn') {
            const targetUser = interaction.options.getUser('membre');
            const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
            const member = await guild.members.fetch(targetUser.id).catch(() => null);

            if (targetUser.id === interaction.user.id) return interaction.reply({ content: "❌ Auto-warn interdit.", ephemeral: true });
            if (member && member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: "❌ Impossible d'avertir un administrateur.", ephemeral: true });
            }

            const allWarns = loadWarns();
            if (!allWarns[guild.id]) allWarns[guild.id] = {};
            if (!allWarns[guild.id][targetUser.id]) allWarns[guild.id][targetUser.id] = [];

            allWarns[guild.id][targetUser.id].push({
                id: Date.now(),
                reason,
                date: new Date().toISOString(),
                moderator: interaction.user.id
            });
            saveWarns(allWarns);

            const count = allWarns[guild.id][targetUser.id].length;
            let autoAction = "Aucune";

            if (member && member.moderatable) {
                if (count === 3) {
                    await member.timeout(10 * 60 * 1000, "3 warns auto-sanction").catch(() => {});
                    autoAction = "Timeout 10m (Palier 3)";
                } else if (count === 5) {
                    await member.timeout(60 * 60 * 1000, "5 warns auto-sanction").catch(() => {});
                    autoAction = "Timeout 1h (Palier 5)";
                } else if (count >= 7) {
                    await member.kick("7 warns auto-expulsion").catch(() => {});
                    autoAction = "Expulsion (Palier 7+)";
                }
            }

            const dmEmbed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setTitle(`⚠️ Avertissement reçu sur ${guild.name}`)
                .addFields(
                    { name: "📝 Raison", value: reason },
                    { name: "📊 Total avertissements", value: `${count}` }
                )
                .setTimestamp();
            await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});

            const successEmbed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle("⚠️ Avertissement Enregistré")
                .setDescription(`**${targetUser.tag}** a reçu un warn.`)
                .addFields(
                    { name: "📝 Raison", value: reason, inline: true },
                    { name: "📊 Total", value: `${count} warn(s)`, inline: true },
                    { name: "⚙️ Sanction automatique", value: autoAction, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            const logEmbed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle("⚠️ Modération : Warn")
                .addFields(
                    { name: "👤 Cible", value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                    { name: "👮 Modérateur", value: `${interaction.user.tag}`, inline: true },
                    { name: "📝 Raison", value: reason, inline: false },
                    { name: "📊 Total", value: `${count}`, inline: true },
                    { name: "⚙️ Action auto", value: autoAction, inline: true }
                )
                .setTimestamp();

            return sendSecurityLog(guild, logEmbed, client);
        }

        // ==========================================
        // 📋 6. WARNS (LIST)
        // ==========================================
        if (sub === 'warns') {
            const targetUser = interaction.options.getUser('membre');
            const allWarns = loadWarns();
            const list = allWarns[guild.id]?.[targetUser.id] || [];

            if (list.length === 0) {
                return interaction.reply({ content: `ℹ️ **${targetUser.tag}** n'a aucun avertissement.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setTitle(`📋 Avertissements de ${targetUser.tag}`)
                .setDescription(`Total : **${list.length}** avertissement(s)`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            list.slice(-10).forEach((w, i) => {
                embed.addFields({
                    name: `#${i + 1} • Le ${new Date(w.date).toLocaleDateString('fr-FR')}`,
                    value: `📝 **Raison :** ${w.reason}\n👮 **Modérateur :** <@${w.moderator}>`
                });
            });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ==========================================
        // 🧹 7. CLEARWARNS
        // ==========================================
        if (sub === 'clearwarns') {
            const targetUser = interaction.options.getUser('membre');
            const allWarns = loadWarns();
            const count = allWarns[guild.id]?.[targetUser.id]?.length || 0;

            if (allWarns[guild.id]?.[targetUser.id]) {
                delete allWarns[guild.id][targetUser.id];
                saveWarns(allWarns);
            }

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("🧹 Avertissements Effacés")
                .setDescription(`**${count}** avertissement(s) de **${targetUser.tag}** ont été supprimés.`)
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ==========================================
        // 🧹 8. PURGE
        // ==========================================
        if (sub === 'purge') {
            if (!executor.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ content: "❌ Tu n'as pas la permission de gérer les messages.", ephemeral: true });
            }

            const amount = interaction.options.getInteger('nombre');
            const filterUser = interaction.options.getUser('utilisateur');
            const channel = interaction.channel;

            await interaction.deferReply({ ephemeral: true });

            const messages = await channel.messages.fetch({ limit: 100 });
            const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
            let targetMessages = messages.filter(m => m.createdTimestamp > twoWeeksAgo);

            if (filterUser) {
                targetMessages = targetMessages.filter(m => m.author.id === filterUser.id);
            }

            const toDelete = Array.from(targetMessages.values()).slice(0, amount);
            if (toDelete.length === 0) {
                return interaction.editReply({ content: "⚠️ Aucun message récent (< 14 jours) à supprimer." });
            }

            const deleted = await channel.bulkDelete(toDelete, true);

            const embed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("🧹 Nettoyage Effectué")
                .setDescription(`**${deleted.size} message(s)** supprimés avec succès.`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            const logEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("🧹 Modération : Purge")
                .addFields(
                    { name: "📍 Salon", value: `<#${channel.id}>`, inline: true },
                    { name: "👮 Modérateur", value: `${interaction.user.tag}`, inline: true },
                    { name: "🗑️ Messages supprimés", value: `${deleted.size}`, inline: true }
                )
                .setTimestamp();

            return sendSecurityLog(guild, logEmbed, client);
        }

        // ==========================================
        // 🔒 9. LOCKDOWN
        // ==========================================
        if (sub === 'lockdown') {
            if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: "❌ Seuls les administrateurs peuvent déclencher le lockdown.", ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: true });
            const reason = interaction.options.getString('raison') || "Mesure de sécurité";
            const data = store.load();

            if (data[guild.id]) {
                return interaction.editReply({ content: "⚠️ Un confinement est déjà actif." });
            }

            data[guild.id] = {};
            let count = 0;

            for (const ch of guild.channels.cache.values()) {
                if (ch.type !== ChannelType.GuildText) continue;
                await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false, AddReactions: false }).catch(() => {});
                count++;
            }

            store.save(data);

            const alertEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle("🚨 CONFINEMENT DU SERVEUR (LOCKDOWN) 🚨")
                .setDescription("L'envoi de messages est temporairement suspendu pour la sécurité du serveur.")
                .addFields({ name: "📝 Raison", value: reason })
                .setTimestamp();

            const sysCh = guild.systemChannel || guild.channels.cache.find(c => c.type === ChannelType.GuildText);
            if (sysCh) await sysCh.send({ embeds: [alertEmbed] }).catch(() => {});

            await interaction.editReply({ content: `🔒 **${count} salons** verrouillés.` });

            const logEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle("🚨 Alerte Admin : Lockdown Déclenché")
                .addFields(
                    { name: "👮 Admin", value: `${interaction.user.tag}`, inline: true },
                    { name: "🔒 Salons", value: `${count}`, inline: true },
                    { name: "📝 Raison", value: reason, inline: false }
                )
                .setTimestamp();

            return sendSecurityLog(guild, logEmbed, client);
        }

        // ==========================================
        // 🔓 10. UNLOCK
        // ==========================================
        if (sub === 'unlock') {
            if (!executor.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: "❌ Seuls les administrateurs peuvent lever le lockdown.", ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: true });
            const data = store.load();

            if (!data[guild.id]) {
                return interaction.editReply({ content: "⚠️ Aucun confinement actif sur ce serveur." });
            }

            let count = 0;
            for (const ch of guild.channels.cache.values()) {
                if (ch.type !== ChannelType.GuildText) continue;
                await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null, AddReactions: null }).catch(() => {});
                count++;
            }

            delete data[guild.id];
            store.save(data);

            const liftEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("✅ CONFINEMENT TERMINÉ (UNLOCK) ✅")
                .setDescription("Le serveur a été déverrouillé. Vous pouvez à nouveau discuter normalement.")
                .setTimestamp();

            const sysCh = guild.systemChannel || guild.channels.cache.find(c => c.type === ChannelType.GuildText);
            if (sysCh) await sysCh.send({ embeds: [liftEmbed] }).catch(() => {});

            await interaction.editReply({ content: `🔓 **${count} salons** déverrouillés.` });

            const logEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("🔓 Alerte Admin : Lockdown Levé")
                .addFields(
                    { name: "👮 Admin", value: `${interaction.user.tag}`, inline: true },
                    { name: "🔓 Salons", value: `${count}`, inline: true }
                )
                .setTimestamp();

            return sendSecurityLog(guild, logEmbed, client);
        }
    }
};
