const { hasPermission, isBuyer } = require('../utils/permissions');
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
    name: 'cleanup',
    aliases: ['clearvoice', 'cv'],
    description: 'Déconnecte tous les membres d\'un salon vocal ou de tous les salons',
    async execute(client, message, args) {
        // Vérification que seul le buyer peut utiliser cette commande
        if (!isBuyer(message.author.id)) {
            return sendTempEmbed(message, "❌ Commande réservée au buyer", 3000);
        }

        if (args.length < 1) {
            return sendTempEmbed(message, `**Usage:** \`=cleanup <salon/all>\`\nEx: \`=cleanup #salon-vocal\` ou \`=cleanup all\``, 5000);
        }

        const target = args[0].toLowerCase();
        let channelsToClean = [];

        if (target === 'all') {
            // Nettoyer tous les salons vocaux du serveur
            channelsToClean = message.guild.channels.cache.filter(ch => ch.type === 2 && ch.members.size > 0);
            
            if (channelsToClean.size === 0) {
                return sendTempEmbed(message, "ℹ️ Aucun membre dans les salons vocaux", 3000);
            }
        } else {
            // Nettoyer un salon spécifique
            const channel = message.mentions.channels.first() || 
                           message.guild.channels.cache.get(args[0].replace(/[<#>]/g, ''));
            
            if (!channel || channel.type !== 2) {
                return sendTempEmbed(message, "❌ Salon vocal invalide", 3000);
            }
            
            if (channel.members.size === 0) {
                return sendTempEmbed(message, "ℹ️ Aucun membre dans ce salon vocal", 3000);
            }
            
            channelsToClean.set(channel.id, channel);
        }

        let totalDisconnected = 0;
        const results = [];

        for (const [channelId, channel] of channelsToClean) {
            let channelDisconnected = 0;
            
            for (const [memberId, member] of channel.members) {
                try {
                    await member.voice.disconnect(`Cleanup command by ${message.author.tag}`);
                    channelDisconnected++;
                    totalDisconnected++;
                } catch (error) {
                    console.error(`Erreur lors du déconnectement de ${member.user.tag}:`, error);
                }
            }
            
            if (channelDisconnected > 0) {
                results.push(`**${channel.name}**: ${channelDisconnected} membre(s) déconnecté(s)`);
            }
        }

        if (totalDisconnected === 0) {
            return sendTempEmbed(message, "ℹ️ Aucun membre n'a pu être déconnecté", 3000);
        }

        const embed = new EmbedBuilder()
            .setTitle('🧹 NETTOYAGE VOCAL COMPLET')
            .setDescription(`**${totalDisconnected}** membre(s) déconnecté(s) au total`)
            .addFields(
                { name: 'Détails par salon', value: results.join('\n') || 'Aucun résultat' },
                { name: 'Exécuté par', value: message.author.tag, inline: true },
                { name: 'Portée', value: target === 'all' ? 'Tous les salons' : 'Salon spécifique', inline: true }
            )
            .setColor('#FFA500')
            .setTimestamp()
            .setFooter({ text: 'Commande buyer • Cleanup vocal' });

        message.channel.send({ embeds: [embed] });
    }
};