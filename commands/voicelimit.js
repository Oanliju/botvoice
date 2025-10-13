const { isBuyer } = require('../utils/permissions');
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
    name: 'voicelimit',
    aliases: ['vlimit', 'vl'],
    description: 'Change ou réinitialise la limite d\'un salon vocal',
    async execute(client, message, args) {
        // Vérification que seul le buyer peut utiliser cette commande
        if (!isBuyer(message.author.id)) {
            return sendTempEmbed(message, "❌ Commande réservée au buyer", 3000);
        }

        if (args.length < 1) {
            return sendTempEmbed(message, 
                `**Usage:** \`=voicelimit [salon] <limit/reset>\`\n` +
                `Exemples:\n` +
                `• \`=voicelimit #salon 5\` → Limite à 5 membres\n` +
                `• \`=voicelimit reset\` → Réinitialise la limite du salon actuel\n` +
                `• \`=voicelimit #salon reset\` → Réinitialise la limite d'un salon spécifique`,
                7000
            );
        }

        let targetChannel;
        let limitArg;

        // Analyse des arguments
        if (args.length === 1) {
            // Format: =voicelimit <limit/reset>
            if (args[0].toLowerCase() === 'reset') {
                targetChannel = message.member.voice?.channel;
                limitArg = 'reset';
            } else if (!isNaN(args[0])) {
                targetChannel = message.member.voice?.channel;
                limitArg = parseInt(args[0]);
            } else {
                return sendTempEmbed(message, "❌ Format invalide. Utilisez un nombre ou 'reset'", 3000);
            }
        } else {
            // Format: =voicelimit [salon] <limit/reset>
            const channelArg = args[0];
            limitArg = args[1].toLowerCase() === 'reset' ? 'reset' : parseInt(args[1]);

            if (isNaN(limitArg) && limitArg !== 'reset') {
                return sendTempEmbed(message, "❌ La limite doit être un nombre ou 'reset'", 3000);
            }

            targetChannel = message.mentions.channels.first() || 
                           message.guild.channels.cache.get(channelArg.replace(/[<#>]/g, ''));
        }

        // Vérifications du salon
        if (!targetChannel) {
            return sendTempEmbed(message, "❌ Salon vocal introuvable ou non spécifié", 3000);
        }

        if (targetChannel.type !== 2) {
            return sendTempEmbed(message, "❌ Le salon doit être un salon vocal", 3000);
        }

        // Vérification de la limite
        if (limitArg !== 'reset' && (limitArg < 0 || limitArg > 99)) {
            return sendTempEmbed(message, "❌ La limite doit être entre 0 et 99", 3000);
        }

        try {
            const oldLimit = targetChannel.userLimit;
            const newLimit = limitArg === 'reset' ? 0 : limitArg;

            await targetChannel.setUserLimit(newLimit, `Commande voicelimit par ${message.author.tag}`);

            const embed = new EmbedBuilder()
                .setTitle('🎚️ LIMITE VOCAL MODIFIÉE')
                .setDescription(`**${targetChannel.name}** a été modifié`)
                .addFields(
                    { name: 'Ancienne limite', value: oldLimit === 0 ? 'Illimitée' : `${oldLimit} membres`, inline: true },
                    { name: 'Nouvelle limite', value: newLimit === 0 ? 'Illimitée' : `${newLimit} membres`, inline: true },
                    { name: 'Exécuté par', value: message.author.tag, inline: true }
                )
                .setColor('#00FF00')
                .setTimestamp()
                .setFooter({ text: 'Commande buyer • Voice Limit' });

            message.channel.send({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur voicelimit:', error);
            sendTempEmbed(message, "❌ Erreur lors de la modification de la limite", 3000);
        }
    }
};