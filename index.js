const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const { commandHandler, loadCommands } = require('./utils/commandHandler');
const { loadConfig, saveConfig } = require('./utils/configmanager');
const logger = require('./utils/logger');

require('dotenv').config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
client.config = loadConfig();

// Charger les commandes au démarrage
loadCommands(client);

const laisseCommand = require('./commands/laisse');
laisseCommand.setupVoiceAutoJoin(client);


client.once('ready', () => {
    logger.info(`✅ Connecté en tant que ${client.user.tag}`);
    client.user.setActivity('=help', { type: ActivityType.Watching });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    const prefix = '=';
    if (!message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    commandHandler(client, message, commandName, args);
});

client.login(process.env.DISCORD_TOKEN);