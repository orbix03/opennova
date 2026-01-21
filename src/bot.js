/**
 * OpenNova - Main Bot Class
 * Core bot logic, event handling, and plugin integration
 */

const mineflayer = require('mineflayer');
const pathfinderPkg = require('mineflayer-pathfinder');
const { plugin: pvpPlugin } = require('mineflayer-pvp');
const autoEatPlugin = require('mineflayer-auto-eat').default;
const armorManagerPlugin = require('mineflayer-armor-manager');
const { plugin: collectBlockPlugin } = require('mineflayer-collectblock');
const { plugin: toolPlugin } = require('mineflayer-tool');
const path = require('path');

const { Logger } = require('./logger');
const CommandLoader = require('./commands');
const PathfinderSkill = require('./skills/pathfinder');
const CombatSkill = require('./skills/combat');
const MinerSkill = require('./skills/miner');
const CrafterSkill = require('./skills/crafter');
const SurvivalSkill = require('./skills/survival');
const MemorySystem = require('./systems/memory');

class OpenNovaBot {
    constructor(config) {
        this.config = config;
        this.logger = new Logger('OpenNova');
        this.bot = null;
        this.reconnectAttempts = 0;
        this.isConnected = false;
        this.startTime = Date.now();
    }

    /**
     * Create and connect the bot
     */
    async connect() {
        this.logger.info('Connecting to server...');
        this.logger.info(`Host: ${this.config.bot.host}:${this.config.bot.port}`);
        this.logger.info(`Username: ${this.config.bot.username}`);
        this.logger.info(`Version: ${this.config.bot.version}`);

        try {
            this.bot = mineflayer.createBot({
                host: this.config.bot.host,
                port: this.config.bot.port,
                username: this.config.bot.username,
                auth: this.config.bot.auth,
                version: this.config.bot.version,
                hideErrors: false
            });

            // Attach config and references
            this.bot.config = this.config;
            this.bot.logger = this.logger;
            this.bot.startTime = this.startTime;
            this.bot.pvpEnabled = false;

            this.setupPlugins();
            this.setupSkills();
            this.setupSystems();
            this.setupCommands();
            this.setupEvents();

        } catch (error) {
            this.logger.error(`Connection failed: ${error.message}`);
            this.handleReconnect();
        }
    }

    /**
     * Load mineflayer plugins
     */
    setupPlugins() {
        this.logger.debug('Loading plugins...');

        // Load pathfinder
        this.bot.loadPlugin(pathfinderPkg.pathfinder);

        // Load PvP plugin
        this.bot.loadPlugin(pvpPlugin);

        // Load auto-eat (handle both export styles)
        if (typeof autoEatPlugin === 'function') {
            this.bot.loadPlugin(autoEatPlugin);
        } else if (autoEatPlugin && typeof autoEatPlugin.plugin === 'function') {
            this.bot.loadPlugin(autoEatPlugin.plugin);
        }

        // Load armor manager
        if (typeof armorManagerPlugin === 'function') {
            this.bot.loadPlugin(armorManagerPlugin);
        } else if (armorManagerPlugin && armorManagerPlugin.plugin) {
            this.bot.loadPlugin(armorManagerPlugin.plugin);
        }

        // Load collectblock
        this.bot.loadPlugin(collectBlockPlugin);

        // Load tool plugin
        this.bot.loadPlugin(toolPlugin);

        this.logger.debug('Plugins loaded');
    }

    /**
     * Initialize skill modules
     */
    setupSkills() {
        this.logger.debug('Initializing skills...');

        this.bot.skills = {
            pathfinder: new PathfinderSkill(this.bot, this.logger),
            combat: new CombatSkill(this.bot, this.logger, this.config),
            miner: new MinerSkill(this.bot, this.logger, this.config),
            crafter: new CrafterSkill(this.bot, this.logger),
            survival: new SurvivalSkill(this.bot, this.logger, this.config)
        };
    }

    /**
     * Initialize systems
     */
    setupSystems() {
        this.logger.debug('Initializing systems...');

        const dataDir = path.join(__dirname, '..', 'data');

        this.bot.systems = {
            memory: new MemorySystem(this.logger, dataDir)
        };
    }

    /**
     * Load command modules
     */
    setupCommands() {
        this.logger.debug('Loading commands...');

        const commandLoader = new CommandLoader(this.logger);
        commandLoader.loadCommands(path.join(__dirname, 'commands'));

        this.bot.commandRegistry = commandLoader;
    }

    /**
     * Setup event handlers
     */
    setupEvents() {
        // Spawn event
        this.bot.once('spawn', () => {
            this.logger.success('Bot spawned in world!');
            this.isConnected = true;
            this.reconnectAttempts = 0;

            // Initialize skills that need bot data
            this.bot.skills.pathfinder.initialize();
            this.bot.skills.combat.initialize();
            this.bot.skills.miner.initialize();
            this.bot.skills.crafter.initialize();
            this.bot.skills.survival.initialize();

            // Record spawn point
            this.bot.systems.memory.setSpawn(this.bot.entity.position);

            // Greeting
            setTimeout(() => {
                this.bot.chat(`OpenNova online! Type ${this.config.settings.commandPrefix}help for commands.`);
            }, 1000);
        });

        // Chat handler for commands
        this.bot.on('chat', (username, message) => {
            // Ignore own messages
            if (username === this.bot.username) return;

            this.logger.chat(username, message);

            // Check for command prefix
            const prefix = this.config.settings.commandPrefix;
            if (!message.startsWith(prefix)) return;

            // Parse command
            const args = message.slice(prefix.length).trim().split(/\s+/);
            const commandName = args.shift().toLowerCase();

            this.logger.command(username, `${prefix}${commandName} ${args.join(' ')}`);

            // Record interaction
            this.bot.systems.memory.recordInteraction(username, 'command');

            // Execute command
            this.bot.commandRegistry.execute(this.bot, commandName, args, username);
        });

        // Death handler
        this.bot.on('death', () => {
            this.logger.warn('Bot died!');

            // Record death location
            if (this.bot.entity) {
                this.bot.systems.memory.recordDeath(this.bot.entity.position);
            }

            // Stop all activities
            this.bot.skills.pathfinder.stop();
            this.bot.skills.combat.stopAttacking();
            this.bot.skills.miner.stop();

            setTimeout(() => {
                this.bot.chat('I died! Use !death to find my grave.');
            }, 2000);
        });

        // Health change
        this.bot.on('health', () => {
            if (this.bot.health <= 4) {
                this.logger.warn(`Critical health: ${this.bot.health}`);
            }
        });

        // Kicked
        this.bot.on('kicked', (reason) => {
            this.logger.error(`Kicked from server: ${reason}`);
            this.isConnected = false;
            if (this.config.settings.autoReconnect) {
                this.handleReconnect();
            }
        });

        // Error
        this.bot.on('error', (err) => {
            this.logger.error(`Bot error: ${err.message}`);
        });

        // End (disconnect)
        this.bot.on('end', (reason) => {
            this.logger.warn(`Disconnected: ${reason}`);
            this.isConnected = false;

            // Cleanup skills to prevent memory leaks
            if (this.bot.skills) {
                if (this.bot.skills.combat && this.bot.skills.combat.cleanup) {
                    this.bot.skills.combat.cleanup();
                }
                if (this.bot.skills.pathfinder && this.bot.skills.pathfinder.cleanup) {
                    this.bot.skills.pathfinder.cleanup();
                }
                if (this.bot.skills.miner && this.bot.skills.miner.cleanup) {
                    this.bot.skills.miner.cleanup();
                }
            }

            // Save memory
            if (this.bot.systems && this.bot.systems.memory) {
                this.bot.systems.memory.save();
            }

            if (this.config.settings.autoReconnect) {
                this.handleReconnect();
            }
        });

        // Whisper handler
        this.bot.on('whisper', (username, message) => {
            this.logger.info(`[Whisper] ${username}: ${message}`);

            // Handle whispered commands
            const prefix = this.config.settings.commandPrefix;
            if (message.startsWith(prefix)) {
                const args = message.slice(prefix.length).trim().split(/\s+/);
                const commandName = args.shift().toLowerCase();
                this.bot.commandRegistry.execute(this.bot, commandName, args, username);
            }
        });

        // Entity hurt (for defensive mode)
        this.bot.on('entityHurt', (entity) => {
            if (entity === this.bot.entity) {
                this.logger.debug('Bot was hurt!');
            }
        });
    }

    /**
     * Handle reconnection with exponential backoff
     */
    handleReconnect() {
        if (this.reconnectAttempts >= this.config.settings.maxReconnectAttempts) {
            this.logger.error('Max reconnect attempts reached. Giving up.');
            process.exit(1);
        }

        this.reconnectAttempts++;
        const delay = this.config.settings.reconnectDelay * this.reconnectAttempts;

        this.logger.info(`Reconnecting in ${delay / 1000}s... (attempt ${this.reconnectAttempts}/${this.config.settings.maxReconnectAttempts})`);

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Graceful shutdown
     */
    shutdown() {
        this.logger.info('Shutting down...');

        if (this.bot && this.bot.systems && this.bot.systems.memory) {
            this.bot.systems.memory.save();
        }

        if (this.bot) {
            this.bot.quit();
        }
    }
}

module.exports = OpenNovaBot;
