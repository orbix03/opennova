/**
 * OpenNova - Command Loader
 * Loads and manages all command modules
 */

const fs = require('fs');
const path = require('path');

class CommandLoader {
    constructor(logger) {
        this.logger = logger;
        this.commands = new Map();
        this.aliases = new Map();
        this.modules = [];
    }

    /**
     * Load all command modules
     */
    loadCommands(commandsDir) {
        const files = fs.readdirSync(commandsDir);

        for (const file of files) {
            if (file === 'index.js' || !file.endsWith('.js')) continue;

            try {
                const modulePath = path.join(commandsDir, file);
                const module = require(modulePath);

                this.modules.push(module.name);

                for (const [name, command] of Object.entries(module.commands)) {
                    this.commands.set(name, {
                        ...command,
                        module: module.name
                    });

                    // Register aliases
                    if (command.aliases) {
                        for (const alias of command.aliases) {
                            this.aliases.set(alias, name);
                        }
                    }
                }

                this.logger.debug(`Loaded command module: ${module.name}`);
            } catch (error) {
                this.logger.error(`Failed to load command module ${file}: ${error.message}`);
            }
        }

        this.logger.info(`Loaded ${this.commands.size} commands from ${this.modules.length} modules`);
    }

    /**
     * Get a command by name or alias
     */
    get(name) {
        const cmdName = this.aliases.get(name) || name;
        return this.commands.get(cmdName);
    }

    /**
     * Check if a command exists
     */
    has(name) {
        return this.commands.has(name) || this.aliases.has(name);
    }

    /**
     * Execute a command
     */
    async execute(bot, commandName, args, sender) {
        const command = this.get(commandName);

        if (!command) {
            return false;
        }

        try {
            await command.execute(bot, args, sender);
            return true;
        } catch (error) {
            this.logger.error(`Command ${commandName} failed: ${error.message}`);
            bot.chat(`Error: ${error.message}`);
            return false;
        }
    }

    /**
     * Get all commands
     */
    getAll() {
        return Array.from(this.commands.entries());
    }

    /**
     * Get commands by module
     */
    getByModule(moduleName) {
        return Array.from(this.commands.entries())
            .filter(([_, cmd]) => cmd.module === moduleName);
    }
}

module.exports = CommandLoader;
