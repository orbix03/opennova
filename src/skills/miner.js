/**
 * OpenNova - Miner Skill
 * Block finding and mining - optimized for memory efficiency
 */

const { Vec3 } = require('vec3');
const { goals } = require('mineflayer-pathfinder');

class MinerSkill {
    constructor(bot, logger, config) {
        this.bot = bot;
        this.logger = logger;
        this.config = config;
        this.isMining = false;
        this.mcData = null;
    }

    /**
     * Initialize miner with block data
     */
    initialize() {
        this.mcData = require('minecraft-data')(this.bot.version);
        this.logger.debug('Miner skill initialized');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stop();
        this.mcData = null;
    }

    /**
     * Find blocks of a specific type nearby
     */
    findBlocks(blockName, maxCount = 5, maxDistance = 32) {
        if (!this.mcData) return [];

        const blockType = this.mcData.blocksByName[blockName];
        if (!blockType) {
            return [];
        }

        // Limit search to reduce memory usage
        const positions = this.bot.findBlocks({
            matching: blockType.id,
            maxDistance: Math.min(maxDistance, 32), // Cap distance
            count: Math.min(maxCount, 10) // Cap count
        });

        // Only get first few blocks to save memory
        const blocks = [];
        for (let i = 0; i < Math.min(positions.length, 5); i++) {
            const block = this.bot.blockAt(positions[i]);
            if (block) blocks.push(block);
        }

        return blocks;
    }

    /**
     * Mine a specific number of blocks (with auto-collect)
     */
    async mineBlocks(blockName, count = 1, autoCollect = true) {
        const normalizedName = blockName.toLowerCase().replace(/\s+/g, '_');
        this.logger.info(`Mining ${count} ${blockName}`);

        // Limit count to prevent runaway mining
        count = Math.min(count, 64);

        let mined = 0;
        this.isMining = true;

        try {
            while (mined < count && this.isMining) {
                // Find one block at a time to save memory
                const blocks = this.findBlocks(normalizedName, 1, 32);

                if (blocks.length === 0) {
                    this.logger.warn(`No more ${blockName} found nearby`);
                    break;
                }

                const targetBlock = blocks[0];
                const blockPos = targetBlock.position.clone();

                if (await this.mineBlockManually(targetBlock)) {
                    mined++;
                    this.logger.debug(`Mined ${mined}/${count} ${blockName}`);

                    // Auto-collect dropped items near the mined block
                    if (autoCollect) {
                        await this.sleep(300); // Wait for items to drop
                        await this.collectNearbyItems(blockPos, 3);
                    }
                } else {
                    break;
                }

                // Small delay to prevent CPU overload
                await this.sleep(100);
            }

            this.logger.success(`Finished mining. Got ${mined}/${count} ${blockName}`);
            return mined;
        } finally {
            this.isMining = false;
        }
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Manually mine a block (go to it and dig)
     */
    async mineBlockManually(block) {
        if (!block || !this.isMining) return false;

        try {
            const botPos = this.bot.entity.position;
            const blockPos = block.position;

            // Calculate distance manually to avoid importing helpers repeatedly
            const dx = blockPos.x - botPos.x;
            const dy = blockPos.y - botPos.y;
            const dz = blockPos.z - botPos.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // Navigate to block if too far
            if (dist > 4) {
                await this.bot.pathfinder.goto(
                    new goals.GoalGetToBlock(blockPos.x, blockPos.y, blockPos.z)
                );
            }

            // Equip best tool
            if (this.bot.tool) {
                try {
                    await this.bot.tool.equipForBlock(block);
                } catch (e) {
                    // Ignore tool equip errors
                }
            }

            // Look at and dig the block
            await this.bot.lookAt(blockPos.offset(0.5, 0.5, 0.5));

            // Re-fetch block in case it changed
            const currentBlock = this.bot.blockAt(blockPos);
            if (currentBlock && currentBlock.name !== 'air') {
                await this.bot.dig(currentBlock);
            }

            return true;
        } catch (error) {
            this.logger.error(`Failed to mine block: ${error.message}`);
            return false;
        }
    }

    /**
     * Dig a block at specific coordinates
     */
    async digAt(x, y, z) {
        const pos = new Vec3(Math.floor(x), Math.floor(y), Math.floor(z));
        const block = this.bot.blockAt(pos);

        if (!block || block.name === 'air') {
            this.logger.warn(`No block at ${x}, ${y}, ${z}`);
            return false;
        }

        this.logger.info(`Digging ${block.name} at ${x}, ${y}, ${z}`);
        return await this.mineBlockManually(block);
    }

    /**
     * Strip mine in a direction (simplified version)
     */
    async stripMine(direction = 'forward', length = 20) {
        // Limit length to prevent memory issues
        length = Math.min(length, 30);

        this.logger.info(`Starting strip mine: ${direction} for ${length} blocks`);
        this.isMining = true;

        const yaw = this.bot.entity.yaw;
        let dx = -Math.sin(yaw);
        let dz = -Math.cos(yaw);

        const startPos = this.bot.entity.position.clone();
        let blocksMined = 0;

        try {
            for (let i = 0; i < length && this.isMining; i++) {
                const targetX = Math.floor(startPos.x + dx * i);
                const targetY = Math.floor(startPos.y);
                const targetZ = Math.floor(startPos.z + dz * i);

                // Mine 2 blocks high
                for (let yOffset = 0; yOffset <= 1; yOffset++) {
                    if (!this.isMining) break;

                    const pos = new Vec3(targetX, targetY + yOffset, targetZ);
                    const block = this.bot.blockAt(pos);

                    if (block && block.name !== 'air' && block.name !== 'bedrock' &&
                        block.name !== 'lava' && block.name !== 'water') {
                        if (await this.mineBlockManually(block)) {
                            blocksMined++;
                        }
                    }
                }

                // Delay between iterations
                await this.sleep(50);
            }

            this.logger.success(`Strip mining complete. Mined ${blocksMined} blocks`);
        } finally {
            this.isMining = false;
        }

        return blocksMined;
    }

    /**
     * Find and mine valuable ores (simplified)
     */
    async mineOres(maxBlocks = 5) {
        // Limit to prevent memory issues
        maxBlocks = Math.min(maxBlocks, 10);

        const ores = [
            'diamond_ore', 'deepslate_diamond_ore',
            'iron_ore', 'deepslate_iron_ore',
            'gold_ore', 'deepslate_gold_ore',
            'coal_ore', 'deepslate_coal_ore'
        ];

        this.logger.info('Searching for ores...');
        this.isMining = true;
        let totalMined = 0;

        try {
            for (const oreName of ores) {
                if (totalMined >= maxBlocks || !this.isMining) break;

                const blocks = this.findBlocks(oreName, 1, 24);

                if (blocks.length > 0) {
                    this.logger.info(`Found ${oreName}`);
                    if (await this.mineBlockManually(blocks[0])) {
                        totalMined++;
                    }
                }

                await this.sleep(100);
            }

            this.logger.success(`Ore mining complete. Mined ${totalMined} ore blocks`);
        } finally {
            this.isMining = false;
        }

        return totalMined;
    }

    /**
     * Chop nearby trees / collect logs
     */
    async chopWood(count = 10) {
        this.logger.info(`Chopping ${count} logs...`);
        this.isMining = true;

        if (!this.bot.collectBlock) {
            this.logger.error('mineflayer-collectblock plugin not loaded!');
            return 0;
        }

        const logTypes = [
            'oak_log', 'birch_log', 'spruce_log', 'jungle_log',
            'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'
        ];

        let logsCollected = 0;

        try {
            // Find log blocks
            const blockIds = logTypes.map(name => this.mcData.blocksByName[name]?.id).filter(id => id);

            // Find up to 'count' logs nearby
            const targetPositions = this.bot.findBlocks({
                matching: blockIds,
                maxDistance: 64,
                count: count
            });

            if (targetPositions.length === 0) {
                this.logger.warn('No trees found nearby!');
                return 0;
            }

            this.logger.info(`Found ${targetPositions.length} log blocks.`);

            // Convert Vec3 positions to Block objects
            const targetBlocks = targetPositions.map(pos => this.bot.blockAt(pos));

            // Use collectBlock to gather them intelligently
            // collectBlock handles pathfinding, pillaring, and gathering
            await this.bot.collectBlock.collect(targetBlocks, {
                ignoreNoPath: true,
                count: count
            });

            logsCollected = targets.length; // Approximate, collectBlock doesn't return count
            this.logger.success('Finished chopping wood.');

        } catch (err) {
            this.logger.error(`Error chopping wood: ${err.message}`);
        } finally {
            this.isMining = false;
        }

        return logsCollected;
    }

    /**
     * Stop current mining operation
     */
    stop() {
        this.isMining = false;
        try {
            this.bot.stopDigging();
        } catch (e) { }
        try {
            this.bot.pathfinder.stop();
        } catch (e) { }
        this.logger.info('Mining stopped');
    }

    /**
     * Collect nearby dropped items (simplified)
     */
    async collectItems(itemName = null, range = 8) {
        const botPos = this.bot.entity.position;
        let collected = 0;

        // Simple approach: just walk towards nearby items
        const entities = Object.values(this.bot.entities);

        for (let i = 0; i < Math.min(entities.length, 10); i++) {
            const e = entities[i];
            if (e.type !== 'object' || e.objectType !== 'Item') continue;

            const dx = e.position.x - botPos.x;
            const dz = e.position.z - botPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist <= range) {
                try {
                    await this.bot.pathfinder.goto(
                        new goals.GoalNear(e.position.x, e.position.y, e.position.z, 0)
                    );
                    collected++;
                    await this.sleep(200);
                } catch (error) {
                    // Item might have been picked up
                }
            }
        }

        this.logger.success(`Collected ${collected} items`);
        return collected;
    }

    /**
     * Collect items near a specific position (used after mining)
     */
    async collectNearbyItems(position, range = 3) {
        if (!position) return 0;

        let collected = 0;
        const entities = Object.values(this.bot.entities);

        for (const entity of entities) {
            if (entity.type !== 'object' || entity.objectType !== 'Item') continue;
            if (!entity.position) continue;

            const dx = entity.position.x - position.x;
            const dy = entity.position.y - position.y;
            const dz = entity.position.z - position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist <= range) {
                try {
                    // Walk to the item to pick it up
                    await this.bot.pathfinder.goto(
                        new goals.GoalNear(entity.position.x, entity.position.y, entity.position.z, 0)
                    );
                    collected++;
                    await this.sleep(100);
                } catch (e) {
                    // Item might have been picked up already
                }
            }
        }

        if (collected > 0) {
            this.logger.debug(`Collected ${collected} dropped items`);
        }
        return collected;
    }
}

module.exports = MinerSkill;

