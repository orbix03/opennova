/**
 * OpenNova - Combat Commands
 * Fighting, defending, and PvP commands
 */

const { getNearbyHostileMobs, getNearbyPlayers, formatPos } = require('../utils/helpers');

module.exports = {
    name: 'combat',
    commands: {
        // Attack a target
        attack: {
            description: 'Attack a player or mob',
            usage: '!attack <target>',
            aliases: ['kill', 'hit'],
            execute: async (bot, args, sender) => {
                const target = args[0];

                if (!target) {
                    // Attack nearest hostile mob
                    const success = await bot.skills.combat.attackNearestMob();
                    if (!success) {
                        bot.chat('No hostile mobs nearby.');
                    }
                    return;
                }

                // Check if it's a player
                const player = bot.players[target];
                if (player && player.entity) {
                    bot.chat(`Attacking ${target}!`);
                    await bot.skills.combat.attackPlayer(target);
                    return;
                }

                // Check if it's a mob type
                const mobs = Object.values(bot.entities)
                    .filter(e => e.name?.toLowerCase().includes(target.toLowerCase()));

                if (mobs.length > 0) {
                    bot.chat(`Attacking ${mobs[0].name}!`);
                    await bot.skills.combat.attack(mobs[0]);
                } else {
                    bot.chat(`Target "${target}" not found.`);
                }
            }
        },

        // Enter defensive mode
        defend: {
            description: 'Enter defensive mode - attack nearby threats',
            usage: '!defend',
            aliases: ['defense', 'protect'],
            execute: async (bot, args, sender) => {
                bot.chat('Entering defensive mode!');
                bot.skills.combat.startDefending();
            }
        },

        // Stop defending
        stopdefend: {
            description: 'Stop defensive mode',
            usage: '!stopdefend',
            execute: async (bot, args, sender) => {
                bot.skills.combat.stopDefending();
                bot.chat('Stopped defending.');
            }
        },

        // Guard a player
        guard: {
            description: 'Guard and protect a player',
            usage: '!guard [player]',
            aliases: ['bodyguard'],
            execute: async (bot, args, sender) => {
                const target = args[0] || sender;
                const success = await bot.skills.combat.guard(target);
                if (success) {
                    bot.chat(`Guarding ${target}!`);
                } else {
                    bot.chat(`Can't find ${target}.`);
                }
            }
        },

        // Stop guarding
        stopguard: {
            description: 'Stop guarding',
            usage: '!stopguard',
            execute: async (bot, args, sender) => {
                bot.skills.combat.stopGuarding();
                bot.chat('Stopped guarding.');
            }
        },

        // Flee from danger
        flee: {
            description: 'Run away from threats',
            usage: '!flee',
            aliases: ['run', 'escape'],
            execute: async (bot, args, sender) => {
                bot.chat('Running away!');
                await bot.skills.combat.flee();
            }
        },

        // Equip best weapon
        weapon: {
            description: 'Equip best weapon',
            usage: '!weapon',
            aliases: ['sword'],
            execute: async (bot, args, sender) => {
                const success = await bot.skills.combat.equipBestWeapon();
                if (success) {
                    bot.chat('Equipped weapon.');
                } else {
                    bot.chat('No weapon available.');
                }
            }
        },

        // List nearby hostile mobs
        mobs: {
            description: 'List nearby hostile mobs',
            usage: '!mobs',
            aliases: ['threats', 'enemies'],
            execute: async (bot, args, sender) => {
                const mobs = getNearbyHostileMobs(bot, 32);
                if (mobs.length === 0) {
                    bot.chat('No hostile mobs nearby.');
                } else {
                    const summary = {};
                    mobs.forEach(m => {
                        summary[m.name] = (summary[m.name] || 0) + 1;
                    });
                    const list = Object.entries(summary)
                        .map(([name, count]) => `${name}: ${count}`)
                        .join(', ');
                    bot.chat(`Nearby threats: ${list}`);
                }
            }
        },

        // PvP mode toggle
        pvp: {
            description: 'Toggle PvP mode',
            usage: '!pvp <on|off>',
            execute: async (bot, args, sender) => {
                const mode = args[0]?.toLowerCase();
                if (mode === 'on') {
                    bot.pvpEnabled = true;
                    bot.chat('PvP mode enabled. I will attack players on command.');
                } else if (mode === 'off') {
                    bot.pvpEnabled = false;
                    bot.chat('PvP mode disabled.');
                } else {
                    bot.chat(`PvP is currently ${bot.pvpEnabled ? 'enabled' : 'disabled'}`);
                }
            }
        },

        // Use shield
        block: {
            description: 'Block with shield',
            usage: '!block',
            aliases: ['shield'],
            execute: async (bot, args, sender) => {
                const success = await bot.skills.combat.block();
                if (!success) {
                    bot.chat('No shield available.');
                }
            }
        },

        // Stop blocking
        unblock: {
            description: 'Stop blocking',
            usage: '!unblock',
            execute: async (bot, args, sender) => {
                bot.skills.combat.stopBlocking();
                bot.chat('Stopped blocking.');
            }
        }
    }
};
