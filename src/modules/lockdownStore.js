const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'lockdown.json');

function load() {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function save(data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = { load, save };