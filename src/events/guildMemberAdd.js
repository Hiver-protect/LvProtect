const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member, client) {

    try {

      const { getConfig } = require('../modules/guildConfig');
      const config = getConfig(member.guild.id) || {};

      const logChannel = client.channels.cache.get(config.logChannel);

      // =========================
      // 🧠 INIT CACHE GLOBAL
      // =========================
      if (!client.security) {
        client.security = {
          joins: new Map(),
          raidLevel: new Map()
        };
      }

      const now = Date.now();
      const guildId = member.guild.id;

      // =========================
      // ⏱️ AGE COMPTE
      // =========================
      const accountAge = now - member.user.createdTimestamp;

      const minAge = config.minAccountAge || 7 * 24 * 60 * 60 * 1000;
      const isNewAccount = accountAge < minAge;

      // =========================
      // 📊 DETECTION RAID TEMPS RÉEL
      // =========================
      let joins = client.security.joins.get(guildId) || [];

      joins.push(now);

      // Fenêtre 15 secondes (plus précis)
      joins = joins.filter(t => now - t < 15000);

      client.security.joins.set(guildId, joins);

      const raidThreshold = config.raidThreshold || 7;
      const raidDetected = joins.length >= raidThreshold;

      // =========================
      // 🧠 RISK SCORE (INTELLIGENT)
      // =========================
      let risk = 0;

      if (isNewAccount) risk += 40;
      if (raidDetected) risk += 50;
      if (member.user.bot) risk += 30;

      // bonus si compte très récent (<1 jour)
      if (accountAge < 24 * 60 * 60 * 1000) risk += 30;

      // =========================
      // 🚨 RAID LEVEL SYSTEM
      // =========================
      let raidLevel = client.security.raidLevel.get(guildId) || 0;

      if (raidDetected) {
        raidLevel++;
      } else {
        raidLevel = Math.max(raidLevel - 1, 0);
      }

      client.security.raidLevel.set(guildId, raidLevel);

      // =========================
      // 🔥 ACTIONS INTELLIGENTES
      // =========================
      let action = "Aucune";

      if (risk >= 80) {
        action = "KICK";
        await member.kick("🚨 Sécurité anti-raid").catch(() => {});
      }

      else if (risk >= 50) {
        action = "TIMEOUT";
        await member.timeout(10 * 60 * 1000, "⚠️ Compte suspect").catch(() => {});
      }

      // =========================
      // 🔒 LOCKDOWN AUTO
      // =========================
      if (raidLevel >= 3 && config.lockdownOnRaid) {

        for (const channel of member.guild.channels.cache.values()) {

          if (!channel.permissionOverwrites) continue;

          await channel.permissionOverwrites.edit(member.guild.roles.everyone, {
            SendMessages: false
          }).catch(() => {});
        }

        if (logChannel) {
          logChannel.send("🚨 **LOCKDOWN AUTO ACTIVÉ (anti-raid)**");
        }
      }

      // =========================
      // 📊 EMBED LOG PRO
      // =========================
      if (logChannel) {

        const embed = new EmbedBuilder()
          .setColor(
            risk >= 80 ? 0xe74c3c :
            risk >= 50 ? 0xf1c40f :
            0x2ecc71
          )

          .setTitle(
            risk >= 80 ? "🚨 Menace détectée" :
            risk >= 50 ? "⚠️ Utilisateur suspect" :
            "👤 Nouveau membre"
          )

          .setThumbnail(member.user.displayAvatarURL())

          .addFields(
            {
              name: "👤 Utilisateur",
              value: `${member.user.tag}\nID: ${member.id}`,
              inline: true
            },
            {
              name: "📅 Compte",
              value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
              inline: true
            },
            {
              name: "📊 Risk Score",
              value: `${risk}%`,
              inline: true
            },
            {
              name: "🚨 Raid",
              value: `${raidDetected ? "Oui" : "Non"} (${joins.length}/${raidThreshold})`,
              inline: true
            },
            {
              name: "🔥 Niveau Raid",
              value: `${raidLevel}`,
              inline: true
            },
            {
              name: "⚙️ Action",
              value: action,
              inline: true
            }
          )

          .setFooter({
            text: "HiverGuard • Security System",
            iconURL: client.user.displayAvatarURL()
          })

          .setTimestamp();

        logChannel.send({ embeds: [embed] }).catch(() => {});
      }

      // =========================
      // 🤖 VERIFICATION
      // =========================
      try {
        const verification = require('../modules/verification');

        if (verification?.startVerification) {
          await verification.startVerification(member, client);
        }
      } catch {}

    } catch (err) {
      console.log("❌ guildMemberAdd error:", err.message);
    }
  }
};