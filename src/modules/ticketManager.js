const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField, 
    AttachmentBuilder 
} = require('discord.js');
const { getConfig } = require('./guildConfig');

module.exports = {
    /**
     * Crée un nouveau salon de ticket pour l'utilisateur
     */
    async createTicket(interaction, client) {
        const guild = interaction.guild;
        const member = interaction.member;
        const config = getConfig(guild.id) || {};
        
        // 1. Vérification de la catégorie configurée
        const categoryId = config.ticketCategory;
        const category = categoryId ? guild.channels.cache.get(categoryId) : null;
        
        if (!category || category.type !== ChannelType.GuildCategory) {
            return interaction.reply({
                content: "❌ **Erreur de configuration :** Aucune catégorie de ticket valide n'est configurée sur ce serveur.\nContacte un administrateur pour configurer la catégorie via la commande `/config ticket_category`.",
                ephemeral: true
            });
        }

        // Vérification anti-spam : l'utilisateur a-t-il déjà un ticket ouvert ?
        const existingChannel = guild.channels.cache.find(c => 
            c.type === ChannelType.GuildText && 
            c.parentId === category.id && 
            c.name === `ticket-${interaction.user.username.toLowerCase()}`
        );

        if (existingChannel) {
            return interaction.reply({
                content: `⚠️ Tu as déjà un ticket ouvert dans ce salon : <#${existingChannel.id}>`,
                ephemeral: true
            });
        }

        await interaction.reply({ content: "⏳ Création de ton ticket...", ephemeral: true });

        try {
            // 2. Création du salon avec des permissions restrictives
            const channel = await guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: category.id,
                topic: `Ticket ouvert par ${interaction.user.tag} (${interaction.user.id})`,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory,
                            PermissionsBitField.Flags.AttachFiles,
                            PermissionsBitField.Flags.EmbedLinks
                        ]
                    },
                    {
                        id: client.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory,
                            PermissionsBitField.Flags.ManageChannels,
                            PermissionsBitField.Flags.EmbedLinks
                        ]
                    }
                ]
            });

            // 3. Embed de bienvenue à l'intérieur du salon
            const welcomeEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`🎫 Ticket de ${interaction.user.username}`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setDescription(
                    `Bonjour ${interaction.user},\n` +
                    `Bienvenue dans ton ticket de support ! Explique ton problème ou ta question en détail.\n` +
                    `Un membre de notre équipe de modération va te répondre rapidement.\n\n` +
                    `**🔧 Outils d'administration :**\n` +
                    `🙋‍♂️ **Prendre en charge** : S'assigner le ticket en tant que staff.\n` +
                    `🔒 **Fermer** : Clôturer proprement le ticket.\n` +
                    `📂 **Logs** : Télécharger la transcription du ticket.`
                )
                .setFooter({ text: "HiverGuard Engine • Système de Support", iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('claim_ticket')
                    .setLabel('Prendre en charge')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🙋‍♂️'),
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Fermer le ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒'),
                new ButtonBuilder()
                    .setCustomId('save_logs')
                    .setLabel('Logs')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📂')
            );

            const initialMsg = await channel.send({ 
                content: `${interaction.user} | <@&${guild.roles.everyone.id}>`, 
                embeds: [welcomeEmbed], 
                components: [row] 
            });

            // Épingler le message initial pour qu'il soit toujours visible en haut
            await initialMsg.pin().catch(() => null);

            // Confirmer la création à l'utilisateur
            await interaction.editReply({
                content: `✅ Ton ticket a été créé avec succès : <#${channel.id}>`
            });

            // 4. Logs système
            this.sendLog(guild, client, new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle("🎫 Ticket Ouvert")
                .setDescription(`Un nouveau ticket de support a été créé.`)
                .addFields(
                    { name: "👤 Créateur", value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: "📁 Salon", value: `<#${channel.id}>`, inline: true }
                )
                .setTimestamp()
            );

        } catch (error) {
            console.error("Erreur lors de la création du ticket:", error);
            await interaction.editReply({
                content: "❌ Une erreur critique est survenue lors de la création de ton ticket. Merci de réessayer plus tard."
            });
        }
    },

    /**
     * Permet à un membre du staff de prendre en charge le ticket
     */
    async claimTicket(interaction, client) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({
                content: "❌ Seuls les membres du staff (avec la permission de gérer les salons) peuvent prendre en charge un ticket.",
                ephemeral: true
            });
        }

        const channel = interaction.channel;
        
        // Vérifier si déjà pris en charge
        if (channel.topic && channel.topic.includes("Pris en charge par")) {
            return interaction.reply({
                content: "⚠️ Ce ticket a déjà été pris en charge par un autre membre du staff.",
                ephemeral: true
            });
        }

        // Mettre à jour le topic
        const updatedTopic = `${channel.topic || ''} | Pris en charge par ${interaction.user.tag}`;
        await channel.setTopic(updatedTopic).catch(() => null);

        // Envoyer un message dans le salon
        const claimEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setDescription(`🙋‍♂️ **Ce ticket est désormais pris en charge par ${interaction.user}.**`);

        await interaction.reply({ embeds: [claimEmbed] });

        // Modifier les boutons pour désactiver le bouton Claim
        try {
            const messages = await channel.messages.fetchPinned().catch(() => null);
            const initialMsg = messages?.first();
            
            if (initialMsg && initialMsg.components.length > 0) {
                const oldRow = initialMsg.components[0];
                const newRow = ActionRowBuilder.from(oldRow);
                
                // Désactiver le bouton Claim (index 0)
                newRow.components[0].setDisabled(true).setLabel('Pris en charge');
                
                await initialMsg.edit({ components: [newRow] }).catch(() => null);
            }
        } catch (err) {
            console.error("Impossible de désactiver le bouton claim:", err);
        }

        // Logs système
        this.sendLog(interaction.guild, client, new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle("🙋‍♂️ Ticket Pris en Charge")
            .addFields(
                { name: "📁 Salon", value: `${channel} (${channel.name})`, inline: true },
                { name: "👮 Staff", value: `${interaction.user} (${interaction.user.tag})`, inline: true }
            )
            .setTimestamp()
        );
    },

    /**
     * Affiche un message de confirmation pour fermer le ticket
     */
    async closeTicket(interaction, client) {
        const confirmEmbed = new EmbedBuilder()
            .setColor(0xff5555)
            .setTitle("🔒 Confirmation de Fermeture")
            .setDescription("Es-tu sûr de vouloir fermer ce ticket définitivement ? Tous les messages non sauvegardés seront effacés.");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_close_ticket')
                .setLabel('Confirmer la fermeture')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔴'),
            new ButtonBuilder()
                .setCustomId('cancel_close_ticket')
                .setLabel('Annuler')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🟢')
        );

        await interaction.reply({ embeds: [confirmEmbed], components: [row] });
    },

    /**
     * Annule la fermeture du ticket
     */
    async cancelClose(interaction) {
        await interaction.message.delete().catch(() => null);
        await interaction.reply({ content: "✅ Fermeture annulée.", ephemeral: true });
    },

    /**
     * Ferme et supprime le ticket de manière sécurisée
     */
    async confirmClose(interaction, client) {
        const channel = interaction.channel;
        const guild = interaction.guild;

        await interaction.reply({ content: "🔒 **Fermeture du ticket en cours...** Les logs vont être envoyés et le salon sera supprimé dans 5 secondes." });

        // Générer les logs automatiquement avant de supprimer le salon
        let transcriptAttachment = null;
        try {
            const transcript = await this.generateTranscriptString(channel);
            const buffer = Buffer.from(transcript, 'utf-8');
            transcriptAttachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });
        } catch (e) {
            console.error("Échec génération transcript automatique lors de la fermeture :", e);
        }

        // Envoyer les logs au salon log
        const logEmbed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("🔒 Ticket Fermé & Supprimé")
            .setDescription(`Le ticket **${channel.name}** a été fermé définitivement.`)
            .addFields(
                { name: "📁 Salon", value: `${channel.name} (\`${channel.id}\`)`, inline: true },
                { name: "👮 Fermé par", value: `${interaction.user} (${interaction.user.tag})`, inline: true }
            )
            .setTimestamp();

        await this.sendLog(guild, client, logEmbed, transcriptAttachment);

        // Supprimer le salon après 5 secondes de délai de sécurité
        setTimeout(async () => {
            await channel.delete().catch(() => null);
        }, 5000);
    },

    /**
     * Sauvegarde manuellement les logs de discussion sous format TXT
     */
    async saveLogs(interaction, client) {
        await interaction.reply({ content: "⏳ Génération des logs...", ephemeral: true });

        try {
            const transcript = await this.generateTranscriptString(interaction.channel);
            const buffer = Buffer.from(transcript, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: `transcript-${interaction.channel.name}.txt` });

            await interaction.followUp({
                content: "📂 Voici la transcription complète de ce ticket :",
                files: [attachment],
                ephemeral: true
            });

        } catch (error) {
            console.error("Erreur lors de l'export des logs:", error);
            await interaction.followUp({
                content: "❌ Impossible d'exporter les logs du ticket.",
                ephemeral: true
            });
        }
    },

    /**
     * Génère la chaîne de transcription formatée
     */
    async generateTranscriptString(channel) {
        const limit = 100;
        const messages = await channel.messages.fetch({ limit }).catch(() => []);
        
        let transcript = `========================================================\n`;
        transcript += `📝 TRANSCRIPTION DE TICKET - ${channel.name}\n`;
        transcript += `🆔 ID du Salon : ${channel.id}\n`;
        transcript += `📅 Date d'export : ${new Date().toLocaleString('fr-FR')}\n`;
        transcript += `========================================================\n\n`;

        const sorted = Array.from(messages.values()).reverse();
        
        for (const msg of sorted) {
            const time = msg.createdAt.toLocaleString('fr-FR');
            const author = msg.author.tag;
            const content = msg.cleanContent || (msg.embeds.length > 0 ? "[Message Embed]" : "[Fichier joint]");
            
            transcript += `[${time}] ${author} : ${content}\n`;
            
            if (msg.attachments.size > 0) {
                msg.attachments.forEach(attachment => {
                    transcript += ` -> Fichier : ${attachment.url}\n`;
                });
            }
        }

        transcript += `\n========================================================\n`;
        transcript += `Fin de la transcription (limite: ${limit} messages).\n`;
        transcript += `HiverGuard Engine • Lv Creations\n`;
        transcript += `========================================================\n`;

        return transcript;
    },

    /**
     * Envoie un embed dans le salon de logs de sécurité
     */
    async sendLog(guild, client, embed, file = null) {
        const config = getConfig(guild.id) || {};
        const logChannelId = config.logChannel;
        
        if (!logChannelId) return;

        const logChannel = guild.channels.cache.get(logChannelId);
        if (!logChannel || !logChannel.isTextBased()) return;

        const payload = { embeds: [embed] };
        if (file) {
            payload.files = [file];
        }

        await logChannel.send(payload).catch(() => null);
    }
};
