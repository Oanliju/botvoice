const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');
const { commandHandler, loadCommands } = require('./utils/commandHandler');
const { loadConfig } = require('./utils/permissions'); // Utilise le nouveau utils
const logger = require('./utils/logger');
require('dotenv').config();
const express = require('express');
const database = require('./utils/database');

// --- BOT DISCORD ---
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
client.config = {}; // On le remplira après chargement depuis la DB

// Charger les commandes au démarrage
loadCommands(client);

const laisseCommand = require('./commands/laisse');
laisseCommand.setupVoiceAutoJoin(client);

// Initialisation du bot
client.once('ready', async () => {
    try {
        // Charger la config depuis PostgreSQL
        client.config = await loadConfig();

        logger.info(`✅ Connecté en tant que ${client.user.tag}`);
        client.user.setActivity('=help | oan', { type: ActivityType.Watching });
    } catch (err) {
        logger.error('❌ Erreur lors du chargement de la config :', err);
    }
});

// Gestion des messages
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = '=';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    commandHandler(client, message, commandName, args);
});

// Connexion Discord
client.login(process.env.DISCORD_TOKEN);

// --- SERVEUR EXPRESS POUR RENDER ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Bot is running!");
});

// Endpoint health check
app.get("/healthz", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => {
    logger.info(`🌐 Serveur HTTP lancé sur le port ${PORT}`);
});

// --- Initialisation DB (PostgreSQL) ---
(async () => {
    try {
        await database.connect();
    } catch (err) {
        logger.error('❌ Impossible de connecter la base de données :', err);
    }
})();
