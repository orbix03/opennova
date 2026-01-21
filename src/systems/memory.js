/**
 * OpenNova - Memory System
 * Persistent storage for waypoints, locations, chests, and state
 */

const fs = require('fs');
const path = require('path');

class MemorySystem {
    constructor(logger, dataDir) {
        this.logger = logger;
        this.dataDir = dataDir;
        this.waypointsFile = path.join(dataDir, 'waypoints.json');
        this.memoryFile = path.join(dataDir, 'memory.json');
        this.chestsFile = path.join(dataDir, 'chests.json');

        this.waypoints = {};
        this.chests = {}; // { "x,y,z": { position, contents, lastUpdated, label } }

        this.memory = {
            homeLocation: null,
            spawnPoint: null,
            lastDeathLocation: null,
            baseChests: [], // Chest positions at home/base
            visitedBiomes: [],
            playerInteractions: {},
            stats: {
                blocksMined: 0,
                mobsKilled: 0,
                deathCount: 0,
                itemsCollected: 0,
                playtime: 0
            }
        };

        this.ensureDataDir();
        this.load();
    }

    /**
     * Ensure data directory exists
     */
    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    /**
     * Load data from files
     */
    load() {
        // Load waypoints
        try {
            if (fs.existsSync(this.waypointsFile)) {
                const data = fs.readFileSync(this.waypointsFile, 'utf8');
                this.waypoints = JSON.parse(data);
                this.logger.debug(`Loaded ${Object.keys(this.waypoints).length} waypoints`);
            }
        } catch (error) {
            this.logger.warn(`Failed to load waypoints: ${error.message}`);
            this.waypoints = {};
        }

        // Load memory
        try {
            if (fs.existsSync(this.memoryFile)) {
                const data = fs.readFileSync(this.memoryFile, 'utf8');
                this.memory = { ...this.memory, ...JSON.parse(data) };
                this.logger.debug('Loaded memory data');
            }
        } catch (error) {
            this.logger.warn(`Failed to load memory: ${error.message}`);
        }

        // Load chests
        try {
            if (fs.existsSync(this.chestsFile)) {
                const data = fs.readFileSync(this.chestsFile, 'utf8');
                this.chests = JSON.parse(data);
                this.logger.debug(`Loaded ${Object.keys(this.chests).length} chest records`);
            }
        } catch (error) {
            this.logger.warn(`Failed to load chests: ${error.message}`);
            this.chests = {};
        }
    }

    /**
     * Save all data to files
     */
    save() {
        try {
            fs.writeFileSync(this.waypointsFile, JSON.stringify(this.waypoints, null, 2));
            fs.writeFileSync(this.memoryFile, JSON.stringify(this.memory, null, 2));
            fs.writeFileSync(this.chestsFile, JSON.stringify(this.chests, null, 2));
            this.logger.debug('Saved all data');
        } catch (error) {
            this.logger.error(`Failed to save data: ${error.message}`);
        }
    }

    // ==================== WAYPOINTS ====================

    /**
     * Save a waypoint
     */
    saveWaypoint(name, position) {
        this.waypoints[name.toLowerCase()] = {
            x: Math.floor(position.x),
            y: Math.floor(position.y),
            z: Math.floor(position.z),
            savedAt: Date.now()
        };
        this.save();
        this.logger.info(`Saved waypoint: ${name}`);
    }

    /**
     * Get a waypoint by name
     */
    getWaypoint(name) {
        return this.waypoints[name.toLowerCase()];
    }

    /**
     * Delete a waypoint
     */
    deleteWaypoint(name) {
        const key = name.toLowerCase();
        if (this.waypoints[key]) {
            delete this.waypoints[key];
            this.save();
            return true;
        }
        return false;
    }

    /**
     * List all waypoints
     */
    listWaypoints() {
        return Object.entries(this.waypoints).map(([name, pos]) => ({
            name,
            x: pos.x,
            y: pos.y,
            z: pos.z
        }));
    }

    // ==================== HOME & LOCATIONS ====================

    /**
     * Set home location
     */
    setHome(position) {
        this.memory.homeLocation = {
            x: Math.floor(position.x),
            y: Math.floor(position.y),
            z: Math.floor(position.z)
        };
        this.save();
        this.logger.info('Home location set');
    }

    /**
     * Get home location
     */
    getHome() {
        return this.memory.homeLocation;
    }

    /**
     * Set spawn point
     */
    setSpawn(position) {
        this.memory.spawnPoint = {
            x: Math.floor(position.x),
            y: Math.floor(position.y),
            z: Math.floor(position.z)
        };
        this.save();
    }

    /**
     * Record death location
     */
    recordDeath(position) {
        this.memory.lastDeathLocation = {
            x: Math.floor(position.x),
            y: Math.floor(position.y),
            z: Math.floor(position.z),
            time: Date.now()
        };
        this.memory.stats.deathCount++;
        this.save();
    }

    /**
     * Get last death location
     */
    getDeathLocation() {
        return this.memory.lastDeathLocation;
    }

    // ==================== CHEST MANAGEMENT ====================

    /**
     * Generate a key for chest position
     */
    chestKey(position) {
        return `${Math.floor(position.x)},${Math.floor(position.y)},${Math.floor(position.z)}`;
    }

    /**
     * Update or add chest contents
     * @param {Vec3} position - Chest position
     * @param {Array} contents - Array of {name, count} items
     * @param {string} label - Optional label like "tools", "ores", "food"
     */
    updateChest(position, contents, label = null) {
        const key = this.chestKey(position);

        this.chests[key] = {
            position: {
                x: Math.floor(position.x),
                y: Math.floor(position.y),
                z: Math.floor(position.z)
            },
            contents: contents.map(item => ({
                name: item.name,
                count: item.count
            })),
            label: label || this.chests[key]?.label || null,
            lastUpdated: Date.now()
        };

        this.save();
        this.logger.debug(`Updated chest at ${key}`);
    }

    /**
     * Get chest contents by position
     */
    getChest(position) {
        const key = this.chestKey(position);
        return this.chests[key] || null;
    }

    /**
     * Set a label for a chest (e.g., "tools", "ores", "food")
     */
    labelChest(position, label) {
        const key = this.chestKey(position);
        if (this.chests[key]) {
            this.chests[key].label = label;
            this.save();
            return true;
        }
        return false;
    }

    /**
     * Find chests containing a specific item
     */
    findItemInChests(itemName) {
        const results = [];
        const normalizedName = itemName.toLowerCase();

        for (const [key, chest] of Object.entries(this.chests)) {
            const item = chest.contents.find(i =>
                i.name.toLowerCase().includes(normalizedName)
            );
            if (item) {
                results.push({
                    position: chest.position,
                    label: chest.label,
                    item: item
                });
            }
        }

        return results;
    }

    /**
     * Get all chests with a specific label
     */
    getChestsByLabel(label) {
        return Object.values(this.chests).filter(c => c.label === label);
    }

    /**
     * List all known chests
     */
    listChests() {
        return Object.values(this.chests).map(chest => ({
            position: chest.position,
            label: chest.label,
            itemCount: chest.contents.reduce((sum, i) => sum + i.count, 0),
            lastUpdated: chest.lastUpdated
        }));
    }

    /**
     * Mark a chest as a base/home chest
     */
    addBaseChest(position) {
        const key = this.chestKey(position);
        if (!this.memory.baseChests.includes(key)) {
            this.memory.baseChests.push(key);
            this.save();
        }
    }

    /**
     * Get all base chests
     */
    getBaseChests() {
        return this.memory.baseChests.map(key => this.chests[key]).filter(Boolean);
    }

    /**
     * Remove a chest from memory
     */
    forgetChest(position) {
        const key = this.chestKey(position);
        if (this.chests[key]) {
            delete this.chests[key];
            this.memory.baseChests = this.memory.baseChests.filter(k => k !== key);
            this.save();
            return true;
        }
        return false;
    }

    // ==================== STATS & INTERACTIONS ====================

    /**
     * Record a stat
     */
    addStat(stat, amount = 1) {
        if (this.memory.stats[stat] !== undefined) {
            this.memory.stats[stat] += amount;
        }
    }

    /**
     * Get stats
     */
    getStats() {
        return this.memory.stats;
    }

    /**
     * Record player interaction
     */
    recordInteraction(playerName, type) {
        if (!this.memory.playerInteractions[playerName]) {
            this.memory.playerInteractions[playerName] = {
                firstSeen: Date.now(),
                lastSeen: Date.now(),
                interactionCount: 0
            };
        }
        this.memory.playerInteractions[playerName].lastSeen = Date.now();
        this.memory.playerInteractions[playerName].interactionCount++;
    }
}

module.exports = MemorySystem;
