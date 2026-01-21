/**
 * OpenNova - Inventory Commands
 * Inventory management and item handling with chest memory
 */

const { getInventoryItems, formatItemName, findInventoryItem, countInventoryItem } = require('../utils/helpers');

module.exports = {
    name: 'inventory',
    commands: {
        // Show inventory
        inventory: {
            description: 'Show inventory contents',
            usage: '!inventory',
            aliases: ['inv', 'items', 'i'],
            execute: async (bot, args, sender) => {
                const items = getInventoryItems(bot);
                const itemList = Object.entries(items);

                if (itemList.length === 0) {
                    bot.chat('Inventory is empty.');
                    return;
                }

                // Split into chunks for chat
                const chunks = [];
                let currentChunk = [];
                let currentLength = 0;

                for (const [name, count] of itemList) {
                    const text = `${formatItemName(name)}: ${count}`;
                    if (currentLength + text.length > 200) {
                        chunks.push(currentChunk.join(', '));
                        currentChunk = [text];
                        currentLength = text.length;
                    } else {
                        currentChunk.push(text);
                        currentLength += text.length + 2;
                    }
                }
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk.join(', '));
                }

                bot.chat(`Inventory (${itemList.length} types):`);
                for (const chunk of chunks) {
                    bot.chat(chunk);
                }
            }
        },

        // Equip an item
        equip: {
            description: 'Equip an item',
            usage: '!equip <item> [slot]',
            aliases: ['hold', 'wear'],
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    bot.chat('Usage: !equip <item> [hand|head|torso|legs|feet|off-hand]');
                    return;
                }

                const itemName = args[0];
                const slot = args[1] || 'hand';

                const item = findInventoryItem(bot, itemName);
                if (!item) {
                    bot.chat(`Item "${itemName}" not found in inventory.`);
                    return;
                }

                try {
                    await bot.equip(item, slot);
                    bot.chat(`Equipped ${item.name}.`);
                } catch (error) {
                    bot.chat(`Could not equip: ${error.message}`);
                }
            }
        },

        // Unequip/dequip item
        unequip: {
            description: 'Unequip held item',
            usage: '!unequip',
            aliases: ['dequip'],
            execute: async (bot, args, sender) => {
                try {
                    await bot.unequip('hand');
                    bot.chat('Unequipped item.');
                } catch (error) {
                    bot.chat('Nothing to unequip.');
                }
            }
        },

        // Drop items
        drop: {
            description: 'Drop items',
            usage: '!drop <item> [count]',
            aliases: ['throw', 'toss'],
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    bot.chat('Usage: !drop <item|all> [count]');
                    return;
                }

                if (args[0].toLowerCase() === 'all') {
                    await bot.skills.survival.dropAll();
                    return;
                }

                const itemName = args[0];
                const count = args[1] ? parseInt(args[1]) : null;

                const item = findInventoryItem(bot, itemName);
                if (!item) {
                    bot.chat(`Item "${itemName}" not found.`);
                    return;
                }

                try {
                    if (count) {
                        await bot.toss(item.type, null, count);
                        bot.chat(`Dropped ${count}x ${item.name}.`);
                    } else {
                        await bot.tossStack(item);
                        bot.chat(`Dropped ${item.count}x ${item.name}.`);
                    }
                } catch (error) {
                    bot.chat(`Could not drop: ${error.message}`);
                }
            }
        },

        // Count specific item
        count: {
            description: 'Count a specific item',
            usage: '!count <item>',
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    bot.chat('Usage: !count <item>');
                    return;
                }

                const itemName = args[0];
                const count = countInventoryItem(bot, itemName);
                bot.chat(`${formatItemName(itemName)}: ${count}`);
            }
        },

        // Store items in nearby chest (with memory update)
        store: {
            description: 'Store items in nearby chest',
            usage: '!store [item]',
            aliases: ['deposit', 'stash'],
            execute: async (bot, args, sender) => {
                const mcData = require('minecraft-data')(bot.version);

                // Find chest
                const chests = bot.findBlocks({
                    matching: mcData.blocksByName.chest?.id,
                    maxDistance: 6,
                    count: 1
                });

                if (chests.length === 0) {
                    bot.chat('No chest nearby.');
                    return;
                }

                const chestBlock = bot.blockAt(chests[0]);

                try {
                    const chest = await bot.openContainer(chestBlock);

                    if (args.length > 0) {
                        // Store specific item
                        const item = findInventoryItem(bot, args[0]);
                        if (item) {
                            await chest.deposit(item.type, null, item.count);
                            bot.chat(`Stored ${item.count}x ${item.name}.`);
                        } else {
                            bot.chat(`Item "${args[0]}" not found.`);
                        }
                    } else {
                        // Store all items
                        const items = bot.inventory.items();
                        for (const item of items) {
                            try {
                                await chest.deposit(item.type, null, item.count);
                            } catch (e) {
                                break;
                            }
                        }
                        bot.chat('Stored items in chest.');
                    }

                    // Update memory with chest contents
                    const contents = chest.containerItems().map(i => ({ name: i.name, count: i.count }));
                    bot.systems.memory.updateChest(chestBlock.position, contents);

                    chest.close();
                } catch (error) {
                    bot.chat(`Could not access chest: ${error.message}`);
                }
            }
        },

        // Withdraw from chest (with memory update)
        withdraw: {
            description: 'Withdraw items from nearby chest',
            usage: '!withdraw <item> [count]',
            aliases: ['take', 'get'],
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    bot.chat('Usage: !withdraw <item> [count]');
                    return;
                }

                const mcData = require('minecraft-data')(bot.version);

                // Find chest
                const chests = bot.findBlocks({
                    matching: mcData.blocksByName.chest?.id,
                    maxDistance: 6,
                    count: 1
                });

                if (chests.length === 0) {
                    bot.chat('No chest nearby.');
                    return;
                }

                const chestBlock = bot.blockAt(chests[0]);
                const itemName = args[0].toLowerCase().replace(/\s+/g, '_');
                const count = args[1] ? parseInt(args[1]) : null;

                try {
                    const chest = await bot.openContainer(chestBlock);

                    const item = chest.containerItems().find(i =>
                        i.name.toLowerCase().includes(itemName)
                    );

                    if (item) {
                        const amount = count || item.count;
                        await chest.withdraw(item.type, null, amount);
                        bot.chat(`Withdrew ${amount}x ${item.name}.`);
                    } else {
                        bot.chat(`Item "${args[0]}" not found in chest.`);
                    }

                    // Update memory with chest contents
                    const contents = chest.containerItems().map(i => ({ name: i.name, count: i.count }));
                    bot.systems.memory.updateChest(chestBlock.position, contents);

                    chest.close();
                } catch (error) {
                    bot.chat(`Could not access chest: ${error.message}`);
                }
            }
        },

        // List chest contents (with memory update)
        chest: {
            description: 'List contents of nearby chest',
            usage: '!chest [label]',
            execute: async (bot, args, sender) => {
                const mcData = require('minecraft-data')(bot.version);

                const chests = bot.findBlocks({
                    matching: mcData.blocksByName.chest?.id,
                    maxDistance: 6,
                    count: 1
                });

                if (chests.length === 0) {
                    bot.chat('No chest nearby.');
                    return;
                }

                const chestBlock = bot.blockAt(chests[0]);
                const label = args[0] || null;

                try {
                    const chest = await bot.openContainer(chestBlock);
                    const items = chest.containerItems();

                    // Update memory with chest contents
                    const contents = items.map(i => ({ name: i.name, count: i.count }));
                    bot.systems.memory.updateChest(chestBlock.position, contents, label);

                    if (items.length === 0) {
                        bot.chat('Chest is empty.');
                    } else {
                        const summary = {};
                        items.forEach(item => {
                            summary[item.name] = (summary[item.name] || 0) + item.count;
                        });

                        const list = Object.entries(summary)
                            .map(([name, count]) => `${formatItemName(name)}: ${count}`)
                            .slice(0, 10)
                            .join(', ');

                        const labelMsg = label ? ` [${label}]` : '';
                        bot.chat(`Chest${labelMsg} (${items.length} stacks): ${list}`);
                    }

                    chest.close();
                } catch (error) {
                    bot.chat(`Could not access chest: ${error.message}`);
                }
            }
        },

        // Find item in any remembered chest
        finditem: {
            description: 'Search for item in all remembered chests',
            usage: '!finditem <item>',
            aliases: ['search', 'locate'],
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    bot.chat('Usage: !finditem <item>');
                    return;
                }

                const results = bot.systems.memory.findItemInChests(args[0]);

                if (results.length === 0) {
                    bot.chat(`No "${args[0]}" found in any remembered chest.`);
                    return;
                }

                bot.chat(`Found "${args[0]}" in ${results.length} chest(s):`);
                for (const result of results.slice(0, 3)) {
                    const pos = result.position;
                    const label = result.label ? ` [${result.label}]` : '';
                    bot.chat(`  ${result.item.count}x at ${pos.x}, ${pos.y}, ${pos.z}${label}`);
                }
            }
        },

        // List all remembered chests
        chests: {
            description: 'List all remembered chests',
            usage: '!chests',
            aliases: ['listchests'],
            execute: async (bot, args, sender) => {
                const chests = bot.systems.memory.listChests();

                if (chests.length === 0) {
                    bot.chat('No chests remembered. Open chests to remember them.');
                    return;
                }

                bot.chat(`Remembered ${chests.length} chest(s):`);
                for (const chest of chests.slice(0, 5)) {
                    const pos = chest.position;
                    const label = chest.label ? ` [${chest.label}]` : '';
                    bot.chat(`  ${pos.x}, ${pos.y}, ${pos.z}${label} - ${chest.itemCount} items`);
                }
            }
        },

        // Label a chest
        labelchest: {
            description: 'Label the nearest chest',
            usage: '!labelchest <label>',
            aliases: ['namechest'],
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    bot.chat('Usage: !labelchest <label> (e.g., tools, ores, food)');
                    return;
                }

                const mcData = require('minecraft-data')(bot.version);
                const chests = bot.findBlocks({
                    matching: mcData.blocksByName.chest?.id,
                    maxDistance: 6,
                    count: 1
                });

                if (chests.length === 0) {
                    bot.chat('No chest nearby to label.');
                    return;
                }

                const chestBlock = bot.blockAt(chests[0]);
                const label = args.join(' ');

                bot.systems.memory.labelChest(chestBlock.position, label);
                bot.chat(`Labeled chest as "${label}".`);
            }
        },

        // Mark chest as base chest
        basechest: {
            description: 'Mark nearest chest as a base chest',
            usage: '!basechest',
            execute: async (bot, args, sender) => {
                const mcData = require('minecraft-data')(bot.version);
                const chests = bot.findBlocks({
                    matching: mcData.blocksByName.chest?.id,
                    maxDistance: 6,
                    count: 1
                });

                if (chests.length === 0) {
                    bot.chat('No chest nearby.');
                    return;
                }

                const chestBlock = bot.blockAt(chests[0]);
                bot.systems.memory.addBaseChest(chestBlock.position);
                bot.chat('Marked chest as base chest!');
            }
        },

        // Give items to a player
        give: {
            description: 'Give items to the player who asked',
            usage: '!give <item> [count]',
            aliases: ['giveme', 'hand'],
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    bot.chat('Usage: !give <item> [count]');
                    return;
                }

                const itemName = args[0];
                const count = args[1] ? parseInt(args[1]) : null;

                // Find the item in inventory
                const item = findInventoryItem(bot, itemName);
                if (!item) {
                    bot.chat(`I don't have "${itemName}" in my inventory.`);
                    return;
                }

                // Find the player
                const player = bot.players[sender];
                if (!player) {
                    bot.chat(`Player ${sender} not found.`);
                    return;
                }

                if (!player.entity) {
                    bot.chat(`I can't see you, ${sender}! Come closer to me.`);
                    return;
                }

                const pos = player.entity.position;
                bot.chat(`Coming to give you ${count || item.count}x ${item.name}...`);

                try {
                    // Walk to the player using pathfinder skill
                    await bot.skills.pathfinder.gotoNear(pos.x, pos.y, pos.z, 2);

                    // Re-check player is still visible
                    if (bot.players[sender]?.entity) {
                        await bot.lookAt(bot.players[sender].entity.position.offset(0, 1.6, 0));
                    }

                    // Drop the item
                    if (count && count < item.count) {
                        await bot.toss(item.type, null, count);
                        bot.chat(`Here's ${count}x ${item.name}!`);
                    } else {
                        await bot.tossStack(item);
                        bot.chat(`Here's ${item.count}x ${item.name}!`);
                    }
                } catch (error) {
                    bot.chat(`Couldn't give item: ${error.message}`);
                }
            }
        }
    }
};

