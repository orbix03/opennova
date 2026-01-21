/**
 * OpenNova Logger - Colored console logging utility
 */

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Foreground colors
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
};

const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    SUCCESS: 4
};

class Logger {
    constructor(name = 'OpenNova') {
        this.name = name;
        this.minLevel = LogLevel.DEBUG;
    }

    setLevel(level) {
        this.minLevel = level;
    }

    formatTime() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { hour12: false });
    }

    formatMessage(level, color, message, ...args) {
        const time = this.formatTime();
        const prefix = `${colors.gray}[${time}]${colors.reset} ${color}[${level}]${colors.reset}`;
        const nameTag = `${colors.cyan}[${this.name}]${colors.reset}`;

        let formattedMessage = message;
        if (args.length > 0) {
            formattedMessage = `${message} ${args.map(a =>
                typeof a === 'object' ? JSON.stringify(a, null, 2) : a
            ).join(' ')}`;
        }

        return `${prefix} ${nameTag} ${formattedMessage}`;
    }

    debug(message, ...args) {
        if (this.minLevel <= LogLevel.DEBUG) {
            console.log(this.formatMessage('DEBUG', colors.gray, message, ...args));
        }
    }

    info(message, ...args) {
        if (this.minLevel <= LogLevel.INFO) {
            console.log(this.formatMessage('INFO', colors.blue, message, ...args));
        }
    }

    warn(message, ...args) {
        if (this.minLevel <= LogLevel.WARN) {
            console.log(this.formatMessage('WARN', colors.yellow, message, ...args));
        }
    }

    error(message, ...args) {
        if (this.minLevel <= LogLevel.ERROR) {
            console.log(this.formatMessage('ERROR', colors.red, message, ...args));
        }
    }

    success(message, ...args) {
        console.log(this.formatMessage('SUCCESS', colors.green, message, ...args));
    }

    chat(username, message) {
        const time = this.formatTime();
        console.log(`${colors.gray}[${time}]${colors.reset} ${colors.magenta}[CHAT]${colors.reset} <${colors.cyan}${username}${colors.reset}> ${message}`);
    }

    command(username, command) {
        const time = this.formatTime();
        console.log(`${colors.gray}[${time}]${colors.reset} ${colors.yellow}[CMD]${colors.reset} ${colors.cyan}${username}${colors.reset} executed: ${colors.bright}${command}${colors.reset}`);
    }
}

module.exports = { Logger, LogLevel, colors };
