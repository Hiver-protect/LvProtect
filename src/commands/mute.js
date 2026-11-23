const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { sendSecurityLog } = require('../modules/antiraid');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('🔇 Réduire un membre au silence (Timeout)')
        .addUserOption(opt => 
            opt.setName('membre')
                .setDescription('Le membre à mute')
                .setRequired(true))
        .addIntegerOption(opt => 
            opt.setName('duree')
                .setDescription('Durée de la sanction')
                .setRequired(true)
                .addChoices(
                    { name: '1 Minute', value: 1 },
                    { name: '5 Minutes', value: 5 },
                    { name: '10 Minutes', value: 10 },
                    { name: '1 Heure', value: 60 },
                    { name: '1 Jour', value: 1440 },
                    { name: '1 Semaine', value: 10080 }
                ))
        .addStringOption(opt => 
            opt.setName('raison')
                .setDescription('Raison du mute')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('membre');
        const minutes = interaction.options.getInteger('duree');
        const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
        const guild = interaction.guild;

        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ content: "❌ Tu ne peux pas te mute toi-même.", ephemeral: true });
        }
        if (targetUser.id === client.user.id) {
            return interaction.reply({ content: "❌ Je ne peux pas me mute moi-même.", ephemeral: true });
        }
        if (targetUser.id === guild.ownerId) {
            return interaction.reply({ content: "❌ Impossible de mute le propriétaire du serveur.", ephemeral: true });
        }

        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            return interaction.reply({ content: "❌ Ce membre n'est pas présent sur le serveur.", ephemeral: true });
        }

        // Hiérarchie
        if (interaction.member.id !== guild.ownerId && 
            targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ 
                content: "❌ Tu ne peux pas mute un membre ayant un rôle supérieur ou égal au tien.", 
                ephemeral: true 
            });
        }

        if (!targetMember.moderatable) {
            return interaction.reply({ 
                content: "❌ Je ne dispose pas des permissions requises pour mute ce membre.", 
                ephemeral: true 
            });
        }

        const msDuration = minutes * 60 * 1000;

        // DM préventif
        const dmEmbed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle(`🔇 Tu as été mis en sourdine sur ${guild.name}`)
            .addFields(
                { name: "⏱️ Durée", value: `${minutes} minute(s)`, inline: true },
                { name: "👮 Modérateur", value: interaction.user.tag, inline: true },
                { name: "📝 Raison", value: reason, inline: false }
            )
            .setTimestamp();

        await targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

        try {
            await targetMember.timeout(msDuration, `[Par ${interaction.user.tag}] ${reason}`);

            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("✅ Membre Mis en Sourdine")
                .setDescription(`**${targetUser.tag}** (\`${targetUser.id}\`) a été mute pour **${minutes} minute(s)**.`)
                .addFields({ name: "📝 Raison", value: reason })
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed], ephemeral: true });

            const logEmbed = new EmbedBuilder()
                .setColor(0xf1c40f)
                .setTitle("🔇 Modération : Timeout / Mute")
                .addFields(
                    { name: "👤 Cible", value: `${targetUser.tag} (\`${targetUser.id}\`)`, inline: true },
                    { name: "👮 Modérateur", value: `${interaction.user.tag} (\`${interaction.user.id}\`)`, inline: true },
                    { name: "⏱️ Durée", value: `${minutes} min`, inline: true },
                    { name: "📝 Raison", value: reason, inline: false }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            await sendSecurityLog(guild, logEmbed, client);

        } catch (err) {
            console.error("Erreur commande mute:", err);
            await interaction.reply({ content: `❌ Erreur lors du mute : ${err.message}`, ephemeral: true });
        }
    }
};
