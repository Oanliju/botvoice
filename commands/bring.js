const { EmbedBuilder } = require('discord.js');
const { hasPermission, isOwner, isBuyer } = require('../utils/permissions');

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
    name: 'bring',
    description: 'Déplace tous les membres d\'un salon vocal vers un autre salon',
    async execute(client, message, args) {
        if (!hasPermission(message.author, 'bring', message.guild)) {
            return sendTempEmbed(message, "❌ Permission refusée", 3000);
        }

        if (args.length < 2) {
            return sendTempEmbed(message, "**Usage:** `=bring #salon-source #salon-cible`", 5000);
        }

        // Extraction des IDs des salons
        const sourceChannelId = args[0].replace(/[<#>]/g, '');
        const targetChannelId = args[1].replace(/[<#>]/g, '');

        const sourceChannel = message.guild.channels.cache.get(sourceChannelId);
        const targetChannel = message.guild.channels.cache.get(targetChannelId);

        // Vérifications
        if (!sourceChannel || sourceChannel.type !== 2) {
            return sendTempEmbed(message, "❌ Salon source invalide", 3000);
        }

        if (!targetChannel || targetChannel.type !== 2) {
            return sendTempEmbed(message, "❌ Salon cible invalide", 3000);
        }

        if (sourceChannel.id === targetChannel.id) {
            return sendTempEmbed(message, "❌ Les salons source et cible sont identiques", 3000);
        }

        // Vérifier que le salon source n'est pas vide
        if (sourceChannel.members.size === 0) {
            return sendTempEmbed(message, "❌ Le salon source est vide", 3000);
        }

        try {
            const membersToMove = Array.from(sourceChannel.members.values());
            let successCount = 0;
            let failCount = 0;

            // Déplacer tous les membres
            for (const member of membersToMove) {
                try {
                    await member.voice.setChannel(targetChannel);
                    successCount++;
                } catch (error) {
                    console.error(`Erreur lors du déplacement de ${member.user.tag}:`, error);
                    failCount++;
                }
            }

            // Message de résultat
            const resultEmbed = new EmbedBuilder()
                .setTitle('DÉPLACEMENT TERMINÉ')
                .setDescription(`**Salon source:** ${sourceChannel.name}\n**Salon cible:** ${targetChannel.name}`)
                .addFields(
                    { name: 'Membres déplacés', value: `${successCount}`, inline: true },
                    { name: 'Échecs', value: `${failCount}`, inline: true }
                )
                .setColor(successCount > 0 ? '#2F3136' : '#2F3136')
                .setTimestamp();

            await message.channel.send({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('Bring Error:', error);
            return sendTempEmbed(message, "❌ Erreur lors du déplacement des membres", 3000);
        }
    }
};