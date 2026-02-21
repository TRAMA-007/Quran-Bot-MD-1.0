/**
 * Bot Configuration File
 * Customize your bot settings here
 */

export default {
    // Bot Settings
    bot: {
        name: 'مُــــصْــــحَــــفْ Ai 1.0.0 🌼🤍',
        prefix: ['/'],   // Command prefixes (e.g., !help, .help, /help)
        owner: '249992134574',                // Your phone number
        ownerLid: '88858947514543',           // Your WhatsApp LID (Linked ID)
    },

    // Message Settings
    messages: {
        welcome: '👋 أهلاً وسهلاً! اكتب !مساعدة لعرض الأوامر المتاحة.',
        unknownCommand: '❓ أمر غير معروف. اكتب !مساعدة لعرض الأوامر المتاحة.',
        ownerOnly: '🔒 هذا الأمر مخصص لمالك البوت فقط.',
        groupOnly: '👥 هذا الأمر يعمل في المجموعات فقط.',
        privateOnly: '🔐 هذا الأمر يعمل في المحادثات الخاصة فقط.',
    },

    // Features Toggle
    features: {
        autoRead: true,           // Automatically mark messages as read
        autoTyping: true,         // Show typing indicator before responding
        logMessages: true,        // Log received messages to console
        respondToGroups: true,    // Respond to messages in groups
        respondToPrivate: true,   // Respond to private messages
    },

    // Auto Duaa Settings
    autoDuaa: {
        enabled: true,            // Enable/disable auto duaa feature
        probability: 7,           // 1-in-N chance to send a duaa (e.g. 7 = 1/7 chance)
    },

    // Anti-Spam Settings
    antiSpam: {
        enabled: true,
        maxMessages: 10,          // Max messages per interval
        interval: 60000,          // Interval in milliseconds (60 seconds)
        blockDuration: 300000,    // Block duration in milliseconds (5 minutes)
    },

    // Sticker Settings
    sticker: {
        packName: 'Yuki Ai',
        author: 'TRAMAZOOL 💊',
    }
};
