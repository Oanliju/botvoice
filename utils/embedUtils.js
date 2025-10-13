const { EmbedBuilder } = require('discord.js');

function createEmbed(title, description, color = '#0099ff') {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp();
}

function successEmbed(description) {
    return createEmbed('✅ Succès', description, '#00ff00');
}

function errorEmbed(description) {
    return createEmbed('❌ Erreur', description, '#ff0000');
}

function warningEmbed(description) {
    return createEmbed('⚠️ Avertissement', description, '#ffff00');
}

function infoEmbed(description) {
    return createEmbed('ℹ️ Information', description, '#0099ff');
}

module.exports = {
    createEmbed,
    successEmbed,
    errorEmbed,
    warningEmbed,
    infoEmbed
};