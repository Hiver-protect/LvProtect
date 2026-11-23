// =========================
// 🔄 MODULE AUTO-UPDATE PRO
// =========================
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

const CONFIG = {
    enabled: process.env.AUTO_UPDATE === 'true',
    interval: parseInt(process.env.AUTO_UPDATE_INTERVAL || '300000'),
    branch: process.env.GITHUB_BRANCH || 'main',
    forceReset: true, // Écrase les changements locaux s'il y en a
    npmInstall: true  // Lance npm install si package.json change
};

let isUpdating = false;

// =========================
// 📝 LOGGING SYSTÈME
// =========================
const log = {
    info: (m) => console.log(`\x1b[36m[UPDATE]\x1b[0m ${m}`),
    ok: (m) => console.log(`\x1b[32m[UPDATE]\x1b[0m ✔ ${m}`),
    warn: (m) => console.log(`\x1b[33m[UPDATE]\x1b[0m ⚠ ${m}`),
    err: (m) => console.error(`\x1b[31m[UPDATE]\x1b[0m ✖ ${m}`)
};

// =========================
// 🛠️ FONCTIONS UTILES
// =========================

/**
 * Vérifie si le repo local est en retard sur le repo distant
 */
async function checkForUpdates() {
    try {
        await execAsync('git fetch origin ' + CONFIG.branch);
        const { stdout: local } = await execAsync('git rev-parse HEAD');
        const { stdout: remote } = await execAsync(`git rev-parse origin/${CONFIG.branch}`);

        return local.trim() !== remote.trim();
    } catch (e) {
        log.err(`Vérification impossible: ${e.message}`);
        return false;
    }
}

/**
 * Procédure de mise à jour complète
 */
async function performUpdate(client) {
    if (isUpdating) return;
    isUpdating = true;

    try {
        log.warn('Mise à jour détectée ! Préparation du téléchargement...');

        // 1. Notification (Optionnel)
        if (process.env.LOG_CHANNEL_ID) {
            const channel = client.channels.cache.get(process.env.LOG_CHANNEL_ID);
            if (channel) await channel.send('🔄 **Mise à jour détectée...** Téléchargement et installation en cours.');
        }

        // 2. Nettoyage local & Pull
        if (CONFIG.forceReset) {
            await execAsync('git reset --hard origin/' + CONFIG.branch);
        }
        const { stdout: pullLog } = await execAsync(`git pull origin ${CONFIG.branch}`);
        log.ok('Fichiers mis à jour avec succès.');

        // 3. Vérification des dépendances (package.json)
        // On vérifie si package.json a été modifié dans le dernier commit
        const { stdout: changedFiles } = await execAsync('git diff-tree --no-commit-id --name-only -r HEAD');
        
        if (CONFIG.npmInstall && changedFiles.includes('package.json')) {
            log.info('Changement détecté dans package.json, installation des dépendances...');
            await execAsync('npm install --production');
            log.ok('Dépendances installées.');
        }

        log.ok('Mise à jour terminée. Redémarrage imminent...');

        // 4. Redémarrage
        setTimeout(() => {
            process.exit(0); 
            // Note: Ton bot doit être lancé avec PM2 ou Docker pour redémarrer automatiquement
        }, 3000);

    } catch (e) {
        log.err(`Échec critique de la mise à jour: ${e.message}`);
        isUpdating = false;
    }
}

// =========================
// 🚀 POINT D'ENTRÉE
// =========================
function startAutoUpdate(client) {
    if (!CONFIG.enabled) return log.warn('Auto-update désactivé via ENV.');

    log.ok(`Veille active (${CONFIG.interval / 1000}s) sur la branche [${CONFIG.branch}]`);

    setInterval(async () => {
        if (isUpdating) return;

        const hasUpdate = await checkForUpdates();
        if (hasUpdate) {
            await performUpdate(client);
        }
    }, CONFIG.interval);
}

module.exports = { startAutoUpdate };