const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { hasPermission, isOwner, isBuyer, getOwners } = require('../utils/permissions');
const database = require('../utils/database');

// Charger les données laisse depuis PostgreSQL
async function loadLaisseData() {
    try {
        const result = await database.query('SELECT owner_id, user_id FROM laisse_data');
        const data = {};
        
        result.rows.forEach(row => {
            if (!data[row.owner_id]) {
                data[row.owner_id] = [];
            }
            data[row.owner_id].push(row.user_id);
        });
        
        return data;
    } catch (error) {
        console.error('Erreur chargement données laisse:', error);
        return {};
    }
}

// Sauvegarder les données laisse dans PostgreSQL
async function saveLaisseData(data) {
    try {
        // Supprimer toutes les données existantes
        await database.query('DELETE FROM laisse_data');
        
        // Insérer les nouvelles données
        for (const [ownerId, users] of Object.entries(data)) {
            for (const userId of users) {
                await database.query(
                    'INSERT INTO laisse_data (owner_id, user_id) VALUES ($1, $2)',
                    [ownerId, userId]
                );
            }
        }
        return true;
    } catch (error) {
        console.error('Erreur sauvegarde données laisse:', error);
        return false;
    }
}

async function sendTempEmbed(message, content, delay = 3000) {
    const embed = new EmbedBuilder()
        .setDescription(content)
        .setColor('#2F3136')
        .setTimestamp();
    
    const msg = await message.channel.send({ embeds: [embed] });
    setTimeout(() => msg.delete().catch(() => {}), delay);
    return msg;
}

module.exports = {
    name: 'laisse',
    description: 'Gère la liste des utilisateurs en laisse',
    async execute(client, message, args) {
        if (!await hasPermission(message.author, 'laisse', message.guild)) {
            return sendTempEmbed(message, "❌ Permission refusée", 3000);
        }

        if (args.length === 0) {
            return sendTempEmbed(message, "**Usage:** `=laisse <add/remove/list/clear/clearall> [@user/ID]`", 5000);
        }

        const action = args[0].toLowerCase();
        const laisseData = await loadLaisseData(); // ← Changé ici
        const authorId = message.author.id;

        // Vérifier si l'utilisateur est owner pour certaines actions
        if (!await isOwner(authorId) && !await isBuyer(authorId)) { // ← Changé ici
            return sendTempEmbed(message, "❌ Cette commande est réservée aux owners", 3000);
        }


        switch (action) {
            case 'add':
            case 'remove':
                if (args.length < 2) {
                    return sendTempEmbed(message, `**Usage:** \`=laisse ${action} @user/ID\``, 5000);
                }

                const targetUser = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
                if (!targetUser) {
                    return sendTempEmbed(message, "❌ Utilisateur introuvable", 3000);
                }

                if (action === 'add') {
                    // Ajouter à la laisse
                    if (!laisseData[authorId]) {
                        laisseData[authorId] = [];
                    }

                    if (laisseData[authorId].includes(targetUser.id)) {
                        return sendTempEmbed(message, `❌ ${targetUser.user.tag} est déjà dans votre liste`, 3000);
                    }

                    laisseData[authorId].push(targetUser.id);
                    
                    // Modifier le pseudo avec emoji chien et nom de l'owner
                    try {
                        const ownerName = message.author.username;
                        await targetUser.setNickname(`🐶 ${targetUser.user.username} (${ownerName})`);
                    } catch (error) {
                        if (error.code === 50013) { // Missing Permissions
                            console.warn(`⚠️ Impossible de changer le pseudo de ${targetUser.user.tag} : Permissions manquantes`);
                            sendTempEmbed(message, `⚠️ Je n'ai pas les permissions pour changer le pseudo de ${targetUser.user.tag}`, 5000);
                        } else {
                            console.error('Erreur inattendue lors du changement de pseudo:', error);
                        }
                    }

                    if (saveLaisseData(laisseData)) {
                        const embed = new EmbedBuilder()
                            .setTitle('✅ AJOUTÉ À LA LAISSE')
                            .setDescription(`${targetUser.user.tag} a été ajouté à votre liste`)
                            .setColor('#00FF00')
                            .setTimestamp();
                        await message.channel.send({ embeds: [embed] });
                    } else {
                        return sendTempEmbed(message, "❌ Erreur lors de la sauvegarde", 3000);
                    }

                } else {
                    // Retirer de la laisse
                    if (!laisseData[authorId] || !laisseData[authorId].includes(targetUser.id)) {
                        return sendTempEmbed(message, `❌ ${targetUser.user.tag} n'est pas dans votre liste`, 3000);
                    }

                    laisseData[authorId] = laisseData[authorId].filter(id => id !== targetUser.id);
                    
                    // Réinitialiser le pseudo
                    try {
                        await targetUser.setNickname(null);
                    } catch (error) {
                        if (error.code === 50013) {
                            console.warn(`⚠️ Impossible de réinitialiser le pseudo de ${targetUser.user.tag} : Permissions manquantes`);
                        } else {
                            console.error('Erreur inattendue lors de la réinitialisation du pseudo:', error);
                        }
                    }

                    if (saveLaisseData(laisseData)) {
                        const embed = new EmbedBuilder()
                            .setTitle('✅ RETIRÉ DE LA LAISSE')
                            .setDescription(`${targetUser.user.tag} a été retiré de votre liste`)
                            .setColor('#00FF00')
                            .setTimestamp();
                        await message.channel.send({ embeds: [embed] });
                    } else {
                        return sendTempEmbed(message, "❌ Erreur lors de la sauvegarde", 3000);
                    }
                }
                break;

            case 'list':
                await handleListCommand(message, args, laisseData);
                break;

            case 'clear':
                if (args.length >= 2) {
                    // Clear pour un owner spécifique
                    const targetOwnerId = args[1].replace(/[<@!>]/g, '');
                    if (!laisseData[targetOwnerId] || laisseData[targetOwnerId].length === 0) {
                        return sendTempEmbed(message, "❌ Aucun utilisateur dans la liste de cet owner", 3000);
                    }

                    // Réinitialiser les pseudos des utilisateurs de cet owner
                    for (const userId of laisseData[targetOwnerId]) {
                        try {
                            const member = await message.guild.members.fetch(userId);
                            await member.setNickname(null);
                        } catch (error) {
                            console.error('Erreur lors de la réinitialisation du pseudo:', error);
                        }
                    }

                    delete laisseData[targetOwnerId];
                    if (saveLaisseData(laisseData)) {
                        const embed = new EmbedBuilder()
                            .setTitle('✅ LISTE VIDÉE')
                            .setDescription(`Liste de <@${targetOwnerId}> a été vidée`)
                            .setColor('#00FF00')
                            .setTimestamp();
                        await message.channel.send({ embeds: [embed] });
                    }
                } else {
                    // Clear pour l'utilisateur actuel
                    if (!laisseData[authorId] || laisseData[authorId].length === 0) {
                        return sendTempEmbed(message, "❌ Votre liste est déjà vide", 3000);
                    }

                    // Réinitialiser les pseudos
                    for (const userId of laisseData[authorId]) {
                        try {
                            const member = await message.guild.members.fetch(userId);
                            await member.setNickname(null);
                        } catch (error) {
                            console.error('Erreur lors de la réinitialisation du pseudo:', error);
                        }
                    }

                    delete laisseData[authorId];
                    if (saveLaisseData(laisseData)) {
                        const embed = new EmbedBuilder()
                            .setTitle('✅ LISTE VIDÉE')
                            .setDescription('Votre liste a été vidée')
                            .setColor('#00FF00')
                            .setTimestamp();
                        await message.channel.send({ embeds: [embed] });
                    }
                }
                break;

            case 'clearall':
                if (!isBuyer(authorId)) {
                    return sendTempEmbed(message, "❌ Cette action est réservée au buyer", 3000);
                }

                // Réinitialiser tous les pseudos
                for (const ownerId in laisseData) {
                    for (const userId of laisseData[ownerId]) {
                        try {
                            const member = await message.guild.members.fetch(userId);
                            await member.setNickname(null);
                        } catch (error) {
                            console.error('Erreur lors de la réinitialisation du pseudo:', error);
                        }
                    }
                }

                // Vider toutes les données
                if (saveLaisseData({})) {
                    const embed = new EmbedBuilder()
                        .setTitle('✅ TOUTES LES LISTES VIDÉES')
                        .setDescription('Toutes les listes de laisse ont été vidées')
                        .setColor('#00FF00')
                        .setTimestamp();
                    await message.channel.send({ embeds: [embed] });
                }
                break;

            default:
                return sendTempEmbed(message, "**Actions valides:** `add`, `remove`, `list`, `clear`, `clearall`", 5000);
        }
    }
};

async function handleListCommand(message, args, laisseData) {
    const owners = await getOwners() || []; // Vérifie que owners est défini
    const buyerId = message.client.config.buyer || null;

    if (args.length >= 2) {
        const targetOwnerId = args[1].replace(/[<@!>]/g, '');
        if (!owners.includes(targetOwnerId) && targetOwnerId !== buyerId) {
            return sendTempEmbed(message, "❌ Cet utilisateur n'est pas owner", 3000);
        }

        const users = laisseData[targetOwnerId] || [];
        if (users.length === 0) {
            return sendTempEmbed(message, `<@${targetOwnerId}> n'a personne en laisse`, 3000);
        }

        const userList = await Promise.all(
            users.map(async userId => {
                try {
                    const user = await message.client.users.fetch(userId);
                    return `• ${user.tag} (\`${userId}\`)`;
                } catch {
                    return `• Utilisateur inconnu (\`${userId}\`)`;
                }
            })
        );

        const embed = new EmbedBuilder()
            .setTitle('📝 LISTE DE LAISSE')
            .setDescription(`**Owner:** <@${targetOwnerId}>\n\n${userList.join('\n')}`)
            .setFooter({ text: `Total: ${userList.length} utilisateur(s)` })
            .setColor('#2F3136')
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    } else {
        // Menu déroulant
        const allOwners = [buyerId, ...owners].filter(Boolean);
        if (allOwners.length === 0) return sendTempEmbed(message, "❌ Aucun owner configuré", 3000);

        const options = await Promise.all(allOwners.map(async ownerId => {
            let ownerTag = `Owner ${allOwners.indexOf(ownerId) + 1}`;
            try {
                const user = await message.client.users.fetch(ownerId);
                ownerTag = user.tag;
            } catch {}
            const count = laisseData[ownerId]?.length || 0;
            return { label: ownerTag, description: `${count} utilisateur(s) en laisse`, value: ownerId };
        }));

        const menu = new StringSelectMenuBuilder()
            .setCustomId('laisse_owner_select')
            .setPlaceholder('Sélectionnez un owner')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(menu);

        const embed = new EmbedBuilder()
            .setTitle('📝 LISTES DE LAISSE')
            .setDescription('Sélectionnez un owner pour voir sa liste')
            .setColor('#2F3136')
            .setTimestamp();

        const sentMessage = await message.channel.send({ embeds: [embed], components: [row] });
        const filter = i => i.user.id === message.author.id;
        const collector = sentMessage.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            const selectedOwnerId = i.values[0];
            const userList = laisseData[selectedOwnerId]?.map(uid => `• <@${uid}>`) || [];
            const selectedEmbed = new EmbedBuilder()
                .setTitle('📝 LISTE DE LAISSE')
                .setDescription(`**Owner:** <@${selectedOwnerId}>\n\n${userList.join('\n') || 'Aucun utilisateur en laisse'}`)
                .setFooter({ text: `Total: ${userList.length} utilisateur(s)` })
                .setColor('#2F3136')
                .setTimestamp();

            await i.update({ embeds: [selectedEmbed], components: [row] });
        });

        collector.on('end', () => sentMessage.edit({ components: [] }).catch(() => {}));
    }
}

// Fonction pour gérer le mouvement vocal automatique
function setupVoiceAutoJoin(client) {
    client.on('voiceStateUpdate', async (oldState, newState) => {
        const laisseData = loadLaisseData();
        
        // Cas 1: Un owner change de salon vocal → les toutous le suivent
        if (newState.channelId && oldState.channelId && newState.channelId !== oldState.channelId) {
            const movingUserId = newState.member.id;
            
            // Vérifier si c'est un owner qui bouge
            if (laisseData[movingUserId] && laisseData[movingUserId].length > 0) {
                console.log(`[VOICE] Owner ${newState.member.user.tag} change de salon`);
                
                for (const toutouId of laisseData[movingUserId]) {
                    try {
                        const toutouMember = newState.guild.members.cache.get(toutouId);
                        
                        if (toutouMember && toutouMember.voice.channelId) {
                            // Si le toutou est dans le même salon que l'owner AVANT le changement
                            if (toutouMember.voice.channelId === oldState.channelId) {
                                await toutouMember.voice.setChannel(newState.channelId);
                                console.log(`[VOICE] ${toutouMember.user.tag} a suivi son owner dans ${newState.channel.name}`);
                            }
                            // Si le toutou est déjà dans un vocal mais pas le même que l'owner
                            else if (toutouMember.voice.channelId !== newState.channelId) {
                                await toutouMember.voice.setChannel(newState.channelId);
                                console.log(`[VOICE] ${toutouMember.user.tag} a rejoint son owner dans ${newState.channel.name}`);
                            }
                        }
                    } catch (error) {
                        if (error.code === 40032) {
                            console.log(`[VOICE] ${toutouId} n'est pas connecté`);
                        } else {
                            console.error(`[VOICE] Erreur avec ${toutouId}:`, error.message);
                        }
                    }
                }
            }
        }
        
        // Cas 2: Un toutou rejoint un vocal → il rejoint son owner
        if (newState.channelId && !oldState.channelId) {
            const joiningUserId = newState.member.id;
            
            // Chercher si c'est un toutou
            for (const [ownerId, toutous] of Object.entries(laisseData)) {
                if (toutous.includes(joiningUserId)) {
                    const ownerMember = newState.guild.members.cache.get(ownerId);
                    
                    if (ownerMember && ownerMember.voice.channelId && ownerMember.voice.channelId !== newState.channelId) {
                        try {
                            await newState.member.voice.setChannel(ownerMember.voice.channelId);
                            console.log(`[VOICE] ${newState.member.user.tag} a rejoint son owner ${ownerMember.user.tag}`);
                        } catch (error) {
                            if (error.code !== 40032) {
                                console.error(`[VOICE] Erreur déplacement toutou:`, error.message);
                            }
                        }
                    }
                    break;
                }
            }
        }
        
        // Cas 3: Un owner rejoint un vocal → ses toutous le rejoignent
        if (newState.channelId && !oldState.channelId) {
            const joiningUserId = newState.member.id;
            
            // Vérifier si c'est un owner qui rejoint
            if (laisseData[joiningUserId] && laisseData[joiningUserId].length > 0) {
                console.log(`[VOICE] Owner ${newState.member.user.tag} rejoint un vocal`);
                
                for (const toutouId of laisseData[joiningUserId]) {
                    try {
                        const toutouMember = newState.guild.members.cache.get(toutouId);
                        
                        if (toutouMember && toutouMember.voice.channelId && toutouMember.voice.channelId !== newState.channelId) {
                            await toutouMember.voice.setChannel(newState.channelId);
                        }
                    } catch (error) {
                        if (error.code !== 40032) {
                            console.error(`[VOICE] Erreur rejoindre owner:`, error.message);
                        }
                    }
                }
            }
        }
        
        // CAS 6: Un toutou change de salon vocal → il rejoint son owner
        if (newState.channelId && oldState.channelId && newState.channelId !== oldState.channelId) {
            const movingUserId = newState.member.id;
            
            // Vérifier si c'est un toutou qui change de salon
            for (const [ownerId, toutous] of Object.entries(laisseData)) {
                if (toutous.includes(movingUserId)) {
                    const ownerMember = newState.guild.members.cache.get(ownerId);
                    
                    // Si l'owner est dans un vocal différent, ramener le toutou vers lui
                    if (ownerMember && ownerMember.voice.channelId && ownerMember.voice.channelId !== newState.channelId) {
                        try {
                            await newState.member.voice.setChannel(ownerMember.voice.channelId);
                        } catch (error) {
                            if (error.code !== 40032) {
                                console.error(`[VOICE] Erreur ramener toutou:`, error.message);
                            }
                        }
                    }
                    break;
                }
            }
        }
        
        // Cas 4: Un owner quitte un vocal → les toutous restent (comportement actuel)
        // Cas 5: Un toutou quitte un vocal → rien à faire
    });
}

// Exportez la fonction pour pouvoir l'utiliser dans index.js
module.exports.setupVoiceAutoJoin = setupVoiceAutoJoin;