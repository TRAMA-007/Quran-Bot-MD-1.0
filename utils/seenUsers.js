/**
 * Seen Users Store - Tracks first-time private chat users
 * Stores user JIDs in a JSON file for persistence across restarts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEN_FILE = path.join(__dirname, '..', 'data', 'seenUsers.json');

// Ensure data directory exists
function ensureDataDir() {
    const dataDir = path.dirname(SEEN_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

/**
 * Load all seen users from file
 * @returns {Set<string>} Set of user JIDs who have already received the welcome menu
 */
export function loadSeenUsers() {
    try {
        ensureDataDir();
        if (fs.existsSync(SEEN_FILE)) {
            const data = JSON.parse(fs.readFileSync(SEEN_FILE, 'utf-8'));
            return new Set(data.users || []);
        }
    } catch (error) {
        console.error('Error loading seen users:', error.message);
    }
    return new Set();
}

/**
 * Save seen users to file
 * @param {Set<string>} users
 */
function saveSeenUsers(users) {
    try {
        ensureDataDir();
        const data = {
            lastUpdated: new Date().toISOString(),
            count: users.size,
            users: Array.from(users)
        };
        fs.writeFileSync(SEEN_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving seen users:', error.message);
    }
}

/**
 * Check if a user is new (first time messaging the bot in private).
 * Marks them as seen immediately so the welcome only fires once.
 * @param {Set<string>} seenUsers - The in-memory set
 * @param {string} userJid - The user's JID
 * @returns {boolean} True if this is their first message
 */
export function isNewUser(seenUsers, userJid) {
    if (seenUsers.has(userJid)) return false;
    seenUsers.add(userJid);
    saveSeenUsers(seenUsers);
    return true;
}
