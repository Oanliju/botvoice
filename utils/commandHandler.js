const { isOwner, isBuyer } = require('./utils/permissions');
const { EmbedBuilder } = require('discord.js');

// Liste des commandes qui agissent sur les vocaux
const voiceCommands = [
    'voicemove', 'swap', 'laisse', 'wakeup', 
    'rolemove', 'voicekick', 'voicemute', 'voicedeaf'
];

const logChannelId = '1419001461173518397';

async function commandHandler(client, message, commandName, args) {
    let command = client.commands.get(commandName);

    // Vérifie les alias
    if (!command) {
        command = client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    }

    if (!command) return; // Commande inexistante

    try {
        // Exécute la commande
        // On suppose que chaque commande vocale retourne un objet logInfo si elle a fait une action
        const logInfo = await command.execute(client, message, args);

        // --- Logging embed pour les commandes vocales ---
        if (
            voiceCommands.includes(commandName) &&
            !isOwner(message.author.id) &&
            !isBuyer(message.author.id) &&
            logInfo
        ) {
            const logChannel = await client.channels.fetch(logChannelId);
            if (!logChannel) return;

            const embed = new EmbedBuilder()
                .setTitle(`📌 Commande vocale exécutée : ${commandName}`)
                .setColor('#5865F2')
                .setTimestamp()
                .setFooter({ text: `ID: ${message.author.id}` })
                .addFields(
                    { name: 'Auteur', value: `${message.author.tag}`, inline: true },
                    { name: 'Action', value: logInfo.action || 'N/A', inline: true },
                    { name: 'Cible', value: logInfo.target || 'N/A', inline: true },
                    { name: 'Salon source', value: logInfo.source || 'N/A', inline: true },
                    { name: 'Salon destination', value: logInfo.destination || 'N/A', inline: true },
                    { name: 'Raison / détails', value: logInfo.reason || 'Aucune' }
                );

            logChannel.send({ embeds: [embed] });
        }

    } catch (error) {
        console.error(error);
        message.channel.send('Une erreur s\'est produite lors de l\'exécution de cette commande.');
    }
}

module.exports = { commandHandler };
