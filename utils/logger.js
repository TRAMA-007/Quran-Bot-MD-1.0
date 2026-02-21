/**
 * Simple colored console logger for the WhatsApp bot
 */

// ANSI color codes for console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Text colors
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    // Background colors
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
};

/**
 * Get formatted timestamp
 * @returns {string}
 */
function getTimestamp() {
    return new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Log info message
 * @param {string} message 
 */
export function info(message) {
    console.log(
        `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
        `${colors.blue}ℹ INFO${colors.reset} ${message}`
    );
}

/**
 * Log success message
 * @param {string} message 
 */
export function success(message) {
    console.log(
        `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
        `${colors.green}✓ SUCCESS${colors.reset} ${message}`
    );
}

/**
 * Log warning message
 * @param {string} message 
 */
export function warn(message) {
    console.log(
        `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
        `${colors.yellow}⚠ WARN${colors.reset} ${message}`
    );
}

/**
 * Log error message
 * @param {string} message 
 */
export function error(message) {
    console.log(
        `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
        `${colors.red}✖ ERROR${colors.reset} ${message}`
    );
}

/**
 * Log debug message
 * @param {string} message 
 */
export function debug(message) {
    console.log(
        `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
        `${colors.magenta}🔧 DEBUG${colors.reset} ${message}`
    );
}

/**
 * Log incoming message
 * @param {string} from - Sender
 * @param {string} message - Message content
 */
export function message(from, message) {
    console.log(
        `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
        `${colors.cyan}📩 MSG${colors.reset} ` +
        `${colors.bright}${from}${colors.reset}: ${message}`
    );
}

/**
 * Log outgoing message
 * @param {string} to - Recipient
 * @param {string} message - Message content
 */
export function sent(to, message) {
    console.log(
        `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
        `${colors.green}📤 SENT${colors.reset} ` +
        `to ${colors.bright}${to}${colors.reset}: ${message}`
    );
}

/**
 * Log command execution
 * @param {string} command - Command name
 * @param {string} user - User who executed
 */
export function command(command, user) {
    console.log(
        `${colors.dim}[${getTimestamp()}]${colors.reset} ` +
        `${colors.yellow}⚡ CMD${colors.reset} ` +
        `${colors.bright}${command}${colors.reset} by ${user}`
    );
}

export default {
    info,
    success,
    warn,
    error,
    debug,
    message,
    sent,
    command
};
