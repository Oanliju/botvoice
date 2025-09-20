// utils/configManager.js
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');

function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Erreur lors du chargement de la configuration :', error);
    }
    return {}; // Retourne un objet vide si aucun fichier ou erreur
}

function saveConfig(config) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de la configuration :', error);
    }
}

module.exports = { loadConfig, saveConfig };
