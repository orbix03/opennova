/**
 * OpenNova - Pathfinder Skill
 * Navigation and movement using mineflayer-pathfinder
 */

const { goals, Movements } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');

class PathfinderSkill {
    constructor(bot, logger) {
        this.bot = bot;
        this.logger = logger;
        this.movements = null;
        this.isMoving = false;
        this.currentGoal = null;
    }

    /**
     * Initialize pathfinder with custom movements
     */
    initialize() {
        // Store mcData reference instead of requiring each time
        this.mcData = require('minecraft-data')(this.bot.version);
        this.movements = new Movements(this.bot, this.mcData);

        // Configure movement settings
        this.movements.allowSprinting = true;
        this.movements.allowParkour = true;
        this.movements.canDig = true;
        this.movements.scafoldingBlocks = [
            this.mcData.blocksByName.dirt?.id,
            this.mcData.blocksByName.cobblestone?.id,
            this.mcData.blocksByName.netherrack?.id
        ].filter(Boolean);

        // Avoid dangerous blocks
        this.movements.blocksCantBreak.add(this.mcData.blocksByName.chest?.id);
        this.movements.blocksToAvoid.add(this.mcData.blocksByName.fire?.id);
        this.movements.blocksToAvoid.add(this.mcData.blocksByName.lava?.id);
        this.movements.blocksToAvoid.add(this.mcData.blocksByName.cactus?.id);

        this.bot.pathfinder.setMovements(this.movements);
        this.logger.debug('Pathfinder initialized with custom movements');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stop();
        this.movements = null;
        this.mcData = null;
    }

    /**
     * Navigate to specific coordinates
     */
    async goto(x, y, z) {
        const target = new Vec3(x, y, z);
        this.logger.info(`Navigating to ${x}, ${y}, ${z}`);

        try {
            this.isMoving = true;
            this.currentGoal = new goals.GoalBlock(x, y, z);
            await this.bot.pathfinder.goto(this.currentGoal);
            this.logger.success('Reached destination');
            return true;
        } catch (error) {
            this.logger.error(`Failed to reach destination: ${error.message}`);
            return false;
        } finally {
            this.isMoving = false;
            this.currentGoal = null;
        }
    }

    /**
     * Navigate near coordinates (within range)
     */
    async gotoNear(x, y, z, range = 2) {
        this.logger.info(`Navigating near ${x}, ${y}, ${z} (range: ${range})`);

        try {
            this.isMoving = true;
            this.currentGoal = new goals.GoalNear(x, y, z, range);
            await this.bot.pathfinder.goto(this.currentGoal);
            this.logger.success('Reached near destination');
            return true;
        } catch (error) {
            this.logger.error(`Failed to reach near destination: ${error.message}`);
            return false;
        } finally {
            this.isMoving = false;
            this.currentGoal = null;
        }
    }

    /**
     * Go to a player
     */
    async gotoPlayer(playerName) {
        const player = this.bot.players[playerName];

        if (!player) {
            this.logger.warn(`Player ${playerName} not found on server`);
            return false;
        }

        // Get the player's entity (they need to be in render distance)
        const entity = player.entity;
        if (!entity) {
            this.logger.warn(`Player ${playerName} is not visible (too far away)`);
            this.bot.chat(`I can't see you ${playerName}! Come closer to me.`);
            return false;
        }

        const pos = entity.position;
        this.logger.info(`Going to player ${playerName} at ${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)}`);

        try {
            this.isMoving = true;
            this.currentGoal = new goals.GoalNear(pos.x, pos.y, pos.z, 2);
            await this.bot.pathfinder.goto(this.currentGoal);
            this.logger.success(`Reached player ${playerName}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to reach player: ${error.message}`);
            return false;
        } finally {
            this.isMoving = false;
            this.currentGoal = null;
        }
    }

    /**
     * Follow a player continuously
     */
    followPlayer(playerName) {
        const player = this.bot.players[playerName];

        if (!player) {
            this.logger.warn(`Player ${playerName} not found on server`);
            return false;
        }

        const entity = player.entity;
        if (!entity) {
            this.logger.warn(`Player ${playerName} is not visible (too far away)`);
            this.bot.chat(`I can't see you ${playerName}! Come closer to me.`);
            return false;
        }

        this.logger.info(`Following player ${playerName}`);
        this.isMoving = true;

        // Use GoalFollow with the entity and dynamic=true
        this.currentGoal = new goals.GoalFollow(entity, 2);
        this.bot.pathfinder.setGoal(this.currentGoal, true); // dynamic goal
        return true;
    }

    /**
     * Stop all movement
     */
    stop() {
        this.bot.pathfinder.stop();
        this.isMoving = false;
        this.currentGoal = null;
        this.logger.info('Stopped movement');
    }

    /**
     * Get to a block (for interaction like mining)
     */
    async gotoBlock(block) {
        if (!block) {
            this.logger.warn('No block provided');
            return false;
        }

        try {
            this.isMoving = true;
            this.currentGoal = new goals.GoalGetToBlock(block.position.x, block.position.y, block.position.z);
            await this.bot.pathfinder.goto(this.currentGoal);
            return true;
        } catch (error) {
            this.logger.error(`Failed to reach block: ${error.message}`);
            return false;
        } finally {
            this.isMoving = false;
            this.currentGoal = null;
        }
    }

    /**
     * Run away from a position
     */
    async fleeFrom(position, distance = 16) {
        this.logger.info(`Fleeing from ${position.x}, ${position.y}, ${position.z}`);

        try {
            this.isMoving = true;
            this.currentGoal = new goals.GoalInvert(
                new goals.GoalNear(position.x, position.y, position.z, distance)
            );
            this.bot.pathfinder.setGoal(this.currentGoal, true);
            return true;
        } catch (error) {
            this.logger.error(`Failed to flee: ${error.message}`);
            return false;
        }
    }

    /**
     * Check if currently moving
     */
    isNavigating() {
        return this.isMoving;
    }
}

module.exports = PathfinderSkill;
