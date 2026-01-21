/**
 * OpenNova - Combat Skill
 * Combat, PvP, and defensive actions using mineflayer-pvp
 */

const { distance, getNearbyHostileMobs } = require('../utils/helpers');

class CombatSkill {
    constructor(bot, logger, config) {
        this.bot = bot;
        this.logger = logger;
        this.config = config;
        this.isAttacking = false;
        this.isDefending = false;
        this.currentTarget = null;
        this.guardTarget = null;
        this.defenseInterval = null;
        this._onStoppedAttacking = null;
    }

    /**
     * Initialize combat settings
     */
    initialize() {
        // Configure PvP plugin
        if (this.bot.pvp && this.bot.pvp.movements) {
            this.bot.pvp.movements.allowSprinting = true;
        }

        // Remove old listener if exists (prevents memory leak on reconnect)
        if (this._onStoppedAttacking) {
            this.bot.removeListener('stoppedAttacking', this._onStoppedAttacking);
        }

        // Create bound listener for cleanup
        this._onStoppedAttacking = () => {
            this.isAttacking = false;
            this.currentTarget = null;
        };

        // Listen for attack end
        this.bot.on('stoppedAttacking', this._onStoppedAttacking);

        this.logger.debug('Combat skill initialized');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopDefending();
        this.stopAttacking();
        if (this._onStoppedAttacking) {
            this.bot.removeListener('stoppedAttacking', this._onStoppedAttacking);
            this._onStoppedAttacking = null;
        }
    }

    /**
     * Attack a specific entity
     */
    async attack(entity) {
        if (!entity) {
            this.logger.warn('No entity to attack');
            return false;
        }

        this.logger.info(`Attacking ${entity.name || entity.username || 'entity'}`);
        this.isAttacking = true;
        this.currentTarget = entity;

        try {
            await this.bot.pvp.attack(entity);
            return true;
        } catch (error) {
            this.logger.error(`Attack failed: ${error.message}`);
            this.isAttacking = false;
            this.currentTarget = null;
            return false;
        }
    }

    /**
     * Attack a player by name
     */
    async attackPlayer(playerName) {
        const player = this.bot.players[playerName];
        if (!player || !player.entity) {
            this.logger.warn(`Player ${playerName} not found or not visible`);
            return false;
        }

        return await this.attack(player.entity);
    }

    /**
     * Attack nearest hostile mob
     */
    async attackNearestMob() {
        const mobs = getNearbyHostileMobs(this.bot, 16);
        if (mobs.length === 0) {
            this.logger.info('No hostile mobs nearby');
            return false;
        }

        return await this.attack(mobs[0]);
    }

    /**
     * Enter defensive mode - attack any hostile mobs that come close
     */
    startDefending() {
        if (this.isDefending) return;

        this.isDefending = true;
        this.logger.info('Entering defensive mode');

        this.defenseInterval = setInterval(async () => {
            if (!this.isDefending) return;

            // Check health and flee if low
            if (this.bot.health <= this.config.combat.fleeHealthThreshold) {
                this.logger.warn('Health critical, fleeing!');
                this.stopDefending();
                this.flee();
                return;
            }

            // Attack nearby hostile mobs
            if (!this.isAttacking) {
                const mobs = getNearbyHostileMobs(this.bot, this.config.combat.attackRange + 5);
                if (mobs.length > 0) {
                    await this.attack(mobs[0]);
                }
            }
        }, 500);
    }

    /**
     * Stop defensive mode
     */
    stopDefending() {
        this.isDefending = false;
        if (this.defenseInterval) {
            clearInterval(this.defenseInterval);
            this.defenseInterval = null;
        }
        this.stopAttacking();
        this.logger.info('Stopped defending');
    }

    /**
     * Guard a specific player
     */
    async guard(playerName) {
        const player = this.bot.players[playerName];
        if (!player || !player.entity) {
            this.logger.warn(`Player ${playerName} not found`);
            return false;
        }

        this.guardTarget = player;
        this.logger.info(`Guarding player ${playerName}`);

        // Follow and protect
        this.bot.pathfinder.setGoal(
            new (require('mineflayer-pathfinder').goals.GoalFollow)(player.entity, 3),
            true
        );

        this.startDefending();
        return true;
    }

    /**
     * Stop guarding
     */
    stopGuarding() {
        this.guardTarget = null;
        this.stopDefending();
        this.bot.pathfinder.stop();
        this.logger.info('Stopped guarding');
    }

    /**
     * Stop attacking current target
     */
    stopAttacking() {
        this.bot.pvp.stop();
        this.isAttacking = false;
        this.currentTarget = null;
    }

    /**
     * Flee from current position
     */
    async flee() {
        const mobs = getNearbyHostileMobs(this.bot, 32);
        if (mobs.length === 0) {
            this.logger.info('No threats to flee from');
            return;
        }

        // Calculate average threat position
        let avgX = 0, avgY = 0, avgZ = 0;
        mobs.forEach(mob => {
            avgX += mob.position.x;
            avgY += mob.position.y;
            avgZ += mob.position.z;
        });
        avgX /= mobs.length;
        avgY /= mobs.length;
        avgZ /= mobs.length;

        // Run opposite direction
        const botPos = this.bot.entity.position;
        const fleeX = botPos.x + (botPos.x - avgX) * 2;
        const fleeZ = botPos.z + (botPos.z - avgZ) * 2;

        this.stopAttacking();
        this.logger.info('Fleeing from threats!');

        try {
            const { goals } = require('mineflayer-pathfinder');
            this.bot.pathfinder.setGoal(new goals.GoalXZ(fleeX, fleeZ), true);
        } catch (error) {
            this.logger.error(`Flee failed: ${error.message}`);
        }
    }

    /**
     * Equip best weapon
     */
    async equipBestWeapon() {
        const weapons = [
            'netherite_sword', 'diamond_sword', 'iron_sword', 'stone_sword', 'wooden_sword', 'golden_sword',
            'netherite_axe', 'diamond_axe', 'iron_axe', 'stone_axe', 'wooden_axe', 'golden_axe'
        ];

        for (const weaponName of weapons) {
            const weapon = this.bot.inventory.items().find(item => item.name === weaponName);
            if (weapon) {
                try {
                    await this.bot.equip(weapon, 'hand');
                    this.logger.info(`Equipped ${weaponName}`);
                    return true;
                } catch (error) {
                    continue;
                }
            }
        }

        this.logger.warn('No weapon found to equip');
        return false;
    }

    /**
     * Use shield to block
     */
    async block() {
        const shield = this.bot.inventory.items().find(item => item.name === 'shield');
        if (!shield) {
            this.logger.warn('No shield available');
            return false;
        }

        try {
            await this.bot.equip(shield, 'off-hand');
            this.bot.activateItem(true); // Use offhand
            this.logger.info('Blocking with shield');
            return true;
        } catch (error) {
            this.logger.error(`Failed to block: ${error.message}`);
            return false;
        }
    }

    /**
     * Stop blocking
     */
    stopBlocking() {
        this.bot.deactivateItem();
    }
}

module.exports = CombatSkill;
