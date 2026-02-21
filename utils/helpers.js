/**
 * Helper utility functions for the WhatsApp bot
 */

/**
 * Format phone number to WhatsApp JID format
 * @param {string} number - Phone number
 * @returns {string} - Formatted JID
 */
export function formatJid(number) {
    // Remove any non-numeric characters
    const cleaned = number.replace(/\D/g, '');
    return `${cleaned}@s.whatsapp.net`;
}

/**
 * Extract phone number from JID
 * @param {string} jid - WhatsApp JID
 * @returns {string} - Phone number
 */
export function extractNumber(jid) {
    return jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
}

/**
 * Check if JID is a group
 * @param {string} jid - WhatsApp JID
 * @returns {boolean}
 */
export function isGroup(jid) {
    return jid.endsWith('@g.us');
}

/**
 * Format uptime to human readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} - Formatted uptime
 */
export function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size
 */
export function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} - Random string
 */
export function randomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if string is a valid URL
 * @param {string} str - String to check
 * @returns {boolean}
 */
export function isUrl(str) {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

/**
 * Parse command and arguments from message
 * @param {string} text - Message text
 * @param {string|string[]} prefix - Command prefix(es)
 * @returns {object} - { command, args, fullArgs, usedPrefix }
 */
export function parseCommand(text, prefix = '!') {
    // Convert single prefix to array for unified handling
    const prefixes = Array.isArray(prefix) ? prefix : [prefix];

    // Find which prefix was used
    let usedPrefix = null;
    for (const p of prefixes) {
        if (text.startsWith(p)) {
            usedPrefix = p;
            break;
        }
    }

    if (!usedPrefix) {
        return { command: null, args: [], fullArgs: '', usedPrefix: null };
    }

    const parts = text.slice(usedPrefix.length).trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    const fullArgs = args.join(' ');

    return { command, args, fullArgs, usedPrefix };
}

/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
export function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Max length
 * @param {string} suffix - Suffix to add if truncated
 * @returns {string}
 */
export function truncate(str, length = 100, suffix = '...') {
    if (str.length <= length) return str;
    return str.slice(0, length - suffix.length) + suffix;
}
