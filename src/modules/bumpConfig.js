const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'bumpConfig.json');

function load() {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file));
}

function save(data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function get(guildId) {
    const data = load();
    return data[guildId] || {};
}

function set(guildId, config) {
    const data = load();
    data[guildId] = { ...get(guildId), ...config };
    save(data);
}

module.exports = { get, set };