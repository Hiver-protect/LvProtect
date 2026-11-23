const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'welcome.json');

function load() {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function save(data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function get(guildId) {
    const data = load();
    return data[guildId] || null;
}

function set(guildId, config) {
    const data = load();
    data[guildId] = config;
    save(data);
}

module.exports = { get, set };