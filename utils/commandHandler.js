const fs = require('fs');
const path = require('path');
const { hasPermission } = require('./permissions');

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

function commandHandler(client, message, commandName, args) {
    let command = client.commands.get(commandName);

    // Vérifie les alias
    if (!command) {
        command = client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    }

    if (!command) {
        // Ne rien faire si la commande n'existe pas
        return;
    }

    try {
        command.execute(client, message, args);
    } catch (error) {
        console.error(error);
        message.channel.send('Une erreur s\'est produite lors de l\'exécution de cette commande.');
    }
}


module.exports = {
    loadCommands,
    commandHandler
};
