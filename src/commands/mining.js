/**
 * OpenNova - Mining Commands
 * Block mining and resource gathering commands
 */

const { formatPos } = require('../utils/helpers');

module.exports = {
    name: 'mining',
    commands: {
        // Mine specific blocks
        mine: {
            description: 'Mine a specific type of block',
            usage: '!mine <block> [count]',
            aliases: ['dig'],
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    bot.chat('Usage: !mine <block> [count]');
                    return;
                }

                const blockName = args[0];
                const count = parseInt(args[1]) || 1;

                bot.chat(`Mining ${count}x ${blockName}...`);
                const mined = await bot.skills.miner.mineBlocks(blockName, count);
                bot.chat(`Finished mining. Got ${mined} blocks.`);
            }
        },

        // Dig at specific coordinates
        digat: {
            description: 'Dig a block at coordinates',
            usage: '!digat <x> <y> <z>',
            execute: async (bot, args, sender) => {
                if (args.length < 3) {
                    bot.chat('Usage: !digat <x> <y> <z>');
                    return;
                }

                const x = parseFloat(args[0]);
                const y = parseFloat(args[1]);
                const z = parseFloat(args[2]);

                if (isNaN(x) || isNaN(y) || isNaN(z)) {
                    bot.chat('Invalid coordinates.');
                    return;
                }

                const success = await bot.skills.miner.digAt(x, y, z);
                if (success) {
                    bot.chat('Block mined.');
                } else {
                    bot.chat('Could not mine block.');
                }
            }
        },

        // Strip mining
        stripmine: {
            description: 'Start strip mining',
            usage: '!stripmine [length]',
            aliases: ['strip'],
            execute: async (bot, args, sender) => {
                const length = parseInt(args[0]) || 50;
                bot.chat(`Starting strip mine for ${length} blocks...`);
                const mined = await bot.skills.miner.stripMine('forward', length);
                bot.chat(`Strip mining complete. Mined ${mined} blocks.`);
            }
        },

        // Find and mine ores
        ores: {
            description: 'Find and mine valuable ores',
            usage: '!ores [count]',
            aliases: ['findores', 'mineores'],
            execute: async (bot, args, sender) => {
                const count = parseInt(args[0]) || 10;
                bot.chat(`Searching for ores (max ${count})...`);
                bot.skills.miner.isMining = true;
                const mined = await bot.skills.miner.mineOres(count);
                bot.chat(`Found and mined ${mined} ore blocks.`);
            }
        },

        // Stop mining
        stopmining: {
            description: 'Stop current mining operation',
            usage: '!stopmining',
            execute: async (bot, args, sender) => {
                bot.skills.miner.stop();
                bot.chat('Mining stopped.');
            }
        },

        // Collect nearby items
        collect: {
            description: 'Collect nearby dropped items',
            usage: '!collect',
            aliases: ['pickup', 'gather'],
            execute: async (bot, args, sender) => {
                bot.chat('Collecting items...');
                const count = await bot.skills.miner.collectItems();
                bot.chat(`Collected ${count} items.`);
            }
        },

        // Find a block
        find: {
            description: 'Find a specific block nearby',
            usage: '!find <block>',
            aliases: ['locate'],
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    bot.chat('Usage: !find <block>');
                    return;
                }

                const blockName = args[0].toLowerCase().replace(/\s+/g, '_');
                const blocks = bot.skills.miner.findBlocks(blockName, 5, 64);

                if (blocks.length === 0) {
                    bot.chat(`No ${args[0]} found nearby.`);
                } else {
                    const nearest = blocks[0];
                    bot.chat(`Found ${blocks.length} ${args[0]}. Nearest at ${formatPos(nearest.position)}`);
                }
            }
        },

        // Go to found block
        gotoblock: {
            description: 'Go to a specific block type',
            usage: '!gotoblock <block>',
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    bot.chat('Usage: !gotoblock <block>');
                    return;
                }

                const blockName = args[0].toLowerCase().replace(/\s+/g, '_');
                const blocks = bot.skills.miner.findBlocks(blockName, 1, 64);

                if (blocks.length === 0) {
                    bot.chat(`No ${args[0]} found nearby.`);
                    return;
                }

                const target = blocks[0];
                bot.chat(`Going to ${args[0]} at ${formatPos(target.position)}`);
                await bot.skills.pathfinder.gotoBlock(target);
            }
        },

        // Mine trees
        chop: {
            description: 'Chop down trees',
            usage: '!chop [count]',
            aliases: ['wood', 'tree'],
            execute: async (bot, args, sender) => {
                const count = parseInt(args[0]) || 10;
                bot.chat(`Chopping trees (${count} logs)...`);

                const collected = await bot.skills.miner.chopWood(count);

                if (collected > 0) {
                    bot.chat(`Finished! Chopped roughly ${collected} logs.`);
                } else {
                    bot.chat('Could not find reachable trees nearby.');
                }
            }
        }
    }
};
