/**
 * OpenNova Utility Helpers
 */

const Vec3 = require('vec3');

/**
 * Calculate distance between two positions
 */
function distance(pos1, pos2) {
    return Math.sqrt(
        Math.pow(pos2.x - pos1.x, 2) +
        Math.pow(pos2.y - pos1.y, 2) +
        Math.pow(pos2.z - pos1.z, 2)
    );
}

/**
 * Calculate horizontal distance (ignoring Y)
 */
function horizontalDistance(pos1, pos2) {
    return Math.sqrt(
        Math.pow(pos2.x - pos1.x, 2) +
        Math.pow(pos2.z - pos1.z, 2)
    );
}

/**
 * Format position for display
 */
function formatPos(pos) {
    if (!pos) return 'unknown';
    return `(${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)})`;
}

/**
 * Parse coordinates from string arguments
 */
function parseCoords(args) {
    if (args.length < 3) return null;
    const x = parseFloat(args[0]);
    const y = parseFloat(args[1]);
    const z = parseFloat(args[2]);
    if (isNaN(x) || isNaN(y) || isNaN(z)) return null;
    return new Vec3(x, y, z);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format time duration in human readable format
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Get cardinal direction from yaw angle
 */
function getDirection(yaw) {
    const directions = ['south', 'west', 'north', 'east'];
    const index = Math.round(((yaw + 180) % 360) / 90) % 4;
    return directions[index];
}

/**
 * Check if item name matches search term
 */
function itemMatches(itemName, searchTerm) {
    const normalized = searchTerm.toLowerCase().replace(/\s+/g, '_');
    return itemName.toLowerCase().includes(normalized);
}

/**
 * Find item in inventory by name
 */
function findInventoryItem(bot, itemName) {
    return bot.inventory.items().find(item =>
        itemMatches(item.name, itemName)
    );
}

/**
 * Count items in inventory by name
 */
function countInventoryItem(bot, itemName) {
    return bot.inventory.items()
        .filter(item => itemMatches(item.name, itemName))
        .reduce((sum, item) => sum + item.count, 0);
}

/**
 * Get all unique item names in inventory
 */
function getInventoryItems(bot) {
    const items = {};
    bot.inventory.items().forEach(item => {
        if (items[item.name]) {
            items[item.name] += item.count;
        } else {
            items[item.name] = item.count;
        }
    });
    return items;
}

/**
 * Format item name for display
 */
function formatItemName(name) {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Check if bot has enough of an item
 */
function hasItem(bot, itemName, count = 1) {
    return countInventoryItem(bot, itemName) >= count;
}

/**
 * Get nearby players (excluding bot itself)
 */
function getNearbyPlayers(bot, range = 50) {
    return Object.values(bot.players)
        .filter(p => p.entity && p.username !== bot.username)
        .filter(p => distance(bot.entity.position, p.entity.position) <= range)
        .sort((a, b) =>
            distance(bot.entity.position, a.entity.position) -
            distance(bot.entity.position, b.entity.position)
        );
}

/**
 * Get nearest hostile mobs
 */
function getNearbyHostileMobs(bot, range = 16) {
    const hostileMobs = [
        'zombie', 'skeleton', 'creeper', 'spider', 'cave_spider',
        'enderman', 'witch', 'slime', 'phantom', 'drowned',
        'husk', 'stray', 'pillager', 'vindicator', 'ravager',
        'blaze', 'ghast', 'wither_skeleton', 'piglin_brute'
    ];

    return Object.values(bot.entities)
        .filter(e => e.type === 'mob' || e.type === 'hostile')
        .filter(e => hostileMobs.some(mob => e.name?.includes(mob)))
        .filter(e => distance(bot.entity.position, e.position) <= range)
        .sort((a, b) =>
            distance(bot.entity.position, a.position) -
            distance(bot.entity.position, b.position)
        );
}

module.exports = {
    distance,
    horizontalDistance,
    formatPos,
    parseCoords,
    sleep,
    formatDuration,
    getDirection,
    itemMatches,
    findInventoryItem,
    countInventoryItem,
    getInventoryItems,
    formatItemName,
    hasItem,
    getNearbyPlayers,
    getNearbyHostileMobs,
    Vec3
};
