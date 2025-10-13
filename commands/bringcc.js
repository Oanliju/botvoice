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
    name: 'bringcc',
    description: 'Déplace tous les membres d\'un salon vocal vers une catégorie (répartition aléatoire)',
    async execute(client, message, args) {
        if (!hasPermission(message.author, 'bringcc', message.guild)) {
            return sendTempEmbed(message, "❌ Permission refusée", 3000);
        }

        if (args.length < 2) {
            return sendTempEmbed(message, "**Usage:** `=bringcc #salon-source ID-catégorie`", 5000);
        }

        // Extraction des IDs
        const sourceChannelId = args[0].replace(/[<#>]/g, '');
        const categoryId = args[1].replace(/[<#>]/g, '');

        const sourceChannel = message.guild.channels.cache.get(sourceChannelId);
        const category = message.guild.channels.cache.get(categoryId);

        // Vérifications
        if (!sourceChannel || sourceChannel.type !== 2) {
            return sendTempEmbed(message, "❌ Salon source invalide", 3000);
        }

        if (!category || category.type !== 4) {
            return sendTempEmbed(message, "❌ Catégorie invalide", 3000);
        }

        // Récupérer tous les salons vocaux de la catégorie
        const targetChannels = message.guild.channels.cache.filter(
            channel => channel.type === 2 && channel.parentId === categoryId
        );

        if (targetChannels.size === 0) {
            return sendTempEmbed(message, "❌ Aucun salon vocal trouvé dans cette catégorie", 3000);
        }

        // Vérifier que le salon source n'est pas vide
        if (sourceChannel.members.size === 0) {
            return sendTempEmbed(message, "❌ Le salon source est vide", 3000);
        }

        try {
            const membersToMove = Array.from(sourceChannel.members.values());
            const targetChannelsArray = Array.from(targetChannels.values());
            let successCount = 0;
            let failCount = 0;

            // Déplacer les membres de façon aléatoire
            for (const member of membersToMove) {
                try {
                    // Sélection aléatoire d'un salon cible
                    const randomChannel = targetChannelsArray[Math.floor(Math.random() * targetChannelsArray.length)];
                    await member.voice.setChannel(randomChannel);
                    successCount++;
                } catch (error) {
                    console.error(`Erreur lors du déplacement de ${member.user.tag}:`, error);
                    failCount++;
                }
            }

            // Message de résultat
            const resultEmbed = new EmbedBuilder()
                .setTitle('RÉPARTITION ALÉATOIRE TERMINÉE')
                .setDescription(`**Salon source:** ${sourceChannel.name}\n**Catégorie cible:** ${category.name}`)
                .addFields(
                    { name: 'Membres déplacés', value: `${successCount}`, inline: true },
                    { name: 'Échecs', value: `${failCount}`, inline: true },
                    { name: 'Salons utilisés', value: `${targetChannels.size}`, inline: true }
                )
                .setColor(successCount > 0 ? '#2F3136' : '#2F3136')
                .setTimestamp();

            await message.channel.send({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('BringCC Error:', error);
            return sendTempEmbed(message, "❌ Erreur lors de la répartition des membres", 3000);
        }
    }
};