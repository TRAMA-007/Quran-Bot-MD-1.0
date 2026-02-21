/**
 * Chat Store - Manages chat tracking for broadcast feature
 * Stores chats in a JSON file for persistence
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHATS_FILE = path.join(__dirname, '..', 'data', 'chats.json');

// Ensure data directory exists
function ensureDataDir() {
    const dataDir = path.dirname(CHATS_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

/**
 * Load all tracked chats from file
 * @returns {Set<string>} Set of chat JIDs
 */
export function loadChats() {
    try {
        ensureDataDir();
        if (fs.existsSync(CHATS_FILE)) {
            const data = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf-8'));
            return new Set(data.chats || []);
        }
    } catch (error) {
        console.error('Error loading chats:', error.message);
    }
    return new Set();
}

/**
 * Save chats to file
 * @param {Set<string>} chats - Set of chat JIDs
 */
export function saveChats(chats) {
    try {
        ensureDataDir();
        const data = {
            lastUpdated: new Date().toISOString(),
            count: chats.size,
            chats: Array.from(chats)
        };
        fs.writeFileSync(CHATS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving chats:', error.message);
    }
}

/**
 * Add a chat to the tracked list
 * @param {Set<string>} chats - Current chats set
 * @param {string} chatJid - Chat JID to add
 * @returns {boolean} True if new chat was added
 */
export function addChat(chats, chatJid) {
    if (!chats.has(chatJid)) {
        chats.add(chatJid);
        saveChats(chats);
        return true;
    }
    return false;
}

/**
 * Remove a chat from the tracked list
 * @param {Set<string>} chats - Current chats set
 * @param {string} chatJid - Chat JID to remove
 * @returns {boolean} True if chat was removed
 */
export function removeChat(chats, chatJid) {
    if (chats.has(chatJid)) {
        chats.delete(chatJid);
        saveChats(chats);
        return true;
    }
    return false;
}

/**
 * Get chat statistics
 * @param {Set<string>} chats - Current chats set
 * @returns {object} Statistics object
 */
export function getChatStats(chats) {
    const allChats = Array.from(chats);
    return {
        total: chats.size,
        groups: allChats.filter(c => c.endsWith('@g.us')).length,
        private: allChats.filter(c => c.endsWith('@s.whatsapp.net') || c.endsWith('@lid')).length
    };
}

export default {
    loadChats,
    saveChats,
    addChat,
    removeChat,
    getChatStats
};
