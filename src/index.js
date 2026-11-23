const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

// Normalisation des tokens possibles
process.env.DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN || process.env.BOT_TOKEN;

const {
    Client,
    GatewayIntentBits,
    Partials,
    Collection,
    ActivityType,
    Events
} = require('discord.js');

// =========================
// 🔐 ENV CHECK
// =========================
if (!process.env.DISCORD_TOKEN) {
    console.error("❌ DISCORD_TOKEN manquant !");
    console.error("👉 Créez ou modifiez le fichier .env sur votre panel et ajoutez :");
    console.error("DISCORD_TOKEN=votre_token_ici");
    process.exit(1);
}

// =========================
// 🤖 CLIENT
// =========================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message],
    allowedMentions: { parse: [] }
});

client.commands = new Collection();

// =========================
// 📊 LOGGER
// =========================
const log = {
    ok: (m) => console.log(`[✔] ${m}`),
    warn: (m) => console.warn(`[⚠] ${m}`),
    err: (m, e) => console.error(`[✖] ${m}`, e || ""),
    info: (m) => console.log(`[ℹ] ${m}`)
};

// =========================
// ♻️ CACHE CLEAN
// =========================
const clearRequire = (modulePath) => {
    delete require.cache[require.resolve(modulePath)];
};

// =========================
// 🚨 ANTI DOUBLE EVENTS GLOBAL
// =========================
client._loadedEvents = new Set();
client._intervals = new Set();

// =========================
// 📂 COMMANDS LOADER
// =========================
function loadCommands() {

    const dir = path.join(__dirname, 'commands');
    if (!fs.existsSync(dir)) return log.err("commands/ introuvable");

    client.commands.clear();

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

    for (const file of files) {

        const filePath = path.join(dir, file);

        try {

            clearRequire(filePath);
            const cmd = require(filePath);

            if (!cmd?.data?.name || typeof cmd.execute !== "function") {
                log.warn(`Commande invalide: ${file}`);
                continue;
            }

            client.commands.set(cmd.data.name, cmd);
            log.ok(`Commande: ${cmd.data.name}`);

        } catch (err) {
            log.err(`Commande crash: ${file}`, err);
        }
    }

    log.info(`${client.commands.size} commandes chargées`);
}

// =========================
// ⚡ EVENTS LOADER (ANTI DUPLICATE)
// =========================
function loadEvents() {

    const dir = path.join(__dirname, 'events');
    if (!fs.existsSync(dir)) return log.err("events/ introuvable");

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

    for (const file of files) {

        const filePath = path.join(dir, file);

        try {

            clearRequire(filePath);
            const event = require(filePath);

            if (!event.name || typeof event.execute !== "function") {
                log.warn(`Event invalide: ${file}`);
                continue;
            }

            // =========================
            // 🚫 ANTI DUPLICATE EVENT
            // =========================
            if (client._loadedEvents.has(event.name)) {
                log.warn(`Event ignoré (doublon): ${event.name}`);
                continue;
            }

            client._loadedEvents.add(event.name);

            const handler = async (...args) => {
                try {
                    await event.execute(...args, client);
                } catch (err) {
                    log.err(`Event crash: ${event.name}`, err);
                }
            };

            if (event.once) client.once(event.name, handler);
            else client.on(event.name, handler);

            log.ok(`Event: ${event.name}`);

        } catch (err) {
            log.err(`Event load fail: ${file}`, err);
        }
    }
}

// =========================
// 🎮 STATUS
// =========================
const statusList = [
    () => `🛡️ Protection active`,
    () => `👥 ${client.guilds.cache.size} serveurs`,
    () => `⚡ HiverGuard Online`,
    () => `/help`
];

let i = 0;
let lastPresence = "";

// =========================
// 🔥 READY (SAFE)
// =========================
client.once(Events.ClientReady, async () => {

    if (client._readyExecuted) {
        return log.warn("READY ignoré (doublon détecté)");
    }

    client._readyExecuted = true;

    log.ok(`Connecté en tant que ${client.user.tag}`);

    // =========================
    // 🎮 STATUS LOOP SAFE
    // =========================
    const statusInterval = setInterval(() => {

        if (!client.user) return;

        const text = statusList[i]();

        if (text !== lastPresence) {
            client.user.setPresence({
                activities: [{ name: text, type: ActivityType.Watching }],
                status: "online"
            });

            lastPresence = text;
        }

        i = (i + 1) % statusList.length;

    }, 60000);

    client._intervals.add(statusInterval);

    // =========================
    // 📊 LIVE LOG LOOP SAFE
    // =========================
    const logInterval = setInterval(() => {

        log.info(
            `LIVE | ${client.guilds.cache.size} guilds | ${client.users.cache.size} users | ping ${client.ws.ping}ms`
        );

    }, 60000);

    client._intervals.add(logInterval);

    log.ok(`Serveurs: ${client.guilds.cache.size}`);
    log.ok(`Users: ${client.users.cache.size}`);
});

// =========================
// 🧠 ANTI CRASH
// =========================
process.on("unhandledRejection", (reason) => {
    log.err("Unhandled Rejection", reason);
});

process.on("uncaughtException", (err) => {
    log.err("Uncaught Exception", err);
});

// =========================
// 🔴 RATE LIMIT
// =========================
client.rest.on("rateLimited", (info) => {
    log.warn(`Rate limit: ${info.timeToReset}ms`);
});

// =========================
// 🔻 SHUTDOWN CLEAN
// =========================
const shutdown = () => {

    log.warn("Arrêt du bot...");

    client._intervals.forEach(clearInterval);

    client.destroy();

    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// =========================
// 🚀 BOOTSTRAP AND LOGIN
// =========================
loadCommands();
loadEvents();

client.login(process.env.DISCORD_TOKEN).catch(err => {
    log.err("Erreur login", err);
});