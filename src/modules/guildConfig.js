// Gestion avancée et ultra-performante de la configuration par serveur avec cache mémoire
const fs = require('fs');
const path = require('path');

const configPath = path.join(process.cwd(), 'data', 'config.json');

// Cache mémoire pour des lectures ultra-rapides sans I/O bloquant
let configCache = null;

function cleanId(val) {
    if (typeof val === 'string') {
        return val.replace(/^[<#@&!]+|[>]+$/g, '').trim();
    }
    return val;
}

function sanitizeConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return {};
    const sanitized = { ...cfg };
    for (const key of Object.keys(sanitized)) {
        if (typeof sanitized[key] === 'string') {
            sanitized[key] = cleanId(sanitized[key]);
        }
    }
    return sanitized;
}

function loadConfigs() {
    if (configCache !== null) return configCache;
    try {
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, '{}', 'utf8');
            configCache = {};
            return configCache;
        }
        const raw = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw || '{}');
        configCache = {};
        for (const [gid, cfg] of Object.entries(parsed)) {
            configCache[gid] = sanitizeConfig(cfg);
        }
        return configCache;
    } catch (err) {
        console.error("❌ Erreur lors du chargement de config.json:", err.message);
        configCache = {};
        return configCache;
    }
}

function saveConfigs(data) {
    try {
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error("❌ Erreur lors de l'enregistrement de config.json:", err.message);
    }
}

function getConfig(guildId) {
    const data = loadConfigs();
    return data[guildId] || {};
}

function setConfig(guildId, config) {
    const data = loadConfigs();
    data[guildId] = sanitizeConfig(config);
    configCache = data;
    saveConfigs(data);
    return data[guildId];
}

function updateConfig(guildId, key, value) {
    const data = loadConfigs();
    if (!data[guildId]) data[guildId] = {};
    data[guildId][key] = cleanId(value);
    configCache = data;
    saveConfigs(data);
    return data[guildId];
}

module.exports = { 
    getConfig, 
    setConfig, 
    updateConfig,
    cleanId 
};
