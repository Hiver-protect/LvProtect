const { REST, Routes } = require('discord.js');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// =========================
// 📊 LOGGER PRO
// =========================
const log = {
    ok: (m) => console.log(`✔ ${m}`),
    warn: (m) => console.log(`⚠ ${m}`),
    err: (m) => console.log(`✖ ${m}`),
    info: (m) => console.log(`📡 ${m}`)
};

// =========================
// 📦 COMMAND CACHE (PERF BOOST)
// =========================
let cachedCommands = null;
let lastCache = 0;

// =========================
// 📦 GET COMMANDS OPTIMIZED
// =========================
function getCommands(client) {
    const now = Date.now();

    // 🔥 cache 30s (évite recalcul inutile)
    if (cachedCommands && now - lastCache < 30000) {
        return cachedCommands;
    }

    const commands = [];

    client.commands.forEach(cmd => {
        try {
            if (cmd?.data?.toJSON) {
                commands.push(cmd.data.toJSON());
            }
        } catch (err) {
            log.warn(`Commande ignorée`);
        }
    });

    cachedCommands = commands;
    lastCache = now;

    return commands;
}

// =========================
// 🏠 DEPLOY GUILD SAFE
// =========================
async function deployToGuild(client, guildId, attempt = 1) {

    const CLIENT_ID = process.env.CLIENT_ID || client.application?.id;

    if (!CLIENT_ID) {
        log.err("CLIENT_ID manquant");
        return false;
    }

    const commands = getCommands(client);

    if (!commands.length) {
        log.err("Aucune commande à déployer");
        return false;
    }

    try {

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, guildId),
            { body: commands }
        );

        log.ok(`Sync OK → ${guildId}`);
        return true;

    } catch (error) {

        log.err(`Erreur guild ${guildId} (try ${attempt})`);

        // 🔁 RETRY INTELLIGENT
        if (attempt < 3) {

            const delay = attempt * 2000;

            await new Promise(r => setTimeout(r, delay));

            return deployToGuild(client, guildId, attempt + 1);
        }

        return false;
    }
}

// =========================
// 🚀 DEPLOY ALL GUILDS OPTIMIZED
// =========================
async function deployToAllGuilds(client) {

    const guilds = client.guilds.cache;

    log.info(`Sync sur ${guilds.size} serveurs...`);

    let success = 0;
    let failed = 0;

    for (const [guildId] of guilds) {

        const result = await deployToGuild(client, guildId);

        result ? success++ : failed++;

        // 🧠 anti rate-limit Discord
        await new Promise(r => setTimeout(r, 150));
    }

    log.ok(`✔ Sync terminé: ${success}/${guilds.size}`);

    if (failed > 0) {
        log.warn(`⚠ Échecs: ${failed}`);
    }
}

// =========================
// ⚡ AUTO SYNC SYSTEM
// =========================
function setupGuildSync(client) {

    // 🚀 INITIAL SYNC (READY)
    client.once('ready', async () => {

        log.info("Démarrage sync commands...");

        // async non bloquant (bot reste rapide)
        deployToAllGuilds(client)
            .catch(err => log.err(err.message));
    });

    // ➕ NOUVEAU SERVEUR
    client.on('guildCreate', async (guild) => {

        log.info(`Nouveau serveur: ${guild.name}`);

        deployToGuild(client, guild.id)
            .catch(err => log.err(err.message));
    });

    log.ok("Système sync guild activé");
}

// =========================
// 📤 EXPORTS
// =========================
module.exports = {
    deployToGuild,
    deployToAllGuilds,
    setupGuildSync
};