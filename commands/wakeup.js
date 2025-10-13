const { EmbedBuilder } = require('discord.js');
const { hasPermission } = require('../utils/permissions');

const activeWakeups = new Map();

module.exports = {
    name: 'wakeup',
    description: 'Déplace un utilisateur plusieurs fois pour le réveiller',
    async execute(client, message, args) {
        if (!hasPermission(message.author, 'wakeup', message.guild)) {
            return message.channel.send({ embeds: [
                new EmbedBuilder()
                    .setTitle('PERMISSION REFUSÉE')
                    .setDescription('Vous n\'avez pas la permission d\'utiliser cette commande.')
                    .setColor('#2F3136')
                    .setTimestamp()
            ]});
        }

        const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!target) {
            return message.channel.send({ embeds: [
                new EmbedBuilder()
                    .setTitle('UTILISATEUR INTROUVABLE')
                    .setDescription('Veuillez mentionner un utilisateur valide.')
                    .setColor('#2F3136')
                    .setTimestamp()
            ]});
        }

        const movesCount = Math.min(parseInt(args[1]) || 5, 10);
        const intervalDuration = 3000; // 3s par move
        const duration = movesCount * intervalDuration; 
        const initialChannelId = target.voice.channelId;
        const channels = message.guild.channels.cache.filter(
            c => c.type === 2 && c.permissionsFor(target).has('CONNECT')
        );

        if (channels.size < 2) {
            return message.channel.send({ embeds: [
                new EmbedBuilder()
                    .setTitle('ERREUR')
                    .setDescription('Pas assez de salons accessibles pour déplacer l’utilisateur.')
                    .setColor('#2F3136')
                    .setTimestamp()
            ]});
        }

        if (activeWakeups.has(target.id)) {
            return message.channel.send({ embeds: [
                new EmbedBuilder()
                    .setTitle('WAKEUP DÉJÀ EN COURS')
                    .setDescription('Un wakeup est déjà en cours pour cet utilisateur.')
                    .setColor('#2F3136')
                    .setTimestamp()
            ]});
        }

        let movesDone = 0;
        let elapsed = 0;
        activeWakeups.set(target.id, true);

        // Embed de suivi en temps réel
        const statusEmbed = new EmbedBuilder()
            .setTitle('WAKEUP EN COURS')
            .setDescription(`Utilisateur : <@${target.id}>\nDéplacements : ${movesDone}/${movesCount}\nTemps écoulé : 0s / ${duration/1000}s`)
            .setColor('#2F3136')
            .setTimestamp();

        const statusMessage = await message.channel.send({ embeds: [statusEmbed] });

        const moveUser = async () => {
            elapsed += intervalDuration;

            if (target.voice.channel) {
                const availableChannels = channels.filter(c => c.id !== target.voice.channelId);
                const randomChannel = availableChannels.random();
                if (randomChannel) {
                    try {
                        await target.voice.setChannel(randomChannel);
                        movesDone++;
                    } catch (err) {
                        if (err.code !== 40032) console.log('Erreur wakeup move:', err);
                    }
                }
            }

            // Mise à jour de l'embed
            const newEmbed = new EmbedBuilder()
                .setTitle('WAKEUP EN COURS')
                .setDescription(`Utilisateur : <@${target.id}>\nDéplacements : ${movesDone}/${movesCount}\nTemps écoulé : ${Math.min(elapsed/1000,duration/1000)}s / ${duration/1000}s`)
                .setColor('#2F3136')
                .setTimestamp();

            statusMessage.edit({ embeds: [newEmbed] });
        };

        const interval = setInterval(moveUser, intervalDuration);

        // Stop après le temps total
        setTimeout(async () => {
            clearInterval(interval);
            activeWakeups.delete(target.id);

            try {
                const initialChannel = message.guild.channels.cache.get(initialChannelId);
                if (initialChannel) await target.voice.setChannel(initialChannel);
            } catch (err) {
                if (err.code !== 40032) console.log('Erreur retour salon initial:', err);
            }

            const finalEmbed = new EmbedBuilder()
                .setTitle('WAKEUP TERMINÉ')
                .setDescription(`Wakeup terminé pour <@${target.id}>. Nombre de déplacements effectués : ${movesDone}/${movesCount}.`)
                .setColor('#2F3136')
                .setTimestamp();

            statusMessage.edit({ embeds: [finalEmbed] });
        }, duration);
    }
};
