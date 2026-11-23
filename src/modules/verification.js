const { AttachmentBuilder } = require('discord.js');
const { Captcha } = require('captcha-canvas');
const { getConfig } = require('./guildConfig');

module.exports = {
    async startVerification(member, client, interaction = null) {

        try {
            // =========================
            // 🤖 CAPTCHA GENERATION
            // =========================
            const captcha = new Captcha();
            captcha.size = { width: 300, height: 100 };
            captcha.length = 6;
            captcha.decoy = 5;
            captcha.text = '';

            captcha.drawTrace();
            captcha.drawCaptcha();

            const buffer = await captcha.png;
            const captchaText = captcha.text;

            if (!captchaText) {
                throw new Error("Captcha text generation failed");
            }

            // =========================
            // 📩 DM USER
            // =========================
            const dm = await member.send({
                content: "🛡️ **Vérification requise**\nMerci de résoudre ce captcha pour accéder au serveur.",
                files: [
                    new AttachmentBuilder(buffer, { name: 'captcha.png' })
                ]
            }).catch(() => null);

            if (!dm) {
                if (interaction) {
                    return interaction.reply({
                        content: "❌ Impossible d’envoyer un DM. Active tes messages privés.",
                        ephemeral: true
                    });
                }
                return;
            }

            // =========================
            // ⏱️ COLLECT RESPONSE SAFE
            // =========================
            const filter = m => m.author.id === member.id;

            let collected;

            try {
                collected = await dm.channel.awaitMessages({
                    filter,
                    max: 1,
                    time: 60000,
                    errors: ['time']
                });
            } catch {
                await member.send("⏰ Temps écoulé, vérification échouée.");
                if (interaction) {
                    return interaction.reply({
                        content: "⏰ Temps écoulé.",
                        ephemeral: true
                    });
                }
                return;
            }

            const response = collected.first()?.content?.trim();

            // =========================
            // 🔍 CHECK CAPTCHA
            // =========================
            if (response === captchaText) {

                await member.send("✅ Vérification réussie ! Accès autorisé.");

                const config = getConfig(member.guild.id);
                const role = member.guild.roles.cache.get(config?.verifiedRole);

                if (role) {
                    await member.roles.add(role).catch(() => null);
                }

                if (interaction && !interaction.replied) {
                    await interaction.reply({
                        content: "✅ Vérification réussie !",
                        ephemeral: true
                    });
                }

            } else {

                await member.send("❌ Captcha incorrect. Réessaie.");

                if (interaction && !interaction.replied) {
                    await interaction.reply({
                        content: "❌ Captcha incorrect.",
                        ephemeral: true
                    });
                }
            }

        } catch (err) {

            console.error("❌ Verification error:", err);

            try {
                await member.send("⚠️ Une erreur est survenue lors de la vérification.");
            } catch {}

            if (interaction && !interaction.replied) {
                await interaction.reply({
                    content: "⚠️ Erreur lors de la vérification.",
                    ephemeral: true
                });
            }
        }
    }
};