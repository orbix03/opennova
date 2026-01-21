/**
 * OpenNova - Crafter Skill
 * Crafting and smelting automation - handles all recipes including 3x3
 */

const { Vec3 } = require('vec3');
const { goals } = require('mineflayer-pathfinder');

class CrafterSkill {
    constructor(bot, logger) {
        this.bot = bot;
        this.logger = logger;
        this.mcData = null;
    }

    /**
     * Initialize crafter with minecraft data
     */
    initialize() {
        this.mcData = require('minecraft-data')(this.bot.version);
        this.logger.debug('Crafter skill initialized');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.mcData = null;
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Craft an item - handles both 2x2 and 3x3 recipes
     */
    async craft(itemName, count = 1) {
        const normalizedName = itemName.toLowerCase().replace(/\s+/g, '_');

        if (!this.mcData) {
            this.logger.error('Crafter not initialized');
            return false;
        }

        const item = this.mcData.itemsByName[normalizedName];
        if (!item) {
            this.logger.warn(`Unknown item: ${itemName}`);
            return false;
        }

        this.logger.info(`Request: Craft ${count}x ${itemName}`);

        // Recursive crafting helper
        const craftRecursive = async (itemId, count) => {
            const recipeItem = this.mcData.items[itemId];
            const name = recipeItem.name;

            // Check if we already have it
            const current = this.bot.inventory.count(itemId);
            if (current >= count) return true;

            const needed = count - current;

            // Find a recipe
            const recipes = this.bot.recipesFor(itemId, null, needed, true); // true = also check recipes requiring table
            if (recipes.length === 0) {
                this.logger.warn(`No recipe found for ${name}`);
                return false;
            }

            const recipe = recipes[0];

            // Check ingredients
            for (const delta of recipe.delta) {
                if (delta.count > 0) continue; // It's an output, not input

                const ingredientId = delta.id;
                const ingredientCount = Math.abs(delta.count);

                // Do we have enough?
                const hasIngredient = this.bot.inventory.count(ingredientId) >= ingredientCount;

                if (!hasIngredient) {
                    // Try to craft the ingredient
                    this.logger.debug(`Missing ingredient ${this.mcData.items[ingredientId].name} for ${name}, trying to craft...`);
                    const success = await craftRecursive(ingredientId, ingredientCount);
                    if (!success) {
                        this.logger.warn(`Failed to craft ingredient: ${this.mcData.items[ingredientId].name}`);
                        return false;
                    }
                }
            }

            // If recipe needs crafting table, ensure we have one
            if (recipe.requiresTable) {
                const table = await this.ensureCraftingTable();
                if (!table) {
                    this.logger.error('Need crafting table but cannot place/find one.');
                    return false;
                }
                // Go to table
                await this.goToBlock(table);

                // Verify recipe again with table context
                const tableRecipes = this.bot.recipesFor(itemId, null, needed, table);
                if (tableRecipes.length === 0) {
                    this.logger.error('Recipe not valid even with table (inventory desync?)');
                    return false;
                }

                try {
                    await this.bot.craft(tableRecipes[0], needed, table);
                    this.logger.success(`Crafted ${needed}x ${name}`);
                    return true;
                } catch (err) {
                    this.logger.error(`Failed to craft ${name}: ${err.message}`);
                    return false;
                }
            } else {
                // Craft in inventory
                try {
                    await this.bot.craft(recipe, needed, null);
                    this.logger.success(`Crafted ${needed}x ${name} (inventory)`);
                    return true;
                } catch (err) {
                    this.logger.error(`Failed to craft ${name}: ${err.message}`);
                    return false;
                }
            }
        };

        return await craftRecursive(item.id, count);
    }

    /**
     * Ensure we have a usable crafting table
     * 1. Find existing table nearby
     * 2. Or place one from inventory
     * 3. Or craft one from planks and place it
     * 4. Or craft planks from logs, then craft table, then place it
     */
    async ensureCraftingTable() {
        // Step 1: Look for existing crafting table nearby
        const existingTable = await this.findCraftingTable();
        if (existingTable) {
            this.logger.debug('Found existing crafting table');
            return existingTable;
        }

        // Step 2: Check if we have a crafting table in inventory
        let tableItem = this.bot.inventory.items().find(i => i.name === 'crafting_table');

        if (!tableItem) {
            // Step 3: Try to craft a crafting table (needs 4 planks)
            const craftedTable = await this.craftCraftingTable();
            if (!craftedTable) {
                return null;
            }
            tableItem = this.bot.inventory.items().find(i => i.name === 'crafting_table');
        }

        // Step 4: Place the crafting table
        if (tableItem) {
            const placedTable = await this.placeCraftingTable();
            if (placedTable) {
                return placedTable;
            }
        }

        return null;
    }

    /**
     * Find an existing crafting table nearby
     */
    async findCraftingTable() {
        if (!this.mcData.blocksByName.crafting_table) return null;

        const tables = this.bot.findBlocks({
            matching: this.mcData.blocksByName.crafting_table.id,
            maxDistance: 32,
            count: 1
        });

        if (tables.length > 0) {
            return this.bot.blockAt(tables[0]);
        }
        return null;
    }

    /**
     * Craft a crafting table from planks (or logs if no planks)
     */
    async craftCraftingTable() {
        this.logger.debug('Trying to craft a crafting table...');

        // Check if we have planks
        let planks = this.bot.inventory.items().find(i => i.name.includes('planks'));

        if (!planks || planks.count < 4) {
            // Need to craft planks from logs first
            const crafted = await this.craftPlanksFromLogs();
            if (!crafted) {
                this.logger.warn('No planks or logs to make crafting table');
                return false;
            }
            planks = this.bot.inventory.items().find(i => i.name.includes('planks'));
        }

        if (!planks || planks.count < 4) {
            this.logger.warn('Not enough planks for crafting table');
            return false;
        }

        // Craft crafting table (this is a 2x2 recipe!)
        const tableItemData = this.mcData.itemsByName.crafting_table;
        if (!tableItemData) return false;

        const recipes = this.bot.recipesFor(tableItemData.id, null, 1, null);
        if (recipes.length === 0) {
            this.logger.warn('No recipe for crafting table found');
            return false;
        }

        try {
            await this.bot.craft(recipes[0], 1, null);
            this.logger.info('Crafted a crafting table!');
            return true;
        } catch (error) {
            this.logger.error(`Failed to craft crafting table: ${error.message}`);
            return false;
        }
    }

    /**
     * Craft planks from logs
     */
    async craftPlanksFromLogs() {
        const logs = this.bot.inventory.items().find(i =>
            i.name.includes('_log') || i.name.includes('_wood')
        );

        if (!logs) {
            this.logger.debug('No logs to convert to planks');
            return false;
        }

        // Figure out which planks to make
        let plankName = 'oak_planks';
        if (logs.name.includes('oak')) plankName = 'oak_planks';
        else if (logs.name.includes('birch')) plankName = 'birch_planks';
        else if (logs.name.includes('spruce')) plankName = 'spruce_planks';
        else if (logs.name.includes('jungle')) plankName = 'jungle_planks';
        else if (logs.name.includes('acacia')) plankName = 'acacia_planks';
        else if (logs.name.includes('dark_oak')) plankName = 'dark_oak_planks';
        else if (logs.name.includes('mangrove')) plankName = 'mangrove_planks';
        else if (logs.name.includes('cherry')) plankName = 'cherry_planks';
        else if (logs.name.includes('crimson')) plankName = 'crimson_planks';
        else if (logs.name.includes('warped')) plankName = 'warped_planks';

        const plankItem = this.mcData.itemsByName[plankName];
        if (!plankItem) {
            plankName = 'oak_planks';
        }

        // Craft planks (2x2 recipe, 1 log = 4 planks)
        const plankData = this.mcData.itemsByName[plankName];
        if (!plankData) return false;

        const recipes = this.bot.recipesFor(plankData.id, null, 1, null);
        if (recipes.length === 0) {
            this.logger.debug('No plank recipe found');
            return false;
        }

        try {
            await this.bot.craft(recipes[0], 1, null);
            this.logger.info(`Crafted ${plankName}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to craft planks: ${error.message}`);
            return false;
        }
    }

    /**
     * Place a crafting table near the bot
     */
    async placeCraftingTable() {
        const tableItem = this.bot.inventory.items().find(i => i.name === 'crafting_table');
        if (!tableItem) {
            this.logger.warn('No crafting table in inventory to place');
            return null;
        }

        const pos = this.bot.entity.position.floored();

        // Try several positions around the bot
        const offsets = [
            new Vec3(1, 0, 0), new Vec3(-1, 0, 0),
            new Vec3(0, 0, 1), new Vec3(0, 0, -1),
            new Vec3(1, 0, 1), new Vec3(-1, 0, 1),
            new Vec3(1, 0, -1), new Vec3(-1, 0, -1)
        ];

        for (const offset of offsets) {
            const placePos = pos.plus(offset);
            const blockBelow = this.bot.blockAt(placePos.offset(0, -1, 0));
            const blockAt = this.bot.blockAt(placePos);

            if (blockBelow && blockBelow.name !== 'air' &&
                blockBelow.name !== 'water' && blockBelow.name !== 'lava' &&
                blockAt && blockAt.name === 'air') {
                try {
                    await this.bot.equip(tableItem, 'hand');
                    await this.sleep(100);
                    await this.bot.placeBlock(blockBelow, new Vec3(0, 1, 0));
                    this.logger.info('Placed crafting table');
                    await this.sleep(200);
                    return this.bot.blockAt(placePos);
                } catch (error) {
                    this.logger.debug(`Failed to place at offset ${offset}: ${error.message}`);
                    continue;
                }
            }
        }

        this.logger.error('Could not find a spot to place crafting table');
        return null;
    }

    /**
     * Navigate to a block
     */
    async goToBlock(block) {
        if (!block) return;

        const botPos = this.bot.entity.position;
        const blockPos = block.position;
        const dx = blockPos.x - botPos.x;
        const dy = blockPos.y - botPos.y;
        const dz = blockPos.z - botPos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist > 4) {
            try {
                await this.bot.pathfinder.goto(
                    new goals.GoalNear(blockPos.x, blockPos.y, blockPos.z, 2)
                );
            } catch (error) {
                this.logger.debug(`Navigation failed: ${error.message}`);
            }
        }
    }

    /**
     * Show available recipes for an item
     */
    getRecipes(itemName) {
        const normalizedName = itemName.toLowerCase().replace(/\s+/g, '_');
        const item = this.mcData?.itemsByName[normalizedName];
        if (!item) return [];
        return this.bot.recipesFor(item.id, null, 1, null);
    }

    /**
     * Check if we can craft an item
     */
    canCraft(itemName, count = 1) {
        const normalizedName = itemName.toLowerCase().replace(/\s+/g, '_');
        const item = this.mcData?.itemsByName[normalizedName];
        if (!item) return false;
        const recipes = this.bot.recipesFor(item.id, null, count, null);
        return recipes.length > 0;
    }

    /**
     * Smelt items in a furnace
     */
    async smelt(itemName, count = 1) {
        const normalizedName = itemName.toLowerCase().replace(/\s+/g, '_');
        this.logger.info(`Smelting ${count}x ${itemName}`);

        const itemToSmelt = this.bot.inventory.items().find(i => i.name === normalizedName);
        if (!itemToSmelt || itemToSmelt.count < count) {
            this.logger.warn(`Not enough ${itemName} to smelt`);
            return false;
        }

        // Find a furnace
        const furnaceId = this.mcData?.blocksByName.furnace?.id;
        if (!furnaceId) return false;

        const furnaces = this.bot.findBlocks({
            matching: furnaceId,
            maxDistance: 32,
            count: 1
        });

        if (furnaces.length === 0) {
            this.logger.warn('No furnace found nearby');
            return false;
        }

        const furnaceBlock = this.bot.blockAt(furnaces[0]);
        await this.goToBlock(furnaceBlock);

        try {
            const furnace = await this.bot.openFurnace(furnaceBlock);

            // Find fuel
            const fuels = ['coal', 'charcoal', 'coal_block'];
            let fuel = null;
            for (const fuelName of fuels) {
                fuel = this.bot.inventory.items().find(i => i.name === fuelName);
                if (fuel) break;
            }

            if (!fuel) {
                this.logger.warn('No fuel available');
                furnace.close();
                return false;
            }

            await furnace.putFuel(fuel.type, null, Math.min(fuel.count, Math.ceil(count / 8)));
            await furnace.putInput(itemToSmelt.type, null, Math.min(itemToSmelt.count, count));

            this.logger.info('Smelting in progress...');
            await this.sleep(count * 10000);

            const output = furnace.outputItem();
            if (output) {
                await furnace.takeOutput();
                this.logger.success(`Smelted ${output.count}x ${output.name}`);
            }

            furnace.close();
            return true;
        } catch (error) {
            this.logger.error(`Smelting failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Craft planks from logs
     */
    async craftPlanks(count = 4) {
        const logs = this.bot.inventory.items().filter(i =>
            i.name.includes('_log') || i.name.includes('_wood')
        );

        if (logs.length === 0) {
            this.logger.warn('No logs in inventory');
            return false;
        }

        const log = logs[0];
        let plankName = log.name.replace('_log', '_planks').replace('stripped_', '');

        // Handle special cases
        if (plankName.includes('wood')) {
            plankName = plankName.replace('_wood', '_planks');
        }

        const logsNeeded = Math.ceil(count / 4);

        for (let i = 0; i < logsNeeded; i++) {
            const crafted = await this.craftPlanksFromLogs();
            if (!crafted) break;
        }

        return true;
    }

    /**
     * Craft sticks
     */
    async craftSticks(count = 4) {
        const planks = this.bot.inventory.items().find(i => i.name.includes('planks'));

        if (!planks || planks.count < 2) {
            await this.craftPlanks(4);
        }

        const stickItem = this.mcData?.itemsByName.stick;
        if (!stickItem) return false;

        const recipes = this.bot.recipesFor(stickItem.id, null, 1, null);
        if (recipes.length === 0) return false;

        try {
            await this.bot.craft(recipes[0], Math.ceil(count / 4), null);
            this.logger.success('Crafted sticks');
            return true;
        } catch (error) {
            this.logger.error(`Failed to craft sticks: ${error.message}`);
            return false;
        }
    }
}

module.exports = CrafterSkill;
