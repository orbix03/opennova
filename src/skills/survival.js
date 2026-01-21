/**
 * OpenNova - Survival Skill
 * Auto-eat, armor management, and survival utilities
 */

class SurvivalSkill {
    constructor(bot, logger, config) {
        this.bot = bot;
        this.logger = logger;
        this.config = config;
    }

    /**
     * Initialize survival features
     */
    initialize() {
        // Configure auto-eat
        if (this.config.features.autoEat && this.bot.autoEat) {
            this.bot.autoEat.options = {
                priority: 'foodPoints',
                startAt: 14,
                bannedFood: ['rotten_flesh', 'spider_eye', 'poisonous_potato', 'pufferfish']
            };
            this.bot.autoEat.enable();
            this.logger.debug('Auto-eat enabled');
        }

        // Configure armor manager
        if (this.config.features.autoArmor && this.bot.armorManager) {
            this.bot.armorManager.equipAll();
            this.logger.debug('Auto-armor enabled');
        }

        // Health monitoring
        this.bot.on('health', () => this.onHealthChange());

        this.logger.debug('Survival skill initialized');
    }

    /**
     * Handle health changes
     */
    onHealthChange() {
        if (this.bot.health <= 6) {
            this.logger.warn(`Low health: ${this.bot.health}/20`);
        }

        if (this.bot.food <= 6) {
            this.logger.warn(`Low hunger: ${this.bot.food}/20`);
        }
    }

    /**
     * Manually eat food
     */
    async eat() {
        const foods = [
            'golden_apple', 'enchanted_golden_apple',
            'cooked_beef', 'cooked_porkchop', 'cooked_mutton',
            'cooked_chicken', 'cooked_rabbit', 'cooked_salmon', 'cooked_cod',
            'bread', 'baked_potato', 'pumpkin_pie', 'golden_carrot',
            'apple', 'carrot', 'potato', 'melon_slice',
            'beef', 'porkchop', 'chicken', 'mutton', 'rabbit'
        ];

        for (const foodName of foods) {
            const food = this.bot.inventory.items().find(item => item.name === foodName);
            if (food) {
                this.logger.info(`Eating ${foodName}`);
                try {
                    await this.bot.equip(food, 'hand');
                    await this.bot.consume();
                    this.logger.success('Finished eating');
                    return true;
                } catch (error) {
                    this.logger.error(`Failed to eat: ${error.message}`);
                }
            }
        }

        this.logger.warn('No food available');
        return false;
    }

    /**
     * Equip best armor manually
     */
    async equipArmor() {
        if (this.bot.armorManager) {
            await this.bot.armorManager.equipAll();
            this.logger.success('Equipped best armor');
            return true;
        }

        // Manual armor equipping fallback
        const armorSlots = {
            head: ['netherite_helmet', 'diamond_helmet', 'iron_helmet', 'chainmail_helmet', 'golden_helmet', 'leather_helmet', 'turtle_helmet'],
            torso: ['netherite_chestplate', 'diamond_chestplate', 'iron_chestplate', 'chainmail_chestplate', 'golden_chestplate', 'leather_chestplate'],
            legs: ['netherite_leggings', 'diamond_leggings', 'iron_leggings', 'chainmail_leggings', 'golden_leggings', 'leather_leggings'],
            feet: ['netherite_boots', 'diamond_boots', 'iron_boots', 'chainmail_boots', 'golden_boots', 'leather_boots']
        };

        for (const [slot, armors] of Object.entries(armorSlots)) {
            for (const armorName of armors) {
                const armor = this.bot.inventory.items().find(item => item.name === armorName);
                if (armor) {
                    try {
                        await this.bot.equip(armor, slot);
                        this.logger.info(`Equipped ${armorName}`);
                        break;
                    } catch (error) {
                        continue;
                    }
                }
            }
        }

        return true;
    }

    /**
     * Sleep in a nearby bed or go to base to sleep
     */
    async sleep() {
        const mcData = require('minecraft-data')(this.bot.version);

        // First, try to find a bed nearby (within 32 blocks)
        let bedBlock = await this.findNearbyBed(32);

        if (bedBlock) {
            this.logger.info('Found bed nearby, going to sleep...');
            return await this.sleepInBed(bedBlock);
        }

        // No bed nearby, try going to home/base
        this.logger.info('No bed nearby, checking home/base...');

        const home = this.bot.systems?.memory?.getHome();
        if (home) {
            this.bot.chat('No bed nearby. Going to home to sleep...');

            // Go to home location
            const success = await this.bot.skills.pathfinder.goto(home.x, home.y, home.z);
            if (success) {
                // Look for bed near home
                bedBlock = await this.findNearbyBed(16);
                if (bedBlock) {
                    return await this.sleepInBed(bedBlock);
                }
            }
        }

        this.logger.warn('No bed found nearby or at home');
        this.bot.chat('No bed found! Please place a bed or set home near one.');
        return false;
    }

    /**
     * Find a bed nearby
     */
    async findNearbyBed(maxDistance = 32) {
        const beds = this.bot.findBlocks({
            matching: block => block.name.includes('_bed'),
            maxDistance: maxDistance,
            count: 1
        });

        if (beds.length > 0) {
            return this.bot.blockAt(beds[0]);
        }
        return null;
    }

    /**
     * Actually sleep in a specific bed
     */
    async sleepInBed(bedBlock) {
        if (!bedBlock) return false;

        try {
            // Go near the bed first
            const pos = bedBlock.position;
            await this.bot.skills.pathfinder.gotoNear(pos.x, pos.y, pos.z, 2);

            // Sleep
            await this.bot.sleep(bedBlock);
            this.logger.success('Sleeping in bed');
            this.bot.chat('Good night! 😴');
            return true;
        } catch (error) {
            this.logger.error(`Cannot sleep: ${error.message}`);

            // Common sleep errors
            if (error.message.includes('monsters')) {
                this.bot.chat('Cannot sleep - monsters nearby!');
            } else if (error.message.includes('not possible')) {
                this.bot.chat('Cannot sleep right now - not night time or bed occupied.');
            } else {
                this.bot.chat(`Cannot sleep: ${error.message}`);
            }
            return false;
        }
    }

    /**
     * Wake up from bed
     */
    async wake() {
        if (this.bot.isSleeping) {
            await this.bot.wake();
            this.logger.info('Woke up');
            return true;
        }
        return false;
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            health: this.bot.health,
            food: this.bot.food,
            saturation: this.bot.foodSaturation,
            oxygen: this.bot.oxygenLevel,
            position: this.bot.entity.position,
            gameMode: this.bot.game.gameMode,
            difficulty: this.bot.game.difficulty,
            dimension: this.bot.game.dimension,
            experience: {
                level: this.bot.experience.level,
                points: this.bot.experience.points
            }
        };
    }

    /**
     * Display status in chat
     */
    displayStatus() {
        const status = this.getStatus();
        const pos = status.position;

        return [
            `❤ Health: ${Math.floor(status.health)}/20`,
            `🍖 Hunger: ${Math.floor(status.food)}/20`,
            `📍 Position: ${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)}`,
            `⭐ Level: ${status.experience.level}`,
            `🎮 Gamemode: ${status.gameMode}`
        ];
    }

    /**
     * Drop all items
     */
    async dropAll() {
        const items = this.bot.inventory.items();
        this.logger.info(`Dropping ${items.length} item stacks`);

        for (const item of items) {
            try {
                await this.bot.tossStack(item);
            } catch (error) {
                // Continue dropping other items
            }
        }

        this.logger.success('Dropped all items');
    }

    /**
     * Check and place torches if dark
     */
    async ensureLight() {
        const pos = this.bot.entity.position;
        const block = this.bot.blockAt(pos);

        if (block && block.light < 7) {
            const torch = this.bot.inventory.items().find(item => item.name === 'torch');
            if (torch) {
                // Find floor block
                const floorBlock = this.bot.blockAt(pos.offset(0, -1, 0));
                if (floorBlock && floorBlock.name !== 'air') {
                    try {
                        await this.bot.equip(torch, 'hand');
                        await this.bot.placeBlock(floorBlock, new (require('vec3'))(0, 1, 0));
                        this.logger.debug('Placed torch');
                        return true;
                    } catch (error) {
                        // Could not place torch
                    }
                }
            }
        }
        return false;
    }
}

module.exports = SurvivalSkill;
