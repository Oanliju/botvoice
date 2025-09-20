// utils/commandHandler.js
const fs = require('fs');
const path = require('path');
const { hasPermission } = require('./permissions');
const { EmbedBuilder } = require('discord.js');

// Liste des commandes vocales qui doivent être loggées
const voiceCommands = [
    'voicemove', 'swap', 'wakeup',
    'rolemove', 'voicekick', 'voicemute', 'voicedeaf'
];

const logChannelId = '1419001461173518397';

/**
 * Charge toutes les commandes depuis le dossier /commands
 */
function loadCommands(client) {
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('name' in command && 'execute' in command) {
            client.commands.set(command.name, command);
        } else {
            console.log(`[AVERTISSEMENT] La commande ${file} n'a pas de propriété "name" ou "execute".`);
        }
    }
}

/**
 * Gère l'exécution des commandes + logs pour les commandes vocales
 */
async function commandHandler(client, message, commandName, args) {
    let command = client.commands.get(commandName);

    // Vérifie les alias
    if (!command) {
        command = client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    }

    if (!command) return; // Commande inexistante

    try {
        // Exécute la commande (peut retourner logInfo si c'est une commande vocale)
        const logInfo = await command.execute(client, message, args);

        // --- Logging automatique pour les commandes vocales ---
        if (voiceCommands.includes(commandName) && logInfo) {
            try {
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

                await logChannel.send({ embeds: [embed] });
            } catch (logError) {
                console.error(`Erreur lors de l'envoi du log pour ${commandName}:`, logError);
            }
        }

    } catch (error) {
        console.error(`Erreur lors de l'exécution de la commande ${commandName}:`, error);
        message.channel.send('Une erreur s\'est produite lors de l\'exécution de cette commande.');
    }
}

module.exports = {
    loadCommands,
    commandHandler
};

