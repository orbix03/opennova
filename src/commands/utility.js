/**
 * OpenNova - Utility Commands
 * General bot commands and utilities
 */

const { formatPos, formatDuration } = require('../utils/helpers');

module.exports = {
    name: 'utility',
    commands: {
        // Show bot status
        status: {
            description: 'Show bot status',
            usage: '!status',
            aliases: ['stats', 'info'],
            execute: async (bot, args, sender) => {
                const status = bot.skills.survival.displayStatus();
                status.forEach(line => bot.chat(line));
            }
        },

        // Send a chat message
        say: {
            description: 'Send a chat message',
            usage: '!say <message>',
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    return;
                }
                bot.chat(args.join(' '));
            }
        },

        // Eat food
        eat: {
            description: 'Eat food',
            usage: '!eat',
            aliases: ['food'],
            execute: async (bot, args, sender) => {
                const success = await bot.skills.survival.eat();
                if (!success) {
                    bot.chat('No food available.');
                }
            }
        },

        // Sleep in bed
        sleep: {
            description: 'Sleep in nearby bed',
            usage: '!sleep',
            aliases: ['bed'],
            execute: async (bot, args, sender) => {
                await bot.skills.survival.sleep();
            }
        },

        // Wake up
        wake: {
            description: 'Wake up from bed',
            usage: '!wake',
            execute: async (bot, args, sender) => {
                await bot.skills.survival.wake();
            }
        },

        // Equip armor
        equiparmor: {
            description: 'Equip best armor',
            usage: '!equiparmor',
            execute: async (bot, args, sender) => {
                await bot.skills.survival.equipArmor();
            }
        },

        // Get current position
        pos: {
            description: 'Show current position',
            usage: '!pos',
            aliases: ['position', 'where', 'coords'],
            execute: async (bot, args, sender) => {
                const pos = bot.entity.position;
                bot.chat(`Position: ${formatPos(pos)}`);
            }
        },

        // Show current time
        time: {
            description: 'Show current game time',
            usage: '!time',
            execute: async (bot, args, sender) => {
                const time = bot.time.timeOfDay;
                const hours = Math.floor(time / 1000) + 6;
                const minutes = Math.floor((time % 1000) / 16.67);
                const adjusted = hours >= 24 ? hours - 24 : hours;
                const period = time >= 12000 && time < 24000 ? 'Night' : 'Day';
                bot.chat(`Time: ${adjusted.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} (${period})`);
            }
        },

        // Show weather
        weather: {
            description: 'Show current weather',
            usage: '!weather',
            execute: async (bot, args, sender) => {
                const weather = bot.isRaining ? 'Raining' : 'Clear';
                bot.chat(`Weather: ${weather}`);
            }
        },

        // Show help
        help: {
            description: 'Show available commands',
            usage: '!help [command]',
            aliases: ['commands', '?'],
            execute: async (bot, args, sender) => {
                if (args.length > 0) {
                    // Show help for specific command
                    const cmdName = args[0].toLowerCase();
                    const cmd = bot.commandRegistry.get(cmdName);

                    if (cmd) {
                        bot.chat(`${cmd.usage} - ${cmd.description}`);
                        if (cmd.aliases?.length > 0) {
                            bot.chat(`Aliases: ${cmd.aliases.join(', ')}`);
                        }
                    } else {
                        bot.chat(`Unknown command: ${cmdName}`);
                    }
                    return;
                }

                // Show all command categories
                const categories = [
                    'Navigation: goto, come, follow, stop, waypoint, home',
                    'Combat: attack, defend, guard, flee, weapon',
                    'Mining: mine, stripmine, ores, find, chop',
                    'Crafting: craft, smelt, recipe, tools, armor',
                    'Inventory: inv, equip, drop, store, withdraw',
                    'Utility: status, eat, sleep, pos, time, help'
                ];

                bot.chat('Commands (use !help <cmd> for details):');
                categories.forEach(cat => bot.chat(cat));
            }
        },

        // Bot uptime
        uptime: {
            description: 'Show bot uptime',
            usage: '!uptime',
            execute: async (bot, args, sender) => {
                const uptime = Date.now() - bot.startTime;
                bot.chat(`Uptime: ${formatDuration(uptime)}`);
            }
        },

        // Version info
        version: {
            description: 'Show bot version',
            usage: '!version',
            aliases: ['ver', 'about'],
            execute: async (bot, args, sender) => {
                bot.chat('OpenNova v1.0.0 - Advanced Minecraft Bot');
                bot.chat(`Running on Minecraft ${bot.version}`);
            }
        },

        // Disconnect bot
        disconnect: {
            description: 'Disconnect the bot',
            usage: '!disconnect',
            aliases: ['quit', 'leave'],
            execute: async (bot, args, sender) => {
                bot.chat('Goodbye!');
                setTimeout(() => bot.quit(), 1000);
            }
        },

        // Reconnect bot
        reconnect: {
            description: 'Reconnect the bot',
            usage: '!reconnect',
            aliases: ['restart'],
            execute: async (bot, args, sender) => {
                bot.chat('Reconnecting...');
                setTimeout(() => {
                    bot.quit();
                    // Reconnection handled by main bot class
                }, 1000);
            }
        },

        // Jump
        jump: {
            description: 'Make the bot jump',
            usage: '!jump',
            execute: async (bot, args, sender) => {
                bot.setControlState('jump', true);
                setTimeout(() => bot.setControlState('jump', false), 500);
            }
        },

        // Sneak
        sneak: {
            description: 'Toggle sneaking',
            usage: '!sneak [on|off]',
            aliases: ['crouch'],
            execute: async (bot, args, sender) => {
                const mode = args[0]?.toLowerCase();
                if (mode === 'off') {
                    bot.setControlState('sneak', false);
                    bot.chat('Stopped sneaking.');
                } else {
                    bot.setControlState('sneak', true);
                    bot.chat('Sneaking...');
                }
            }
        },

        // Sprint
        sprint: {
            description: 'Toggle sprinting',
            usage: '!sprint [on|off]',
            aliases: ['run'],
            execute: async (bot, args, sender) => {
                const mode = args[0]?.toLowerCase();
                if (mode === 'off') {
                    bot.setControlState('sprint', false);
                    bot.chat('Stopped sprinting.');
                } else {
                    bot.setControlState('sprint', true);
                    bot.setControlState('forward', true);
                    bot.chat('Sprinting...');
                }
            }
        },

        // Use held item
        use: {
            description: 'Use held item',
            usage: '!use',
            aliases: ['activate'],
            execute: async (bot, args, sender) => {
                bot.activateItem();
                setTimeout(() => bot.deactivateItem(), 1000);
            }
        },

        // Memory stats
        memory: {
            description: 'Show memory statistics',
            usage: '!memory',
            execute: async (bot, args, sender) => {
                const stats = bot.systems.memory.getStats();
                bot.chat(`Deaths: ${stats.deathCount} | Mined: ${stats.blocksMined} | Kills: ${stats.mobsKilled}`);
            }
        }
    }
};
