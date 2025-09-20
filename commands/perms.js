const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');

const permsUtils = require('../utils/permissions');

module.exports = {
    name: 'perms',
    description: 'Gestion des permissions utilisateurs et rôles',
    async execute(client, message) {
        if (!permsUtils.isOwner(message.author.id) && !permsUtils.isBuyer(message.author.id)) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('Red')
                    .setDescription('❌ Vous n\'avez pas la permission d\'utiliser cette commande.')
                    .setFooter({ text: `Demandé par ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                ]
            });
        }

        // === Embeds utilitaires ===
        const generateMainEmbed = () => {
            const perms = permsUtils.getPermissions();
            const usersPermsList = Object.entries(perms.commandPermissions)
                .map(([id, cmds]) => `• <@${id}> : ${cmds.join(', ')}`).join('\n') || '*Aucun utilisateur*';

            const rolesPermsList = Object.entries(perms.rolePermissions)
                .map(([id, cmds]) => `• <@&${id}> : ${cmds.join(', ')}`).join('\n') || '*Aucun rôle*';

            return new EmbedBuilder()
                .setTitle('🔐 Gestion des permissions')
                .setDescription(`**Utilisateurs :**\n${usersPermsList}\n\n**Rôles :**\n${rolesPermsList}`)
                .setColor('#2F3136');
        };

        const generateTargetEmbed = (type, name, perms) => {
            return new EmbedBuilder()
                .setTitle(`🔧 Permissions de ${type === 'user' ? 'l\'utilisateur' : 'du rôle'} ${name}`)
                .setDescription(perms.length > 0 ? perms.map(c => `• ${c}`).join('\n') : '*Aucune permission*')
                .setColor('#2F3136');
        };

        // === Menu principal ===
        const typeMenu = new StringSelectMenuBuilder()
            .setCustomId('type')
            .setPlaceholder('Sélectionnez une cible')
            .addOptions([
                { label: 'Utilisateur', value: 'user', description: 'Gérer les permissions d’un utilisateur' },
                { label: 'Rôle', value: 'role', description: 'Gérer les permissions d’un rôle' }
            ]);

        const row = new ActionRowBuilder().addComponents(typeMenu);

        const sentMessage = await message.channel.send({
            embeds: [generateMainEmbed()],
            components: [row]
        });

        const collector = sentMessage.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 120_000
        });

        collector.on('collect', async i => {
            await i.deferUpdate().catch(() => {});

            if (i.customId === 'type') {
                const type = i.values[0];
                const prompt = await message.channel.send(`✍️ Mentionnez ${type === 'user' ? 'un utilisateur' : 'un rôle'} ou envoyez son ID :`);

                const collected = await message.channel.awaitMessages({
                    filter: m => m.author.id === message.author.id,
                    max: 1,
                    time: 30_000
                });

                await prompt.delete().catch(() => {});

                if (collected.size === 0) {
                    return message.channel.send('⏳ Temps écoulé, réessayez.');
                }

                const content = collected.first().content;
                const target = type === 'user'
                    ? (collected.first().mentions.users.first() || client.users.cache.get(content))
                    : (collected.first().mentions.roles.first() || message.guild.roles.cache.get(content));

                if (!target) return message.channel.send('❌ Cible introuvable.');

                const id = target.id;
                const name = type === 'user' ? target.username : target.name;
                const allCommands = Array.from(client.commands.keys());

                // Fonction pour rafraîchir les menus et l'embed en temps réel
                const refreshMenusAndEmbed = async () => {
                    const perms = permsUtils.getPermissions();
                    const updatedPerms = type === 'user'
                        ? perms.commandPermissions[id] || []
                        : perms.rolePermissions[id] || [];

                    const addMenu = new StringSelectMenuBuilder()
                        .setCustomId('add')
                        .setPlaceholder('➕ Ajouter')
                        .setMinValues(1)
                        .setMaxValues(allCommands.length)
                        .addOptions(allCommands.map(cmd => ({ label: cmd, value: cmd })));

                    const removeMenu = new StringSelectMenuBuilder()
                        .setCustomId('remove')
                        .setPlaceholder('➖ Retirer')
                        .setMinValues(1)
                        .setMaxValues(Math.max(1, updatedPerms.length))
                        .addOptions(updatedPerms.length > 0
                            ? updatedPerms.map(cmd => ({ label: cmd, value: cmd }))
                            : [{ label: 'Aucune permission', value: 'none', default: true }]);

                    const backButton = new ButtonBuilder()
                        .setCustomId('back')
                        .setLabel('⬅️ Retour')
                        .setStyle(ButtonStyle.Secondary);

                    await sentMessage.edit({
                        embeds: [generateTargetEmbed(type, name, updatedPerms)],
                        components: [
                            new ActionRowBuilder().addComponents(addMenu),
                            new ActionRowBuilder().addComponents(removeMenu),
                            new ActionRowBuilder().addComponents(backButton)
                        ]
                    });
                };

                // Première génération des menus
                await refreshMenusAndEmbed();

                const subCollector = sentMessage.createMessageComponentCollector({
                    filter: i => i.user.id === message.author.id,
                    time: 120_000
                });

                subCollector.on('collect', async btn => {
                    await btn.deferUpdate().catch(() => {});

                    if (btn.customId === 'back') {
                        subCollector.stop();
                        return sentMessage.edit({ embeds: [generateMainEmbed()], components: [row] });
                    }

                    if (btn.customId === 'add') {
                        for (const cmd of btn.values) {
                            type === 'user'
                                ? permsUtils.addCommandPermission(id, cmd)
                                : permsUtils.addRolePermission(id, cmd);
                        }
                    }

                    if (btn.customId === 'remove' && btn.values[0] !== 'none') {
                        for (const cmd of btn.values) {
                            type === 'user'
                                ? permsUtils.removeCommandPermission(id, cmd)
                                : permsUtils.removeRolePermission(id, cmd);
                        }
                    }

                    // ✅ Mise à jour en temps réel après chaque action
                    await refreshMenusAndEmbed();
                });

                subCollector.on('end', () => {
                    sentMessage.edit({ embeds: [generateMainEmbed()], components: [row] }).catch(() => {});
                });
            }
        });

        collector.on('end', () => {
            sentMessage.edit({ components: [new ActionRowBuilder().addComponents(typeMenu.setDisabled(true))] }).catch(() => {});
        });
    }
};
