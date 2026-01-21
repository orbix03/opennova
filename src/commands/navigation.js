/**
 * OpenNova - Navigation Commands
 * Movement and pathfinding commands
 */

const { parseCoords, formatPos, getNearbyPlayers } = require('../utils/helpers');

module.exports = {
    name: 'navigation',
    commands: {
        // Go to specific coordinates
        goto: {
            description: 'Navigate to coordinates',
            usage: '!goto <x> <y> <z>',
            execute: async (bot, args, sender) => {
                const coords = parseCoords(args);
                if (!coords) {
                    bot.chat('Usage: !goto <x> <y> <z>');
                    return;
                }
                bot.chat(`Going to ${formatPos(coords)}`);
                const success = await bot.skills.pathfinder.goto(coords.x, coords.y, coords.z);
                if (success) {
                    bot.chat('Arrived at destination!');
                } else {
                    bot.chat('Could not reach destination.');
                }
            }
        },

        // Come to the sender
        come: {
            description: 'Come to you',
            usage: '!come',
            aliases: ['here', 'tome'],
            execute: async (bot, args, sender) => {
                bot.chat(`Coming to you, ${sender}!`);
                const success = await bot.skills.pathfinder.gotoPlayer(sender);
                if (success) {
                    bot.chat('I\'m here!');
                } else {
                    bot.chat('I couldn\'t reach you.');
                }
            }
        },

        // Follow a player
        follow: {
            description: 'Follow a player',
            usage: '!follow [player]',
            execute: async (bot, args, sender) => {
                const target = args[0] || sender;
                const success = bot.skills.pathfinder.followPlayer(target);
                if (success) {
                    bot.chat(`Following ${target}`);
                } else {
                    bot.chat(`Can't see ${target}`);
                }
            }
        },

        // Stop all movement
        stop: {
            description: 'Stop moving',
            usage: '!stop',
            aliases: ['halt', 'stay'],
            execute: async (bot, args, sender) => {
                bot.skills.pathfinder.stop();
                bot.skills.combat.stopAttacking();
                bot.skills.combat.stopDefending();
                bot.skills.miner.stop();
                bot.chat('Stopped.');
            }
        },

        // Waypoint management
        waypoint: {
            description: 'Manage waypoints',
            usage: '!waypoint <save|goto|list|delete> [name]',
            aliases: ['wp'],
            execute: async (bot, args, sender) => {
                const action = args[0]?.toLowerCase();
                const name = args[1];

                if (!action) {
                    bot.chat('Usage: !waypoint <save|goto|list|delete> [name]');
                    return;
                }

                switch (action) {
                    case 'save':
                    case 'set':
                        if (!name) {
                            bot.chat('Please provide a waypoint name.');
                            return;
                        }
                        bot.systems.memory.saveWaypoint(name, bot.entity.position);
                        bot.chat(`Saved waypoint: ${name}`);
                        break;

                    case 'goto':
                    case 'go':
                        if (!name) {
                            bot.chat('Please provide a waypoint name.');
                            return;
                        }
                        const wp = bot.systems.memory.getWaypoint(name);
                        if (!wp) {
                            bot.chat(`Waypoint "${name}" not found.`);
                            return;
                        }
                        bot.chat(`Going to waypoint: ${name}`);
                        await bot.skills.pathfinder.goto(wp.x, wp.y, wp.z);
                        break;

                    case 'list':
                        const waypoints = bot.systems.memory.listWaypoints();
                        if (waypoints.length === 0) {
                            bot.chat('No waypoints saved.');
                        } else {
                            bot.chat(`Waypoints: ${waypoints.map(w => w.name).join(', ')}`);
                        }
                        break;

                    case 'delete':
                    case 'remove':
                        if (!name) {
                            bot.chat('Please provide a waypoint name.');
                            return;
                        }
                        if (bot.systems.memory.deleteWaypoint(name)) {
                            bot.chat(`Deleted waypoint: ${name}`);
                        } else {
                            bot.chat(`Waypoint "${name}" not found.`);
                        }
                        break;

                    default:
                        bot.chat('Unknown action. Use: save, goto, list, delete');
                }
            }
        },

        // Set home location
        sethome: {
            description: 'Set home at current location',
            usage: '!sethome',
            execute: async (bot, args, sender) => {
                bot.systems.memory.setHome(bot.entity.position);
                bot.chat('Home location set!');
            }
        },

        // Go home
        home: {
            description: 'Go to home location',
            usage: '!home',
            execute: async (bot, args, sender) => {
                const home = bot.systems.memory.getHome();
                if (!home) {
                    bot.chat('No home location set. Use !sethome first.');
                    return;
                }
                bot.chat('Going home...');
                await bot.skills.pathfinder.goto(home.x, home.y, home.z);
            }
        },

        // Go to last death location
        death: {
            description: 'Go to last death location',
            usage: '!death',
            aliases: ['deathpoint'],
            execute: async (bot, args, sender) => {
                const death = bot.systems.memory.getDeathLocation();
                if (!death) {
                    bot.chat('No death location recorded.');
                    return;
                }
                bot.chat(`Going to death point at ${death.x}, ${death.y}, ${death.z}`);
                await bot.skills.pathfinder.goto(death.x, death.y, death.z);
            }
        },

        // Look at something
        look: {
            description: 'Look at a player or coordinates',
            usage: '!look <player|x y z>',
            execute: async (bot, args, sender) => {
                if (args.length >= 3) {
                    const coords = parseCoords(args);
                    if (coords) {
                        await bot.lookAt(coords);
                        return;
                    }
                }

                const target = args[0] || sender;
                const player = bot.players[target];
                if (player && player.entity) {
                    await bot.lookAt(player.entity.position.offset(0, 1.6, 0));
                    bot.chat(`Looking at ${target}`);
                } else {
                    bot.chat(`Can't see ${target}`);
                }
            }
        },

        // List nearby players
        players: {
            description: 'List nearby players',
            usage: '!players',
            execute: async (bot, args, sender) => {
                const nearbyPlayers = getNearbyPlayers(bot, 100);
                if (nearbyPlayers.length === 0) {
                    bot.chat('No other players nearby.');
                } else {
                    const names = nearbyPlayers.map(p => p.username).join(', ');
                    bot.chat(`Players nearby: ${names}`);
                }
            }
        }
    }
};
