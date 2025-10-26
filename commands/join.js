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
    name: 'join',
    description: 'Rejoint le salon vocal d\'un membre ou par ID de salon',
    async execute(client, message, args) {
        if (!await hasPermission(message.author, 'join', message.guild)) {
            return sendTempEmbed(message, "❌ Permission refusée", 3000);
        }

        if (args.length < 1) {
            return sendTempEmbed(message, "**Usage:** `=join <@user/ID|ID Salon>`", 5000);
        }

        const authorMember = message.member;
        let targetChannel;

        // Essayer de trouver par mention d'utilisateur
        const targetUser = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        
        if (targetUser) {
            // Rejoindre le salon de l'utilisateur
            targetChannel = targetUser.voice.channel;
            if (!targetChannel) {
                return sendTempEmbed(message, "❌ Cet utilisateur n'est dans aucun salon vocal", 3000);
            }
        } else {
            // Essayer de trouver par ID de salon
            targetChannel = message.guild.channels.cache.get(args[0].replace(/[<#>]/g, ''));
            
            if (!targetChannel) {
                return sendTempEmbed(message, "❌ Salon vocal introuvable", 3000);
            }
            
            if (targetChannel.type !== 2) {
                return sendTempEmbed(message, "❌ Ce n'est pas un salon vocal", 3000);
            }
        }

        // Vérifier si l'utilisateur est déjà dans le salon cible
        if (authorMember.voice.channel && authorMember.voice.channel.id === targetChannel.id) {
            return sendTempEmbed(message, "❌ Vous êtes déjà dans ce salon vocal", 3000);
        }

        // Vérifier les permissions d'accès au salon
        if (!targetChannel.permissionsFor(authorMember).has('Connect')) {
            return sendTempEmbed(message, "❌ Vous n'avez pas la permission de rejoindre ce salon", 3000);
        }

        // Vérifier si le salon est plein
        if (targetChannel.userLimit > 0 && targetChannel.members.size >= targetChannel.userLimit) {
            return sendTempEmbed(message, "❌ Le salon vocal est plein", 3000);
        }

        try {
            await authorMember.voice.setChannel(targetChannel);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ CONNEXION RÉUSSIE')
                .setDescription(`Vous avez rejoint le salon vocal : ${targetChannel.name}`)
                .addFields(
                    { name: 'SALON', value: `${targetChannel.name} (\`${targetChannel.id}\`)`, inline: true },
                    { name: 'MEMBRES', value: `**${targetChannel.members.size}** membre(s) présent(s)`, inline: true }
                )
                .setColor('#00FF00')
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
            
        } catch (err) {
            console.error('Join Error:', err);
            return sendTempEmbed(message, "❌ Erreur lors de la connexion - Vérifiez les permissions", 3000);
        }
    }
};