/**
 * OpenNova - Entry Point
 * Advanced Minecraft Bot
 */

const fs = require('fs');
const path = require('path');
const OpenNovaBot = require('./bot');
const { Logger } = require('./logger');

const logger = new Logger('Main');

// ASCII Art Banner
console.log(`
 ██████╗ ██████╗ ███████╗███╗   ██╗███╗   ██╗ ██████╗ ██╗   ██╗ █████╗ 
██╔═══██╗██╔══██╗██╔════╝████╗  ██║████╗  ██║██╔═══██╗██║   ██║██╔══██╗
██║   ██║██████╔╝█████╗  ██╔██╗ ██║██╔██╗ ██║██║   ██║██║   ██║███████║
██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██║╚██╗██║██║   ██║╚██╗ ██╔╝██╔══██║
╚██████╔╝██║     ███████╗██║ ╚████║██║ ╚████║╚██████╔╝ ╚████╔╝ ██║  ██║
 ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═══╝ ╚═════╝   ╚═══╝  ╚═╝  ╚═╝
                    Advanced Minecraft Bot v1.0.0
`);

// Load configuration
const configPath = path.join(__dirname, '..', 'config', 'default.json');

let config;
try {
    const configFile = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configFile);
    logger.success('Configuration loaded');
} catch (error) {
    logger.error(`Failed to load config: ${error.message}`);
    logger.info('Creating default configuration...');

    // Create default config if it doesn't exist
    config = {
        bot: {
            username: 'OpenNova',
            auth: 'offline',
            host: 'localhost',
            port: 25565,
            version: '1.21.1'
        },
        settings: {
            commandPrefix: '!',
            owner: '',
            autoReconnect: true,
            reconnectDelay: 5000,
            maxReconnectAttempts: 10
        },
        features: {
            autoEat: true,
            autoArmor: true,
            webViewer: false,
            viewerPort: 3000
        },
        combat: {
            attackRange: 3,
            fleeHealthThreshold: 6,
            targetHostileMobs: true
        },
        mining: {
            placeTorches: true,
            torchLightLevel: 7,
            avoidLava: true
        }
    };
}

// Allow environment variable overrides
if (process.env.MC_HOST) config.bot.host = process.env.MC_HOST;
if (process.env.MC_PORT) config.bot.port = parseInt(process.env.MC_PORT);
if (process.env.MC_USERNAME) config.bot.username = process.env.MC_USERNAME;
if (process.env.MC_VERSION) config.bot.version = process.env.MC_VERSION;
if (process.env.MC_AUTH) config.bot.auth = process.env.MC_AUTH;

// Display configuration
logger.info('Bot Configuration:');
logger.info(`  Host: ${config.bot.host}:${config.bot.port}`);
logger.info(`  Username: ${config.bot.username}`);
logger.info(`  Version: ${config.bot.version}`);
logger.info(`  Auth: ${config.bot.auth}`);
logger.info(`  Command Prefix: ${config.settings.commandPrefix}`);

const bot = new OpenNovaBot(config);

process.on('SIGINT', () => {
    logger.info('Received SIGINT signal');
    bot.shutdown();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal');
    bot.shutdown();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.message}`);
    console.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled rejection: ${reason}`);
});

// Start the bot
bot.connect();
