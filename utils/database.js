// utils/database.js
const { Client } = require('pg');
const logger = require('./logger');

class Database {
    constructor() {
        if (!process.env.DATABASE_URL) {
            logger.error('❌ DATABASE_URL non défini — impossible de démarrer sans base de données persistante.');
            throw new Error('DATABASE_URL not defined');
        }
        

        this.client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        this.connected = false;
        this.defaultBuyer = '1367612850784440360'; // ID du buyer par défaut
        this.connectRetries = 0;
        this.maxConnectRetries = 5;
    }

    async connect() {
        if (this.connected) return;

        try {
            await this.client.connect();
            this.connected = true;
            logger.info('✅ Connecté à PostgreSQL');

            // Initialiser les tables si nécessaire (CREATE IF NOT EXISTS)
            await this.initTables();

            // Initialiser le buyer par défaut uniquement si nécessaire
            await this.initDefaultBuyer();
        } catch (error) {
            this.connectRetries++;
            logger.error(`❌ Erreur connexion PostgreSQL (tentative ${this.connectRetries}):`, error);

            if (this.connectRetries <= this.maxConnectRetries) {
                const delay = 2000 * this.connectRetries;
                logger.info(`⏳ Nouvelle tentative dans ${delay} ms`);
                await new Promise(res => setTimeout(res, delay));
                return this.connect();
            }

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

        // Table pour les données laisse (exemple)
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

            if (result.rows.length === 0) {
                // Aucune configuration : insérer une configuration par défaut (sécurisé)
                const defaultConfig = {
                    buyer: this.defaultBuyer,
                    owners: [],
                    commandPermissions: {},
                    rolePermissions: {}
                };

                await this.client.query(
                    `INSERT INTO config (key, value) VALUES ($1, $2)`,
                    ['config', JSON.stringify(defaultConfig, null, 4)]
                );
                logger.info(`✅ Config initiale insérée avec buyer par défaut: ${this.defaultBuyer}`);
                return;
            }

            // Si une config existe, ne la modifier que si buyer manquant
            const existingConfig = JSON.parse(result.rows[0].value || '{}');

            if (!existingConfig.buyer) {
                existingConfig.buyer = this.defaultBuyer;
                await this.client.query(
                    `UPDATE config SET value = $2 WHERE key = $1`,
                    ['config', JSON.stringify(existingConfig, null, 4)]
                );
                logger.info(`✅ Buyer ajouté à la config existante: ${this.defaultBuyer}`);
            } else {
                logger.info('ℹ️ Config existante trouvée, buyer déjà défini — aucune modification.');
            }
        } catch (error) {
            logger.error('❌ Erreur initialisation buyer par défaut:', error);
            // Ne pas throw ici (pour ne pas bloquer le serveur), mais log pour debug
        }
    }

    async query(text, params) {
        await this.connect();
        return await this.client.query(text, params);
    }
}

module.exports = new Database();
