const database = require('./database');

// ⚡ Charger la configuration depuis PostgreSQL
async function loadConfig() {
    try {
        const result = await database.query('SELECT value FROM config WHERE key = $1', ['config']);
        if (result.rows.length > 0) {
            return JSON.parse(result.rows[0].value);
        }
    } catch (error) {
        console.error('Erreur chargement config:', error);
    }
    
    // Config par défaut si aucune config trouvée
    return {
        buyer: '',
        owners: [],
        commandPermissions: {},
        rolePermissions: {}
    };
}

// ⚡ Sauvegarder la configuration dans PostgreSQL
async function saveConfig(config) {
    cleanupEmptyPermissions(config);
    await database.query(`
        INSERT INTO config (key, value) 
        VALUES ($1, $2)
        ON CONFLICT (key) 
        DO UPDATE SET value = EXCLUDED.value
    `, ['config', JSON.stringify(config, null, 4)]);
}

// ⚡ Nettoyer les permissions vides (identique)
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
async function getPermissions() {
    return await loadConfig();
}

// ⚡ Vérifier si utilisateur est owner
async function isOwner(userId) {
    const config = await loadConfig();
    return config.owners?.includes(userId);
}

// ⚡ Vérifier si utilisateur est buyer
async function isBuyer(userId) {
    const config = await loadConfig();
    return config.buyer === userId;
}

// ⚡ Vérifier si un utilisateur a la permission d'une commande
async function hasPermission(user, commandName, guild) {
    if (await isOwner(user.id) || await isBuyer(user.id)) return true;

    const member = guild.members.cache.get(user.id);
    if (!member) return false;

    const config = await loadConfig();

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
async function addOwner(userId) {
    const config = await loadConfig();
    if (!config.owners) config.owners = [];
    if (!config.owners.includes(userId)) {
        config.owners.push(userId);
        await saveConfig(config);
        return true;
    }
    return false;
}

// ⚡ Retirer un owner
async function removeOwner(userId) {
    const config = await loadConfig();
    if (config.owners) {
        config.owners = config.owners.filter(id => id !== userId);
        await saveConfig(config);
        return true;
    }
    return false;
}

// ⚡ Définir le buyer
async function setBuyer(userId) {
    const config = await loadConfig();
    config.buyer = userId;
    await saveConfig(config);
}

// ⚡ Ajouter permission à un utilisateur
async function addCommandPermission(userId, commandName) {
    const config = await loadConfig();
    if (!config.commandPermissions) config.commandPermissions = {};
    if (!config.commandPermissions[userId]) config.commandPermissions[userId] = [];
    if (!config.commandPermissions[userId].includes(commandName)) {
        config.commandPermissions[userId].push(commandName);
        await saveConfig(config);
        return true;
    }
    return false;
}

// ⚡ Retirer permission d'un utilisateur
async function removeCommandPermission(userId, commandName) {
    const config = await loadConfig();
    if (config.commandPermissions?.[userId]) {
        const index = config.commandPermissions[userId].indexOf(commandName);
        if (index !== -1) {
            config.commandPermissions[userId].splice(index, 1);
            await saveConfig(config);
            return true;
        }
    }
    return false;
}

// ⚡ Ajouter permission à un rôle
async function addRolePermission(roleId, commandName) {
    const config = await loadConfig();
    if (!config.rolePermissions) config.rolePermissions = {};
    if (!config.rolePermissions[roleId]) config.rolePermissions[roleId] = [];
    if (!config.rolePermissions[roleId].includes(commandName)) {
        config.rolePermissions[roleId].push(commandName);
        await saveConfig(config);
        return true;
    }
    return false;
}

// ⚡ Retirer permission d'un rôle
async function removeRolePermission(roleId, commandName) {
    const config = await loadConfig();
    if (config.rolePermissions?.[roleId]) {
        const index = config.rolePermissions[roleId].indexOf(commandName);
        if (index !== -1) {
            config.rolePermissions[roleId].splice(index, 1);
            await saveConfig(config);
            return true;
        }
    }
    return false;
}

async function getOwners() {
    const config = await loadConfig();
    return config.owners || [];
}

module.exports = {
    getPermissions,
    isOwner,
    getOwners,
    isBuyer,
    hasPermission,
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