const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendSecurityLog } = require('../modules/antiraid');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('🔨 Bannir définitivement un membre du serveur')
        .addUserOption(opt => 
            opt.setName('membre')
                .setDescription('Le membre à bannir')
                .setRequired(true))
        .addStringOption(opt => 
            opt.setName('raison')
                .setDescription('Raison du bannissement')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('membre');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        const guild = interaction.guild;

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ content: "❌ Tu ne peux pas te bannir toi-même.", ephemeral: true });
        }
        if (targetUser.id === client.user.id) {
            return interaction.reply({ content: "❌ Je ne peux pas me bannir moi-même.", ephemeral: true });
        }
        if (targetUser.id === guild.ownerId) {
            return interaction.reply({ content: "❌ Impossible de bannir le propriétaire du serveur.", ephemeral: true });
        }

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

        if (targetMember) {
            // Vérification hiérarchie modérateur
            if (interaction.member.id !== guild.ownerId && 
                targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.reply({ 
                    content: "❌ Tu ne peux pas bannir un membre ayant un rôle supérieur ou égal au tien.", 
                    ephemeral: true 
                });
            }

            // Vérification hiérarchie du bot
            if (!targetMember.bannable) {
                return interaction.reply({ 
                    content: "❌ Je ne dispose pas des permissions suffisantes pour bannir ce membre (rôle trop élevé).", 
                    ephemeral: true 
                });
            }

            // Envoi d'un MP préventif
            const dmEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle(`🔨 Tu as été banni de ${guild.name}`)
                .addFields(
                    { name: "👮 Modérateur", value: interaction.user.tag, inline: true },
                    { name: "📝 Raison", value: reason, inline: true }
                )
                .setTimestamp();

            await targetMember.send({ embeds: [dmEmbed] }).catch(() => {});
        }

        try {
            await guild.members.ban(targetUser.id, { reason: `[Par ${interaction.user.tag}] ${reason}` });

            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("✅ Membre Banni")
                .setDescription(`**${targetUser.tag}** (\`${targetUser.id}\`) a été banni du serveur avec succès.`)
                .addFields({ name: "📝 Raison", value: reason })
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            // Log de sécurité
            const logEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle("🔨 Modération : Bannissement")
                .addFields(
                    { name: "👤 Cible", value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                    { name: "👮 Modérateur", value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
                    { name: "📝 Raison", value: reason, inline: false }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            await sendSecurityLog(guild, logEmbed, client);

        } catch (err) {
            console.error("Erreur commande ban:", err);
            await interaction.reply({ content: `❌ Erreur lors du bannissement : ${err.message}`, ephemeral: true });
        }
    }
};
