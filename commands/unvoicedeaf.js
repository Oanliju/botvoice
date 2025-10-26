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

// =unvoicedeaf <@user/ID> [raison] → Retire le mute casque
module.exports = {
    name: 'unvoicedeaf',
    aliases: ['undeaf', 'unvd'],
    description: 'Retire le mute casque d\'un membre',
    async execute(client, message, args) {
        if (!await hasPermission(message.author, 'unvoicedeaf', message.guild)) {
            return sendTempEmbed(message, "❌ Permission refusée", 3000);
        }

        if (args.length < 1) {
            return sendTempEmbed(message, `**Usage:** \`=unvoicedeaf <@user/ID> [raison]\``, 5000);
        }

        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) return sendTempEmbed(message, "❌ Membre introuvable", 3000);
        if (!member.voice.channel) return sendTempEmbed(message, "❌ Le membre n'est pas en vocal", 3000);

        const reason = args.slice(1).join(' ') || 'Aucune raison spécifiée';

        try {
            await member.voice.setDeaf(false, reason);
            
            const embed = new EmbedBuilder()
                .setTitle('MUTE CASQUE RETIRÉ')
                .setDescription(`**${member.user.tag}** peut à nouveau entendre`)
                .addFields(
                    { name: 'Raison', value: reason, inline: true },
                    { name: 'Modérateur', value: message.author.tag, inline: true }
                )
                .setColor('#2F3136')
                .setTimestamp();

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            sendTempEmbed(message, "❌ Erreur lors du retrait du mute casque", 3000);
        }
    }
};