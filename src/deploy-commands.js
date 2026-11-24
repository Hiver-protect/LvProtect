const { REST, Routes } = require('discord.js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let isDeploying = false;
let queue = false;

const CACHE_FILE = path.join(process.cwd(), "deployCache.json");

module.exports = {
  name: 'deploy-commands',
  description: 'Déploiement SLASH COMMANDS PRO MAX',

  async execute(client) {

    if (isDeploying) {
      console.log("⏳ Deploy déjà en cours → mise en file");
      queue = true;
      return;
    }

    isDeploying = true;

    try {

      // =========================
      // 📦 BUILD COMMANDS SAFE
      // =========================
      const commands = [];

      for (const cmd of client.commands.values()) {
        try {
          if (cmd?.data?.toJSON) {
            const json = cmd.data.toJSON();

            // 🔒 validation minimale
            if (!json.name || !json.description) {
              console.log(`⚠️ Commande invalide skip: ${json.name}`);
              continue;
            }

            commands.push(json);
          }
        } catch (e) {
          console.log(`⚠️ Erreur commande: ${cmd?.data?.name}`);
        }
      }

      if (!commands.length) {
        console.log("❌ Aucune commande valide");
        return;
      }

      // 🔥 tri stable (évite faux hash)
      commands.sort((a, b) => a.name.localeCompare(b.name));

      // =========================
      // 🧠 HASH PERSISTANT
      // =========================
      const hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(commands))
        .digest('hex');

      let lastHash = null;

      if (fs.existsSync(CACHE_FILE)) {
        try {
          lastHash = JSON.parse(fs.readFileSync(CACHE_FILE)).hash;
        } catch {}
      }

      if (hash === lastHash) {
        console.log("♻️ Aucun changement → deploy skip");
        return;
      }

      // =========================
      // 🔐 CONFIG SAFE
      // =========================
      const CLIENT_ID = process.env.CLIENT_ID || client.application?.id;
      const TOKEN = process.env.DISCORD_TOKEN;
      const GUILD_ID = process.env.GUILD_ID;

      if (!CLIENT_ID || !TOKEN) {
        console.log("❌ CONFIG manquante (CLIENT_ID / TOKEN)");
        return;
      }

      const rest = new REST({ version: '10' }).setToken(TOKEN);

      console.log(`🚀 Deploy ${commands.length} commandes`);

      // =========================
      // 📊 DIFF LOG (DEBUG PRO)
      // =========================
      if (lastHash) {
        console.log("🧠 Changement détecté → redeploy");
      }

      // =========================
      // 🔁 DEPLOY AVEC RETRY EXPONENTIEL
      // =========================
      const deploy = async (attempt = 1) => {
        try {

          if (GUILD_ID) {
            console.log(`⚡ GUILD MODE → ${GUILD_ID}`);

            // 1. Déploiement sur la guilde cible
            await rest.put(
              Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
              { body: commands }
            );

            // 2. Nettoyage du global pour éviter les doublons
            await rest.put(
              Routes.applicationCommands(CLIENT_ID),
              { body: [] }
            ).catch(() => {});

            console.log("✅ Deploy GUILD unique OK (anti-doublon actif)");

          } else {
            console.log("🌍 GLOBAL MODE → Nettoyage des doublons et déploiement unique...");

            // 1. Déploiement officiel unique en mode Global
            await rest.put(
              Routes.applicationCommands(CLIENT_ID),
              { body: commands }
            );
            console.log(`✅ ${commands.length} commande(s) globale(s) enregistrée(s).`);

            // 2. Nettoyage absolu des anciennes commandes de guilde (Supprime définitivement les doublons)
            let guilds = [];
            try {
              const fetchedGuilds = await client.guilds.fetch();
              guilds = Array.from(fetchedGuilds.values());
            } catch {
              guilds = Array.from(client.guilds.cache.values());
            }

            for (const guild of guilds) {
              try {
                await rest.put(
                  Routes.applicationGuildCommands(CLIENT_ID, guild.id),
                  { body: [] }
                );
                console.log(`🧹 Doublons purgés sur le serveur : ${guild.name || guild.id} (${guild.id})`);
              } catch (gErr) {
                // Ignore silencieux
              }
            }
            console.log("✨ Anti-doublon réussi : chaque commande est désormais unique !");
          }

          // 💾 SAVE HASH
          fs.writeFileSync(CACHE_FILE, JSON.stringify({
            hash,
            date: Date.now(),
            count: commands.length
          }, null, 2));

          console.log("💾 Cache mis à jour");

        } catch (error) {

          const status = error?.status;
          const retryAfter = error?.data?.retry_after;

          console.log(`❌ Erreur deploy (try ${attempt}) → ${status || "UNKNOWN"}`);

          // 🔥 RATE LIMIT DISCORD HARD
          if (status === 429) {
            const delay = (retryAfter || 5) * 1000;
            console.log(`⏳ Rate limit → retry dans ${delay / 1000}s`);
            return setTimeout(() => deploy(attempt), delay);
          }

          // 🔁 RETRY EXPONENTIEL
          if (attempt < 5) {
            const delay = Math.pow(2, attempt) * 3000;
            console.log(`🔁 Retry (${attempt}) dans ${delay / 1000}s`);
            return setTimeout(() => deploy(attempt + 1), delay);
          }

          console.log("❌ Deploy FAIL (max retries)");
          console.error(error);
        }
      };

      await deploy();

    } catch (err) {
      console.log("❌ Erreur globale deploy");
      console.error(err);

    } finally {
      isDeploying = false;

      // 🔁 relance si un autre deploy demandé pendant
      if (queue) {
        console.log("🔁 Deploy en attente → relance");
        queue = false;
        this.execute(client);
      }
    }
  }
};