const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendSecurityLog } = require('../modules/antiraid');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('👢 Expulser un membre du serveur')
        .addUserOption(opt => 
            opt.setName('membre')
                .setDescription('Le membre à expulser')
                .setRequired(true))
        .addStringOption(opt => 
            opt.setName('raison')
                .setDescription('Raison de l\'expulsion')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('membre');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        const guild = interaction.guild;

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ content: "❌ Tu ne peux pas t'expulser toi-même.", ephemeral: true });
        }
        if (targetUser.id === client.user.id) {
            return interaction.reply({ content: "❌ Je ne peux pas m'expulser moi-même.", ephemeral: true });
        }
        if (targetUser.id === guild.ownerId) {
            return interaction.reply({ content: "❌ Impossible d'expulser le propriétaire du serveur.", ephemeral: true });
        }

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            return interaction.reply({ content: "❌ Ce membre n'est pas présent sur le serveur.", ephemeral: true });
        }

        // Hiérarchie modérateur
        if (interaction.member.id !== guild.ownerId && 
            targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ 
                content: "❌ Tu ne peux pas expulser un membre ayant un rôle supérieur ou égal au tien.", 
                ephemeral: true 
            });
        }

        // Hiérarchie bot
        if (!targetMember.kickable) {
            return interaction.reply({ 
                content: "❌ Je ne dispose pas des permissions requises pour expulser ce membre (rôle trop élevé).", 
                ephemeral: true 
            });
        }

        // DM préventif
        const dmEmbed = new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle(`👢 Tu as été expulsé de ${guild.name}`)
            .addFields(
                { name: "👮 Modérateur", value: interaction.user.tag, inline: true },
                { name: "📝 Raison", value: reason, inline: true }
            )
            .setTimestamp();

        await targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

        try {
            await targetMember.kick(`[Par ${interaction.user.tag}] ${reason}`);

            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("✅ Membre Expulsé")
                .setDescription(`**${targetUser.tag}** (\`${targetUser.id}\`) a été expulsé avec succès.`)
                .addFields({ name: "📝 Raison", value: reason })
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            const logEmbed = new EmbedBuilder()
                .setColor(0xe67e22)
                .setTitle("👢 Modération : Expulsion")
                .addFields(
                    { name: "👤 Cible", value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                    { name: "👮 Modérateur", value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
                    { name: "📝 Raison", value: reason, inline: false }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            await sendSecurityLog(guild, logEmbed, client);

        } catch (err) {
            console.error("Erreur commande kick:", err);
            await interaction.reply({ content: `❌ Erreur lors de l'expulsion : ${err.message}`, ephemeral: true });
        }
    }
};
