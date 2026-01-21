/**
 * OpenNova - Crafting Commands
 * Item crafting and smelting commands
 */

const { formatItemName } = require('../utils/helpers');

module.exports = {
    name: 'crafting',
    commands: {
        // Craft an item
        craft: {
            description: 'Craft an item',
            usage: '!craft <item> [count]',
            aliases: ['make'],
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    bot.chat('Usage: !craft <item> [count]');
                    return;
                }

                const itemName = args[0];
                const count = parseInt(args[1]) || 1;

                bot.chat(`Crafting ${count}x ${itemName}...`);
                const success = await bot.skills.crafter.craft(itemName, count);

                if (success) {
                    bot.chat(`Crafted ${count}x ${itemName}!`);
                } else {
                    bot.chat(`Could not craft ${itemName}.`);
                }
            }
        },

        // Smelt items
        smelt: {
            description: 'Smelt items in a furnace',
            usage: '!smelt <item> [count]',
            aliases: ['cook', 'furnace'],
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    bot.chat('Usage: !smelt <item> [count]');
                    return;
                }

                const itemName = args[0];
                const count = parseInt(args[1]) || 1;

                bot.chat(`Smelting ${count}x ${itemName}...`);
                const success = await bot.skills.crafter.smelt(itemName, count);

                if (success) {
                    bot.chat('Smelting complete!');
                } else {
                    bot.chat(`Could not smelt ${itemName}.`);
                }
            }
        },

        // Show recipes for an item
        recipe: {
            description: 'Show crafting recipe for an item',
            usage: '!recipe <item>',
            aliases: ['recipes', 'howto'],
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    bot.chat('Usage: !recipe <item>');
                    return;
                }

                const itemName = args[0];
                const recipes = bot.skills.crafter.getRecipes(itemName);

                if (recipes.length === 0) {
                    bot.chat(`No recipe found for ${itemName}.`);
                    return;
                }

                const recipe = recipes[0];
                if (recipe.ingredients) {
                    const ingredients = recipe.ingredients
                        .filter(i => i)
                        .map(i => i.name || `ID:${i.id}`)
                        .join(', ');
                    bot.chat(`Recipe for ${itemName}: ${ingredients}`);
                } else if (recipe.inShape) {
                    const items = new Set();
                    recipe.inShape.forEach(row => {
                        row.forEach(item => {
                            if (item) items.add(item.name || `ID:${item.id}`);
                        });
                    });
                    bot.chat(`Recipe for ${itemName}: ${[...items].join(', ')}`);
                }

                bot.chat(`Requires crafting table: ${recipe.requiresTable ? 'Yes' : 'No'}`);
            }
        },

        // Check if item can be crafted
        cancraft: {
            description: 'Check if an item can be crafted',
            usage: '!cancraft <item>',
            execute: async (bot, args, sender) => {
                if (args.length < 1) {
                    bot.chat('Usage: !cancraft <item>');
                    return;
                }

                const itemName = args[0];
                const count = parseInt(args[1]) || 1;
                const canCraft = bot.skills.crafter.canCraft(itemName, count);

                if (canCraft) {
                    bot.chat(`Yes, I can craft ${count}x ${itemName}.`);
                } else {
                    bot.chat(`No, I cannot craft ${itemName} right now.`);
                }
            }
        },

        // Craft planks from logs
        planks: {
            description: 'Craft planks from logs',
            usage: '!planks [count]',
            execute: async (bot, args, sender) => {
                const count = parseInt(args[0]) || 4;
                bot.chat(`Crafting ${count} planks...`);
                const success = await bot.skills.crafter.craftPlanks(count);
                if (success) {
                    bot.chat('Crafted planks!');
                } else {
                    bot.chat('Could not craft planks. Need logs.');
                }
            }
        },

        // Craft sticks
        sticks: {
            description: 'Craft sticks',
            usage: '!sticks [count]',
            execute: async (bot, args, sender) => {
                const count = parseInt(args[0]) || 4;
                bot.chat(`Crafting ${count} sticks...`);
                const success = await bot.skills.crafter.craftSticks(count);
                if (success) {
                    bot.chat('Crafted sticks!');
                } else {
                    bot.chat('Could not craft sticks.');
                }
            }
        },

        // Quick craft common tools
        tools: {
            description: 'Craft a set of tools',
            usage: '!tools <wood|stone|iron|diamond>',
            execute: async (bot, args, sender) => {
                const material = args[0]?.toLowerCase() || 'wooden';
                const prefix = material === 'wood' ? 'wooden' : material;

                bot.chat(`Crafting ${material} tools...`);

                const tools = ['pickaxe', 'axe', 'shovel', 'sword'];
                let crafted = [];

                for (const tool of tools) {
                    const toolName = `${prefix}_${tool}`;
                    const success = await bot.skills.crafter.craft(toolName, 1);
                    if (success) {
                        crafted.push(tool);
                    }
                }

                if (crafted.length > 0) {
                    bot.chat(`Crafted: ${crafted.join(', ')}`);
                } else {
                    bot.chat('Could not craft any tools. Check materials.');
                }
            }
        },

        // Craft armor set
        armor: {
            description: 'Craft a set of armor',
            usage: '!armor <leather|iron|diamond>',
            execute: async (bot, args, sender) => {
                const material = args[0]?.toLowerCase() || 'iron';

                bot.chat(`Crafting ${material} armor...`);

                const pieces = ['helmet', 'chestplate', 'leggings', 'boots'];
                let crafted = [];

                for (const piece of pieces) {
                    const armorName = `${material}_${piece}`;
                    const success = await bot.skills.crafter.craft(armorName, 1);
                    if (success) {
                        crafted.push(piece);
                    }
                }

                if (crafted.length > 0) {
                    bot.chat(`Crafted: ${crafted.join(', ')}`);
                } else {
                    bot.chat('Could not craft any armor. Check materials.');
                }
            }
        }
    }
};
