const { hasPermission } = require('../utils/permissions');
const { EmbedBuilder } = require('discord.js');

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
    name: 'voicemove',
    aliases: ['mv'],
    description: 'Déplace un membre vers un salon vocal spécifié ou vers votre salon actuel',
    async execute(client, message, args) {
        if (!hasPermission(message.author, 'voicemove', message.guild)) {
            return sendTempEmbed(message, "❌ Permission refusée", 3000);
        }

        const usedCommand = message.content.split(' ')[0];

        // Vérifier si l'utilisateur a fourni au moins une cible
        if (args.length < 1) {
            return sendTempEmbed(message, `**Usage:** \`${usedCommand} <@user/ID> [salon/ID]\``, 5000);
        }

        const targetUser = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        
        // Déterminer le salon cible
        let targetChannel;
        
        // Si un deuxième argument est fourni, l'utiliser comme salon cible
        if (args.length >= 2) {
            targetChannel = message.guild.channels.cache.get(args[1].replace(/[<#>]/g, ''));
        } 
        // Sinon, utiliser le salon vocal de l'auteur de la commande
        else {
            const authorVoiceChannel = message.member.voice.channel;
            if (!authorVoiceChannel) {
                return sendTempEmbed(message, "❌ Vous devez être dans un salon vocal ou spécifier un salon cible", 3000);
            }
            targetChannel = authorVoiceChannel;
        }

        if (!targetUser) {
            return sendTempEmbed(message, "❌ Utilisateur introuvable", 3000);
        }

        if (!targetUser.voice.channel) {
            return sendTempEmbed(message, "❌ L'utilisateur n'est pas dans un salon vocal", 3000);
        }

        if (!targetChannel || targetChannel.type !== 2) {
            return sendTempEmbed(message, "❌ Salon vocal invalide", 3000);
        }

        // Vérifier que l'utilisateur ne tente pas de se déplacer lui-même vers son propre salon
        if (targetUser.id === message.author.id && targetChannel.id === message.member.voice.channel?.id) {
            return sendTempEmbed(message, "❌ Vous êtes déjà dans ce salon vocal", 3000);
        }

        try {
            await targetUser.voice.setChannel(targetChannel);
            
            const successEmbed = new EmbedBuilder()
                .setTitle('DÉPLACEMENT RÉUSSI')
                .setDescription(`${targetUser.user.tag} a été déplacé dans ${targetChannel.name}`)
                .setColor('#2F3136')
                .setTimestamp();
                
            await message.channel.send({ embeds: [successEmbed] });
            
        } catch (err) {
            console.error('VoiceMove Error:', err);
            return sendTempEmbed(message, "❌ Erreur lors du déplacement - Vérifiez les permissions", 3000);
        }
    }

};
