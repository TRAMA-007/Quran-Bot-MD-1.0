/**
 * Shared quiz session store
 * Kept in its own file to avoid circular imports between index.js and commands/index.js
 * 
 * Map<chatJid, { question, timer }>
 */
export const quizSessions = new Map();
