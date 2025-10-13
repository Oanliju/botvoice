const { Client } = require('pg');
const logger = require('./logger');

class Database {
    constructor() {
        this.client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        this.connected = false;
        this.defaultBuyer = '721302404217307157'; // ID du buyer par défaut
    }

    async connect() {
        if (this.connected) return;

        try {
            await this.client.connect();
            this.connected = true;
            logger.info('✅ Connecté à PostgreSQL');

            // Initialiser les tables
            await this.initTables();

            // Initialiser le buyer par défaut si aucune config existante
            await this.initDefaultBuyer();
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

    async initDefaultBuyer() {
        try {
            const result = await this.client.query(
                'SELECT value FROM config WHERE key = $1',
                ['config']
            );

            let config = {};
            if (result.rows.length > 0) {
                config = JSON.parse(result.rows[0].value);
            }

            if (!config.buyer) {
                config.buyer = this.defaultBuyer;
                await this.client.query(
                    `
                    INSERT INTO config (key, value)
                    VALUES ($1, $2)
                    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
                    `,
                    ['config', JSON.stringify(config, null, 4)]
                );
                logger.info(`✅ Buyer initialisé par défaut : ${this.defaultBuyer}`);
            }
        } catch (error) {
            logger.error('❌ Erreur initialisation buyer par défaut:', error);
        }
    }

    async query(text, params) {
        await this.connect();
        return await this.client.query(text, params);
    }
}

module.exports = new Database();
