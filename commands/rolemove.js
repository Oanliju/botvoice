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
    name: 'rolemove',
    description: 'Déplace tous les membres d’un rôle dans un salon vocal',
    async execute(client, message, args) {
        if (!hasPermission(message.author, 'rolemove', message.guild)) {
            return sendTempEmbed(message, "❌ Permission refusée", 3000);
        }

        if (args.length < 1) {
            return sendTempEmbed(message, `**Usage:** \`=rolemove <@role/ID> [salon/ID]\``, 5000);
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        if (!role) return sendTempEmbed(message, "❌ Rôle introuvable", 3000);

        let targetChannel;
        if (args.length >= 2) {
            targetChannel = message.guild.channels.cache.get(args[1].replace(/[<#>]/g, ''));
        } else {
            targetChannel = message.member.voice.channel;
        }

        if (!targetChannel || targetChannel.type !== 2) {
            return sendTempEmbed(message, "❌ Salon vocal invalide ou non spécifié", 3000);
        }

        const membersToMove = role.members.filter(m => m.voice.channel);
        if (membersToMove.size === 0) {
            return sendTempEmbed(message, "ℹ️ Aucun membre de ce rôle n’est en vocal", 3000);
        }

        let moved = 0;
        for (const [id, member] of membersToMove) {
            try {
                await member.voice.setChannel(targetChannel);
                moved++;
            } catch (e) {
                console.error(`Erreur lors du déplacement de ${member.user.tag}`, e);
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('DÉPLACEMENT DE RÔLE')
            .setDescription(`Déplacé **${moved}** membre(s) du rôle **${role.name}** vers **${targetChannel.name}**`)
            .setColor('#2F3136')
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }
};
