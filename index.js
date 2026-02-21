import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import axios from 'axios';
import sharp from 'sharp';

// Import local modules
import config from './config.js';
import logger from './utils/logger.js';
import { parseCommand } from './utils/helpers.js';
import { getCommand, getAllCommands, isValidPageNumber } from './commands/index.js';
import { loadChats, addChat } from './utils/chatStore.js';
import { loadSeenUsers, isNewUser } from './utils/seenUsers.js';
import { quizSessions } from './utils/quizSessions.js';

// Pino logger - silent for clean output
const pinoLogger = pino({ level: 'silent' });

// ── Auto Duaa Feature ────────────────────────────────────────────────────────
// Arabic letter detector (any single Arabic Unicode character)
const ARABIC_REGEX = /[\u0600-\u06FF]/;

const DUAA_LIST = [
    '🤲 *اللهم اغفر لنا ذنوبنا وكفر عنا سيئاتنا وتوفنا مع الأبرار*',
    '🤲 *اللهم بارك لنا في أعمارنا وأعمالنا وأرزاقنا وذرياتنا*',
    '🤲 *اللهم اجعلنا ممن يستمعون القول فيتبعون أحسنه*',
    '🤲 *اللهم ثبت قلوبنا على دينك وطاعتك*',
    '🤲 *اللهم اكفنا بحلالك عن حرامك وأغننا بفضلك عمن سواك*',
    '🤲 *اللهم إنا نسألك علماً نافعاً ورزقاً طيباً وعملاً متقبلاً*',
    '🤲 *اللهم اجعل القرآن الكريم ربيع قلوبنا ونور صدورنا*',
    '🤲 *اللهم أصلح لنا ديننا الذي هو عصمة أمرنا وأصلح لنا دنيانا التي فيها معاشنا*',
    '🤲 *اللهم إنا نعوذ بك من الهم والحزن والعجز والكسل والبخل والجبن وضلع الدين وغلبة الرجال*',
    '🤲 *اللهم آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار*',
    '🤲 *سبحان الله وبحمده سبحان الله العظيم*',
    '🤲 *اللهم أنت ربي لا إله إلا أنت خلقتني وأنا عبدك وأنا على عهدك ووعدك ما استطعت*',
    '🤲 *اللهم اغفر لي ولوالديّ وللمسلمين والمسلمات الأحياء منهم والأموات*',
    '🤲 *لا إله إلا أنت سبحانك إني كنت من الظالمين*',
    '🤲 *اللهم صل وسلم وبارك على سيدنا محمد وعلى آله وصحبه أجمعين*',
    '🤲 *اللهم يسر ولا تعسر وبشر ولا تنفر*',
    '🤲 *اللهم اجعلنا من عبادك الصالحين واحشرنا في زمرة النبيين والصديقين والشهداء والصالحين*',
    '🤲 *اللهم إنا نسألك الجنة وما قرب إليها من قول أو عمل ونعوذ بك من النار وما قرب إليها من قول أو عمل*',
    '🤲 *ربنا لا تزغ قلوبنا بعد إذ هديتنا وهب لنا من لدنك رحمة إنك أنت الوهاب*',
    '🤲 *اللهم اجعل خير أعمالنا خواتيمها وخير أيامنا يوم نلقاك*',
];

// Tracked chats for broadcast feature
const trackedChats = loadChats();

// First-time user tracking (private chats only)
const seenUsers = loadSeenUsers();

// Spam protection
const messageTracker = new Map();

/**
 * Check if user is spamming
 */
function isSpamming(sender) {
    if (!config.antiSpam.enabled) return false;

    const now = Date.now();
    const userData = messageTracker.get(sender) || { count: 0, firstMessage: now, blocked: false, blockedUntil: 0 };

    // Check if user is blocked
    if (userData.blocked && now < userData.blockedUntil) {
        return true;
    } else if (userData.blocked) {
        userData.blocked = false;
        userData.count = 0;
    }

    // Reset count if interval passed
    if (now - userData.firstMessage > config.antiSpam.interval) {
        userData.count = 0;
        userData.firstMessage = now;
    }

    userData.count++;

    // Check if limit exceeded
    if (userData.count > config.antiSpam.maxMessages) {
        userData.blocked = true;
        userData.blockedUntil = now + config.antiSpam.blockDuration;
        messageTracker.set(sender, userData);
        return true;
    }

    messageTracker.set(sender, userData);
    return false;
}

/**
 * Start the WhatsApp Bot
 */
async function startBot() {
    logger.info('Starting WhatsApp Bot...');

    // Load auth state
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    // Get Baileys version
    const { version, isLatest } = await fetchLatestBaileysVersion();
    logger.info(`Using Baileys v${version.join('.')} | Latest: ${isLatest}`);

    // Create socket connection
    const sock = makeWASocket({
        version,
        logger: pinoLogger,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pinoLogger)
        },
        printQRInTerminal: false,
        generateHighQualityLinkPreview: true,
    });

    // Connection update handler
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📲 Scan this QR code with WhatsApp:\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            logger.error(`Connection closed: ${lastDisconnect?.error?.message}`);

            if (shouldReconnect) {
                logger.info('Reconnecting...');
                startBot();
            } else {
                logger.warn('Logged out. Delete auth_info folder and restart to scan QR again.');
            }
        } else if (connection === 'open') {
            logger.success('Bot connected successfully!');
            console.log('\n👋 WhatsApp Bot is now running...');
            console.log(`📋 Loaded ${getAllCommands().size} commands`);
            console.log(`⚡ Command prefixes: ${Array.isArray(config.bot.prefix) ? config.bot.prefix.join(', ') : config.bot.prefix}\n`);
        }
    });

    // Save credentials on update
    sock.ev.on('creds.update', saveCreds);

    // Message handler
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            // Skip own messages
            if (msg.key.fromMe) continue;

            const messageContent = msg.message;
            if (!messageContent) continue;

            // Extract text
            const text = messageContent.conversation ||
                messageContent.extendedTextMessage?.text ||
                messageContent.imageMessage?.caption ||
                messageContent.videoMessage?.caption || '';

            const sender = msg.key.remoteJid;
            const isGroup = sender.endsWith('@g.us');
            const senderJid = isGroup ? msg.key.participant : sender; // Actual sender's JID
            const pushName = msg.pushName || 'Unknown';

            // Check feature flags
            if (isGroup && !config.features.respondToGroups) continue;
            if (!isGroup && !config.features.respondToPrivate) continue;

            // Log message
            if (config.features.logMessages) {
                logger.message(pushName, text || '[Media]');
            }

            // Auto read
            if (config.features.autoRead) {
                await sock.readMessages([msg.key]);
            }

            // Track chat for broadcast feature
            addChat(trackedChats, sender);

            // ── First-time Welcome ─────────────────────────────────────────
            // Only for private chats — send the menu once to new users
            if (!isGroup && isNewUser(seenUsers, senderJid)) {
                const helpCmd = getCommand('help');
                if (helpCmd) {
                    logger.info(`New user welcomed: ${pushName}`);
                    await helpCmd.execute(sock, msg, [], sender, pushName, isGroup);
                }
            }
            // ──────────────────────────────────────────────────────────────

            // ── Auto Duaa ─────────────────────────────────────────────────
            // If message contains Arabic text, randomly send a duaa (1-in-N chance)
            if (
                config.autoDuaa.enabled &&
                ARABIC_REGEX.test(text) &&
                Math.random() < 1 / config.autoDuaa.probability
            ) {
                const randomDuaa = DUAA_LIST[Math.floor(Math.random() * DUAA_LIST.length)];
                await sock.sendMessage(sender, { text: randomDuaa });
            }
            // ──────────────────────────────────────────────────────────────

            // ── Quiz Answer Interceptor ────────────────────────────────────
            if (quizSessions.has(sender)) {
                const session = quizSessions.get(sender);
                const answer = text.trim();
                if (answer === '1' || answer === '2' || answer === '3') {
                    clearTimeout(session.timer);
                    quizSessions.delete(sender);

                    const choiceIndex = parseInt(answer, 10) - 1;
                    const isCorrect = session.question.answers[choiceIndex]?.t === 1;
                    const correctAnswer = session.question.answers.find(a => a.t === 1)?.answer;

                    // Shuffle indexes back to find which number was correct
                    const correctNum = session.question.answers.findIndex(a => a.t === 1) + 1;

                    if (isCorrect) {
                        await sock.sendMessage(sender, {
                            text: `✅ *إجابة صحيحة!* أحسنت 🎉\n\n📌 الإجابة: ${correctAnswer}`
                        }, { quoted: msg });
                    } else {
                        await sock.sendMessage(sender, {
                            text: `❌ *إجابة خاطئة*\n\n📌 الإجابة الصحيحة هي رقم *${correctNum}*: ${correctAnswer}`
                        }, { quoted: msg });
                    }
                    continue;
                }
            }
            // ──────────────────────────────────────────────────────────────

            // Auto-trigger: plain number between 1-604 (no prefix needed) 
            /*
            if (isValidPageNumber(text.trim())) {
                const num = parseInt(text.trim(), 10);
                const quranURL = `https://quran.ksu.edu.sa/png_big/${num}.png`;
                try {
                    // Fetch the transparent PNG
                    const response = await axios.get(quranURL, { responseType: 'arraybuffer' });
                    const pngBuffer = Buffer.from(response.data);

                    // Flatten transparent background to white, output as JPEG
                    const jpegBuffer = await sharp(pngBuffer)
                        .flatten({ background: { r: 255, g: 255, b: 255 } })
                        .jpeg({ quality: 90 })
                        .toBuffer();

                    await sock.sendMessage(sender, { image: jpegBuffer, caption: `🔸رقـم الـصـفـحـة : ${num}\n\nتقبل الله منا و منكم ، لا تنسونا من صالح الدعاء 🤍` }, { quoted: msg });
                } catch (error) {
                    logger.error(`Failed to send quran page: ${error.message}`);
                }
            }
*/

            // Parse command
            const { command, args, fullArgs } = parseCommand(text, config.bot.prefix);

            if (command) {
                const cmd = getCommand(command);

                if (cmd) {
                    // Check for spam (commands only, tracked per individual user)
                    if (isSpamming(senderJid)) {
                        logger.warn(`Blocked spam from ${pushName}`);
                        continue;
                    }

                    // Check owner only - handle both LID (@lid) and phone number (@s.whatsapp.net) formats
                    const senderId = senderJid.split('@')[0].split(':')[0];
                    const isLid = senderJid.endsWith('@lid');
                    const isOwner = isLid
                        ? senderId === config.bot.ownerLid
                        : senderId === config.bot.owner;

                    if (cmd.ownerOnly && !isOwner) {
                        await sock.sendMessage(sender, { text: config.messages.ownerOnly });
                        continue;
                    }

                    // Check group only
                    if (cmd.groupOnly && !isGroup) {
                        await sock.sendMessage(sender, { text: config.messages.groupOnly });
                        continue;
                    }

                    // Check private only
                    if (cmd.privateOnly && isGroup) {
                        await sock.sendMessage(sender, { text: config.messages.privateOnly });
                        continue;
                    }

                    // Show typing indicator
                    if (config.features.autoTyping) {
                        await sock.sendPresenceUpdate('composing', sender);
                    }

                    // Execute command
                    logger.command(command, pushName);

                    try {
                        await cmd.execute(sock, msg, args, sender, pushName, isGroup, trackedChats);
                    } catch (error) {
                        logger.error(`Command error: ${error.message}`);
                        await sock.sendMessage(sender, {
                            text: '❌ حدث خطأ أثناء تنفيذ الأمر.'
                        });
                    }

                    // Clear typing
                    if (config.features.autoTyping) {
                        await sock.sendPresenceUpdate('paused', sender);
                    }
                }
            }
        }
    });

    return sock;
}

// Start the bot
console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║     🤖 ${config.bot.name.padEnd(20)}       ║
║     Powered by Baileys                ║
║                                       ║
╚═══════════════════════════════════════╝
`);

startBot().catch((err) => {
    logger.error(`Failed to start bot: ${err.message}`);
    process.exit(1);
});
