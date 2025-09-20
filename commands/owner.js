const { EmbedBuilder } = require('discord.js');
const { isBuyer, isOwner, addOwner, removeOwner, getOwners, saveConfig } = require('../utils/permissions');
const config = require('../config.json');

module.exports = {
    name: 'owner',
    description: 'Gère les propriétaires du bot',
    async execute(client, message, args) {
        // Vérification des permissions
        if (!isBuyer(message.author.id)) {
            const embed = new EmbedBuilder()
                .setTitle('ACCÈS REFUSÉ')
                .setDescription('Cette commande est réservée au propriétaire du bot')
                .setColor('#2F3136')
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });
        }

        // Affichage de la liste des owners si pas d'arguments
        if (args.length === 0) {
            const owners = getOwners();
            const ownerList = owners.length > 0 
                ? owners.map(id => `<@${id}> (\`${id}\`)`).join('\n')
                : 'Aucun owner configuré';

            const embed = new EmbedBuilder()
                .setTitle('LISTE DES OWNERS')
                .setDescription(ownerList)
                .addFields(
                    { name: 'UTILISATION', value: '`=owner add @user` - Ajouter un owner\n`=owner remove @user` - Retirer un owner' },
                    { name: 'BUYER ACTUEL', value: `<@${config.buyer}> (\`${config.buyer}\`)` }
                )
                .setColor('#2F3136')
                .setTimestamp();
            
            return message.channel.send({ embeds: [embed] });
        }

        // Gestion des actions add/remove
        if (args.length < 2) {
            const embed = new EmbedBuilder()
                .setTitle('ERREUR DE SYNTAXE')
                .setDescription('Utilisation: `=owner <add/remove> @user`')
                .setColor('#2F3136')
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });
        }

        const action = args[0].toLowerCase();
        const targetUser = message.mentions.users.first() || client.users.cache.get(args[1]);

        if (!targetUser) {
            const embed = new EmbedBuilder()
                .setTitle('UTILISATEUR INTROUVABLE')
                .setDescription('Veuillez mentionner un utilisateur valide')
                .setColor('#2F3136')
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });
        }

        if (action === 'add') {
            if (isOwner(targetUser.id)) {
                const embed = new EmbedBuilder()
                    .setTitle('DÉJÀ OWNER')
                    .setDescription(`${targetUser.tag} est déjà owner`)
                    .setColor('#FFFF00')
                    .setTimestamp();
                return message.channel.send({ embeds: [embed] });
            }

            addOwner(targetUser.id);
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('OWNER AJOUTÉ')
                .setDescription(`${targetUser.tag} a été ajouté comme owner`)
                .setColor('#00FF00')
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });

        } else if (action === 'remove') {
            if (!isOwner(targetUser.id)) {
                const embed = new EmbedBuilder()
                    .setTitle('NON OWNER')
                    .setDescription(`${targetUser.tag} n'est pas owner`)
                    .setColor('#FFFF00')
                    .setTimestamp();
                return message.channel.send({ embeds: [embed] });
            }

            removeOwner(targetUser.id);
            saveConfig();

            const embed = new EmbedBuilder()
                .setTitle('OWNER RETIRÉ')
                .setDescription(`${targetUser.tag} a été retiré des owners`)
                .setColor('#00FF00')
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });

        } else {
            const embed = new EmbedBuilder()
                .setTitle('ACTION INVALIDE')
                .setDescription('Actions valides: `add`, `remove`')
                .setColor('#2F3136')
                .setTimestamp();
            return message.channel.send({ embeds: [embed] });
        }
    }
};