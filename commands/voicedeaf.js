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
    name: 'voicedeaf',
    aliases: ['deaf', 'vd'],
    description: 'Mute casque un membre',
    async execute(client, message, args) {
        if (!hasPermission(message.author, 'voicedeaf', message.guild)) {
            return sendTempEmbed(message, "❌ Permission refusée", 3000);
        }

        if (args.length < 1) {
            return sendTempEmbed(message, `**Usage:** \`=voicedeaf <@user/ID> [raison]\``, 5000);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) return sendTempEmbed(message, "❌ Membre introuvable", 3000);
        if (!member.voice.channel) return sendTempEmbed(message, "❌ Le membre n'est pas en vocal", 3000);

        const reason = args.slice(1).join(' ') || 'Aucune raison spécifiée';

        try {
            await member.voice.setDeaf(true, reason);
            
            const embed = new EmbedBuilder()
                .setTitle('MUTE CASQUE APPLIQUÉ')
                .setDescription(`**${member.user.tag}** ne peut plus entendre`)
                .addFields(
                    { name: 'Raison', value: reason, inline: true },
                    { name: 'Modérateur', value: message.author.tag, inline: true }
                )
                .setColor('#2F3136')
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            sendTempEmbed(message, "❌ Erreur lors de l'application du mute casque", 3000);
        }
    }
};