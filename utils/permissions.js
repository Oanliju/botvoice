const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '..', 'config.json');

// ⚡ Charger le config.json
function loadConfig() {
    if (!fs.existsSync(configPath)) return {
        buyer: '',
        owners: [],
        commandPermissions: {},
        rolePermissions: {}
    };
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// ⚡ Sauvegarder le config.json
function saveConfig(config) {
    cleanupEmptyPermissions(config);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
}

// ⚡ Nettoyer les permissions vides
function cleanupEmptyPermissions(config) {
    if (config.commandPermissions) {
        for (const userId in config.commandPermissions) {
            if (!config.commandPermissions[userId] || config.commandPermissions[userId].length === 0) {
                delete config.commandPermissions[userId];
            }
        }
    }
    if (config.rolePermissions) {
        for (const roleId in config.rolePermissions) {
            if (!config.rolePermissions[roleId] || config.rolePermissions[roleId].length === 0) {
                delete config.rolePermissions[roleId];
            }
        }
    }
}

// ⚡ Récupérer la configuration complète
function getPermissions() {
    return loadConfig();
}

// ⚡ Vérifier si utilisateur est owner
function isOwner(userId) {
    const config = loadConfig();
    return config.owners?.includes(userId);
}

// ⚡ Vérifier si utilisateur est buyer
function isBuyer(userId) {
    const config = loadConfig();
    return config.buyer === userId;
}

// ⚡ Vérifier si un utilisateur a la permission d'une commande
function hasPermission(user, commandName, guild) {
    if (isOwner(user.id) || isBuyer(user.id)) return true;

    const member = guild.members.cache.get(user.id);
    if (!member) return false;

    const config = loadConfig();

    // Permissions par rôle
    for (const [roleId, commands] of Object.entries(config.rolePermissions || {})) {
        if (member.roles.cache.has(roleId) && commands.includes(commandName)) {
            return true;
        }
    }

    // Permissions utilisateur directes
    if (config.commandPermissions?.[user.id]?.includes(commandName)) {
        return true;
    }

    return false;
}

// ⚡ Ajouter un owner
function addOwner(userId) {
    const config = loadConfig();
    if (!config.owners) config.owners = [];
    if (!config.owners.includes(userId)) {
        config.owners.push(userId);
        saveConfig(config);
        return true;
    }
    return false;
}

// ⚡ Retirer un owner
function removeOwner(userId) {
    const config = loadConfig();
    if (config.owners) {
        config.owners = config.owners.filter(id => id !== userId);
        saveConfig(config);
        return true;
    }
    return false;
}

// ⚡ Définir le buyer
function setBuyer(userId) {
    const config = loadConfig();
    config.buyer = userId;
    saveConfig(config);
}

// ⚡ Ajouter permission à un utilisateur
function addCommandPermission(userId, commandName) {
    const config = loadConfig();
    if (!config.commandPermissions) config.commandPermissions = {};
    if (!config.commandPermissions[userId]) config.commandPermissions[userId] = [];
    if (!config.commandPermissions[userId].includes(commandName)) {
        config.commandPermissions[userId].push(commandName);
        saveConfig(config);
        return true;
    }
    return false;
}

// ⚡ Retirer permission d'un utilisateur
function removeCommandPermission(userId, commandName) {
    const config = loadConfig();
    if (config.commandPermissions?.[userId]) {
        const index = config.commandPermissions[userId].indexOf(commandName);
        if (index !== -1) {
            config.commandPermissions[userId].splice(index, 1);
            saveConfig(config);
            return true;
        }
    }
    return false;
}

// ⚡ Ajouter permission à un rôle
function addRolePermission(roleId, commandName) {
    const config = loadConfig();
    if (!config.rolePermissions) config.rolePermissions = {};
    if (!config.rolePermissions[roleId]) config.rolePermissions[roleId] = [];
    if (!config.rolePermissions[roleId].includes(commandName)) {
        config.rolePermissions[roleId].push(commandName);
        saveConfig(config);
        return true;
    }
    return false;
}

// ⚡ Retirer permission d'un rôle
function removeRolePermission(roleId, commandName) {
    const config = loadConfig();
    if (config.rolePermissions?.[roleId]) {
        const index = config.rolePermissions[roleId].indexOf(commandName);
        if (index !== -1) {
            config.rolePermissions[roleId].splice(index, 1);
            saveConfig(config);
            return true;
        }
    }
    return false;
}

module.exports = {
    getPermissions,
    isOwner,
    isBuyer,
    hasPermission, // ✅ Remise de la fonction
    addOwner,
    removeOwner,
    setBuyer,
    addCommandPermission,
    removeCommandPermission,
    addRolePermission,
    removeRolePermission,
    loadConfig,
    saveConfig
};
