// =========================
// 🔄 MODULE AUTO-UPDATE PRO (Pterodactyl & GitHub)
// =========================
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const CONFIG = {
    enabled: process.env.AUTO_UPDATE !== 'false',
    interval: parseInt(process.env.AUTO_UPDATE_INTERVAL || '60000'), // Vérifie toutes les 60 secondes
    branch: process.env.GITHUB_BRANCH || 'main',
    forceReset: true,
    npmInstall: true
};

let isUpdating = false;

const log = {
    info: (m) => console.log(`\x1b[36m[AUTO-UPDATE]\x1b[0m ${m}`),
    ok: (m) => console.log(`\x1b[32m[AUTO-UPDATE]\x1b[0m ✔ ${m}`),
    warn: (m) => console.log(`\x1b[33m[AUTO-UPDATE]\x1b[0m ⚠ ${m}`),
    err: (m) => console.error(`\x1b[31m[AUTO-UPDATE]\x1b[0m ✖ ${m}`)
};

/**
 * Vérifie si le repo distant a de nouveaux commits
 */
async function checkForUpdates() {
    try {
        await execAsync(`git config --global --add safe.directory /home/container 2>/dev/null; git fetch origin ${CONFIG.branch}`);
        const { stdout: local } = await execAsync('git rev-parse HEAD');
        const { stdout: remote } = await execAsync(`git rev-parse origin/${CONFIG.branch}`);

        return local.trim() !== remote.trim();
    } catch (e) {
        // En cas de non-git environnement ou erreur réseau
        return false;
    }
}

/**
 * Procédure de téléchargement et redémarrage
 */
async function performUpdate(client) {
    if (isUpdating) return { success: false, message: "Mise à jour déjà en cours." };
    isUpdating = true;

    try {
        log.warn('🔄 Nouveau commit détecté sur GitHub ! Téléchargement...');

        // 1. Reset et Pull
        if (CONFIG.forceReset) {
            await execAsync(`git reset --hard origin/${CONFIG.branch}`);
        }
        await execAsync(`git pull origin ${CONFIG.branch}`);
        log.ok('✅ Code synchronisé avec succès.');

        // 2. Dépendances npm si package.json a changé
        try {
            const { stdout: changedFiles } = await execAsync('git diff-tree --no-commit-id --name-only -r HEAD');
            if (CONFIG.npmInstall && changedFiles.includes('package.json')) {
                log.info('📦 Changement package.json détecté, installation des dépendances...');
                await execAsync('npm install --production');
                log.ok('Dépendances installées.');
            }
        } catch {}

        log.ok('🚀 Redémarrage automatique du bot sur Pterodactyl...');

        setTimeout(() => {
            process.exit(0); // Le conteneur Pterodactyl redémarre instantanément
        }, 1500);

        return { success: true };

    } catch (e) {
        log.err(`Échec de la mise à jour: ${e.message}`);
        isUpdating = false;
        return { success: false, error: e.message };
    }
}

/**
 * Surveillance automatique en arrière-plan
 */
function startAutoUpdate(client) {
    if (!CONFIG.enabled) {
        return log.info('Auto-update en arrière-plan désactivé (AUTO_UPDATE=false).');
    }

    log.ok(`Veille active (${CONFIG.interval / 1000}s) sur la branche [${CONFIG.branch}]`);

    setInterval(async () => {
        if (isUpdating) return;

        const hasUpdate = await checkForUpdates();
        if (hasUpdate) {
            log.info('🔔 Nouveau commit détecté sur GitHub ! Lancement du cycle auto-update...');
            await performUpdate(client);
        }
    }, CONFIG.interval);
}

module.exports = { 
    startAutoUpdate, 
    checkForUpdates, 
    performUpdate 
};
