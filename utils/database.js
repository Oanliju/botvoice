const { Client } = require('pg');
const logger = require('./logger');

class Database {
    constructor() {
        this.client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        this.connected = false;
    }

    async connect() {
        if (this.connected) return;
        
        try {
            await this.client.connect();
            this.connected = true;
            logger.info('✅ Connecté à PostgreSQL');
            
            // Initialiser les tables
            await this.initTables();
        } catch (error) {
            logger.error('❌ Erreur connexion PostgreSQL:', error);
            throw error;
        }
    }

    async initTables() {
        // Table pour la configuration principale
        await this.client.query(`
            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        // Table pour les données laisse
        await this.client.query(`
            CREATE TABLE IF NOT EXISTS laisse_data (
                owner_id TEXT,
                user_id TEXT,
                PRIMARY KEY (owner_id, user_id)
            )
        `);

        logger.info('✅ Tables PostgreSQL initialisées');
    }

    async query(text, params) {
        await this.connect();
        return await this.client.query(text, params);
    }
}

module.exports = new Database();