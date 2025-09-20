const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionsBitField
} = require('discord.js');

const { hasPermission, isOwner, isBuyer, loadConfig, saveConfig } = require('../utils/permissions');

module.exports = {
    name: 'pv',
    description: 'Gestion des salons vocaux privés (création, configuration, suppression)',

    async execute(client, message, args) {
        let config = loadConfig();

        // ✅ Vérifier si la catégorie est définie
        if (!config.privateVoiceCategory) {
            if (!isBuyer(message.author.id)) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setColor('Red')
                        .setDescription('❌ La catégorie des salons privés n’est pas encore configurée. Contacte le buyer pour la configurer.')
                        .setFooter({ text: `Demandé par ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                    ]
                });
            }

            // ⚙️ Si le buyer lance la commande pour la 1ère fois → configuration de la catégorie
            const prompt = await message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('Yellow')
                    .setTitle('📂 Configuration de la catégorie des salons privés')
                    .setDescription('Mentionne ou envoie l’ID de la catégorie où seront créés les salons privés.\n\nExemple : `123456789012345678`')
                ]
            });

            const collected = await message.channel.awaitMessages({
                filter: m => m.author.id === message.author.id,
                max: 1,
                time: 60000
            });

            await prompt.delete().catch(() => {});

            if (!collected.size) {
                return message.channel.send('⏳ Temps écoulé. Relance la commande.');
            }

            const categoryId = collected.first().content.replace(/[^0-9]/g, '');
            const category = message.guild.channels.cache.get(categoryId);

            if (!category || category.type !== ChannelType.GuildCategory) {
                return message.channel.send('❌ Catégorie invalide. Relance la commande avec un ID correct.');
            }

            config.privateVoiceCategory = categoryId;
            saveConfig(config);

            message.channel.send(`✅ Catégorie définie sur : **${category.name}**`);
        }

        // ✅ Vérifier permissions utilisateur
        if (!isOwner(message.author.id) && !isBuyer(message.author.id)) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('Red')
                    .setDescription('❌ Vous n’avez pas la permission d’utiliser cette commande.')
                    .setFooter({ text: `Demandé par ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                ]
            });
        }

        const userId = message.author.id;
        if (!config.privateVoiceConfig) config.privateVoiceConfig = {};
        if (!config.privateVoiceConfig[userId]) config.privateVoiceConfig[userId] = {};

        const userConfig = config.privateVoiceConfig[userId];

        // Menu principal
        const menu = new StringSelectMenuBuilder()
            .setCustomId('pv_main')
            .setPlaceholder('Sélectionnez une option')
            .addOptions([
                { label: 'Créer un salon privé', value: 'create', description: 'Crée un salon vocal privé' },
                { label: 'Configurer le salon privé', value: 'config', description: 'Renomme, limite, accès…' },
                { label: 'Supprimer le salon privé', value: 'delete', description: 'Supprime ton salon privé' }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        const mainEmbed = new EmbedBuilder()
            .setTitle('⚙️ Gestion de ton salon privé')
            .setDescription('Sélectionne une action ci-dessous.\n\n> **Création** : Crée un salon privé.\n> **Configuration** : Renomme ou limite ton salon.\n> **Suppression** : Supprime le salon et réinitialise ta config.')
            .setColor('#2F3136')
            .setFooter({ text: `Demandé par ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        const sent = await message.channel.send({ embeds: [mainEmbed], components: [row] });

        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === userId,
            time: 60000
        });

        collector.on('collect', async i => {
            try {
                await i.deferUpdate();

                const choice = i.values ? i.values[0] : i.customId;

                if (choice === 'create') {
                    if (userConfig.channelId && message.guild.channels.cache.get(userConfig.channelId)) {
                        return message.channel.send({ content: '❌ Tu as déjà un salon privé existant.', ephemeral: true });
                    }

                    const category = message.guild.channels.cache.get(config.privateVoiceCategory);
                    if (!category) return message.channel.send('⚠️ Catégorie introuvable. Contacte le buyer pour la reconfigurer.');

                    const newChannel = await message.guild.channels.create({
                        name: `🔒 Privé - ${message.author.username}`,
                        type: ChannelType.GuildVoice,
                        parent: category.id,
                        permissionOverwrites: [
                            {
                                id: message.guild.id,
                                deny: [PermissionsBitField.Flags.Connect]
                            },
                            {
                                id: userId,
                                allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ManageChannels]
                            }
                        ]
                    });

                    userConfig.channelId = newChannel.id;
                    saveConfig(config);

                    message.channel.send(`✅ Salon privé créé dans ${category} : ${newChannel}`);
                }

                if (choice === 'config') {
                    if (!userConfig.channelId || !message.guild.channels.cache.get(userConfig.channelId)) {
                        return message.channel.send('❌ Aucun salon privé trouvé. Crée-en un d’abord.');
                    }

                    const configChannel = message.guild.channels.cache.get(userConfig.channelId);

                    const renameBtn = new ButtonBuilder()
                        .setCustomId('pv_rename')
                        .setLabel('Renommer')
                        .setStyle(ButtonStyle.Primary);

                    const limitBtn = new ButtonBuilder()
                        .setCustomId('pv_limit')
                        .setLabel('Changer la limite')
                        .setStyle(ButtonStyle.Secondary);

                    const toggleBtn = new ButtonBuilder()
                        .setCustomId('pv_toggle')
                        .setLabel('Public/Privé')
                        .setStyle(ButtonStyle.Success);

                    const rowConfig = new ActionRowBuilder().addComponents(renameBtn, limitBtn, toggleBtn);

                    await sent.edit({
                        embeds: [new EmbedBuilder()
                            .setTitle('🔧 Configuration du salon privé')
                            .setDescription(`Salon : ${configChannel}\nChoisis une action.`)
                            .setColor('#2F3136')],
                        components: [rowConfig]
                    });
                }

                if (choice === 'delete') {
                    if (!userConfig.channelId || !message.guild.channels.cache.get(userConfig.channelId)) {
                        return message.channel.send('❌ Aucun salon privé à supprimer.');
                    }

                    const delChannel = message.guild.channels.cache.get(userConfig.channelId);
                    await delChannel.delete().catch(() => {});
                    delete config.privateVoiceConfig[userId];
                    saveConfig(config);

                    message.channel.send('🗑️ Salon privé supprimé.');
                }

                // Gestion des boutons
                if (choice === 'pv_rename' || choice === 'pv_limit' || choice === 'pv_toggle') {
                    const configChannel = message.guild.channels.cache.get(userConfig.channelId);
                    if (!configChannel) return message.channel.send('❌ Salon introuvable.');

                    if (choice === 'pv_rename') {
                        const prompt = await message.channel.send('✏️ Envoie le nouveau nom du salon :');
                        const collected = await message.channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 30000 });

                        await prompt.delete().catch(() => {});
                        if (!collected.size) return message.channel.send('⏳ Temps écoulé.');

                        const newName = collected.first().content;
                        await configChannel.setName(newName);
                        message.channel.send(`✅ Salon renommé en **${newName}**`);
                    }

                    if (choice === 'pv_limit') {
                        const prompt = await message.channel.send('🔢 Envoie la nouvelle limite (0 pour illimitée) :');
                        const collected = await message.channel.awaitMessages({ filter: m => m.author.id === userId, max: 1, time: 30000 });

                        await prompt.delete().catch(() => {});
                        if (!collected.size) return message.channel.send('⏳ Temps écoulé.');

                        const limit = parseInt(collected.first().content, 10);
                        if (isNaN(limit) || limit < 0 || limit > 99) {
                            return message.channel.send('❌ Limite invalide (0 à 99).');
                        }

                        await configChannel.setUserLimit(limit);
                        message.channel.send(`✅ Limite mise à jour : ${limit === 0 ? 'illimitée' : limit}`);
                    }

                    if (choice === 'pv_toggle') {
                        const isPrivate = configChannel.permissionOverwrites.cache.get(message.guild.id)?.deny.has(PermissionsBitField.Flags.Connect);
                        if (isPrivate) {
                            await configChannel.permissionOverwrites.edit(message.guild.id, { Connect: true });
                            message.channel.send('✅ Salon rendu **public**.');
                        } else {
                            await configChannel.permissionOverwrites.edit(message.guild.id, { Connect: false });
                            message.channel.send('✅ Salon rendu **privé**.');
                        }
                    }
                }
            } catch (err) {
                console.error('[ERREUR pv.js]', err);
            }
        });

        collector.on('end', () => {
            sent.edit({ components: [new ActionRowBuilder().addComponents(menu.setDisabled(true))] }).catch(() => {});
        });
    }
};
