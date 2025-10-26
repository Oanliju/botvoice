const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { hasPermission, isOwner, isBuyer } = require('../utils/permissions');

module.exports = {
    name: 'help',
    description: 'Affiche la liste des commandes disponibles',
    async execute(client, message, args) {

        const publicCommands = [
            '`=help` → Affiche cette liste'
        ];

        const ownerCommands = [
            '`=bring <salon> [salon]` → Déplace tous les membres',
            '`=bringcc <category> [salon]` → Déplace aléatoirement dans une catégorie',
            '`=find <@user/ID>` → Trouve un membre dans les vocaux',
            '`=join <@user/ID|ID Salon>` → Rejoint le salon vocal d\'un membre ou par ID',
            '`=laisse <add/remove/list/clear/clearall> [@user/ID]` → Gère la liste de suivi',
            '`=perms` → Interface de gestion des permissions',
            '`=pv [option] [paramètres]` → Configure les vocaux privés',
            '`=rolemove <@role/ID> [salon]` → Déplace tous les membres d\'un rôle',
            '`=swap <@user/ID> [@user/ID]` → Échange deux membres entre leurs salons',
            '`=unvoicedeaf <@user/ID> [raison]` → Retire le mute casque',
            '`=unvoicemute <@user/ID> [raison]` → Retire le mute vocal',
            '`=voicedeaf <@user/ID> [raison]` → Mute casque un membre',
            '`=voicekick <@user/ID> [raison]` → Kick un membre de son salon vocal',
            '`=voicemove <@user/ID> [salon]` → Déplace un membre dans un salon',
            '`=voicemute <@user/ID> [raison]` → Mute un membre',
            '`=wakeup <@user/ID> [nombre]` → Déplace un membre plusieurs fois pour le réveiller'
        ];

        const buyerCommands = [
            '`=owner <add/remove> [@user]` → Gère les owners du bot'
        ];

        const menu = new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('Sélectionnez une catégorie de commandes')
            .addOptions([
                { label: 'Commandes Publiques', value: 'public', description: 'Commandes accessibles à tous' },
                { label: 'Commandes Owner', value: 'owner', description: 'Commandes réservées aux owners' },
                { label: 'Commandes Buyer', value: 'buyer', description: 'Commandes réservées au buyer' }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        const embed = new EmbedBuilder()
            .setTitle('SYSTÈME D\'AIDE - LISTE DES COMMANDES')
            .setDescription('Utilisez le menu déroulant ci-dessous pour naviguer entre les différentes catégories de commandes.')
            .setColor('#2F3136')
            .setFooter({ 
                text: `Demandé par ${message.author.tag}`, 
                iconURL: message.author.displayAvatarURL() 
            })
            .setTimestamp();

        const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });

        const filter = i => i.user.id === message.author.id;
        const collector = sentMessage.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            let selectedEmbed = new EmbedBuilder().setColor('#2F3136');

            if (i.values[0] === 'public') {
                selectedEmbed
                    .setTitle('COMMANDES PUBLIQUES')
                    .setDescription(publicCommands.join('\n'));
            } else if (i.values[0] === 'owner') {
                if (!isOwner(message.author.id) && !isBuyer(message.author.id)) {
                    return i.reply({ content: 'Accès refusé : permissions insuffisantes', ephemeral: true });
                }
                selectedEmbed
                    .setTitle('COMMANDES OWNER')
                    .setDescription(ownerCommands.join('\n'));
            } else if (i.values[0] === 'buyer') {
                if (!isBuyer(message.author.id)) {
                    return i.reply({ content: 'Accès refusé : permissions insuffisantes', ephemeral: true });
                }
                selectedEmbed
                    .setTitle('COMMANDES BUYER')
                    .setDescription(buyerCommands.join('\n'));
            }

            await i.update({ embeds: [selectedEmbed], components: [row] });
        });
    }
};