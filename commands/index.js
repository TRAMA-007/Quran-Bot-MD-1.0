/**
 * Command Registry
 * All bot commands are registered here
 */

import config from '../config.js';
import { formatUptime } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { quizSessions } from '../utils/quizSessions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Load & flatten quiz questions once at startup ─────────────────────────────
let QUIZ_POOL = [];
try {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'quiz.json'), 'utf-8');
    const db = JSON.parse(raw);

    // Recurse through the nested structure and collect every question object
    function extractQuestions(node) {
        if (Array.isArray(node)) {
            node.forEach(extractQuestions);
        } else if (node && typeof node === 'object') {
            // It's a question if it has 'q' and 'answers'
            if (node.q && Array.isArray(node.answers)) {
                QUIZ_POOL.push(node);
            } else {
                Object.values(node).forEach(extractQuestions);
            }
        }
    }
    extractQuestions(db);
    logger.info(`Quiz pool loaded: ${QUIZ_POOL.length} questions`);
} catch (e) {
    logger.error(`Failed to load quiz.json: ${e.message}`);
}

// Command collection
const commands = new Map();

/**
 * Register a command
 * @param {string} name - Command name
 * @param {object} options - Command options
 */
export function registerCommand(name, options) {
    const commandData = {
        name,
        aliases: options.aliases || [],
        description: options.description || 'No description',
        descriptionAr: options.descriptionAr || options.description || 'لا يوجد وصف',
        usage: options.usage || `${config.bot.prefix}${name}`,
        category: options.category || 'general',
        ownerOnly: options.ownerOnly || false,
        groupOnly: options.groupOnly || false,
        privateOnly: options.privateOnly || false,
        cooldown: options.cooldown || 0,
        execute: options.execute
    };

    // Register main command
    commands.set(name, commandData);

    // Register aliases
    if (options.aliases) {
        options.aliases.forEach(alias => {
            commands.set(alias, commandData);
        });
    }
}

/**
 * Get a command by name or alias
 * @param {string} name - Command name or alias
 * @returns {object|undefined}
 */
export function getCommand(name) {
    return commands.get(name);
}

/**
 * Get all commands
 * @returns {Map}
 */
export function getAllCommands() {
    return commands;
}

/**
 * Get commands by category
 * @param {string} category 
 * @returns {array}
 */
export function getCommandsByCategory(category) {
    return Array.from(commands.values()).filter(cmd => cmd.category === category);
}

/**
 * Get unique commands (no duplicates from aliases)
 * @returns {array}
 */
function getUniqueCommands() {
    const seen = new Set();
    const uniqueCmds = [];
    commands.forEach(cmd => {
        if (!seen.has(cmd.name)) {
            seen.add(cmd.name);
            uniqueCmds.push(cmd);
        }
    });
    return uniqueCmds;
}

// Category translations
const categoryNames = {
    general: 'عام',
    fun: 'ترفيه',
    media: 'وسائط',
    owner: 'المالك',
    quran: 'القرآن الكريم'
};

// ==================== HELPERS ====================

/**
 * Check if input is a valid surah number (positive integer between 1 and 604)
 * @param {string} input - The user's input
 * @returns {boolean}
 */
export function isValidPageNumber(input) {
    if (!/^\d+$/.test(input)) return false;
    const num = parseInt(input, 10);
    return num >= 1 && num <= 604;
}

export function isValidSurahNumber(input) {
    if (!/^\d+$/.test(input)) return false;
    const num = parseInt(input, 10);
    return num >= 1 && num <= 114;
}


// ==================== REGISTER COMMANDS ====================

// Ping Command - اتصال
registerCommand('ping', {
    aliases: ['بنق', 'اتصال'],
    description: 'Check if bot is alive',
    descriptionAr: 'التحقق من اتصال البوت',
    category: 'general',
    async execute(sock, msg, args, sender) {
        const start = Date.now();
        await sock.sendMessage(sender, { text: '🏓 جاري الفحص...' });
        const latency = Date.now() - start;
        await sock.sendMessage(sender, {
            text: `🏓 تم الاتصال!\n⏱️ زمن الاستجابة: ${latency}ms`
        });
    }
});

// Help Command - مساعدة
registerCommand('help', {
    aliases: ['مساعدة', 'اوامر', 'أوامر', 'قران', 'بوت', 'أ', 'ا', 'م'],
    description: 'Show available commands',
    descriptionAr: 'عرض الأوامر المتاحة',
    usage: '!help [command] | !مساعدة [أمر]',
    category: 'general',
    async execute(sock, msg, args, sender) {
        if (args.length > 0) {
            // Show specific command help
            const cmdName = args[0].toLowerCase();
            const cmd = getCommand(cmdName);

            if (cmd) {
                const aliasesText = cmd.aliases.length > 0 ? cmd.aliases.join('، ') : 'لا يوجد';
                const helpText = `
📖 *الأمر: ${config.bot.prefix[0]}${cmd.name}*

📝 الوصف: ${cmd.descriptionAr}
💡 الاستخدام: ${cmd.usage}
📁 التصنيف: ${categoryNames[cmd.category] || cmd.category}
🔤 أسماء بديلة: ${aliasesText}
${cmd.ownerOnly ? '🔒 للمالك فقط: نعم' : ''}
${cmd.cooldown > 0 ? `⏱️ فترة الانتظار: ${cmd.cooldown} ثانية` : ''}
                `.trim();

                await sock.sendMessage(sender, { text: helpText });
            } else {
                await sock.sendMessage(sender, {
                    text: `❌ الأمر "${cmdName}" غير موجود.`
                });
            }
            return;
        }

        // ── Build clean Arabic Quran menu ──
        const prefix = config.bot.prefix[0];

        const menuText = `
🌙 *${config.bot.name}*
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
📖 *أوامر القرآن الكريم*
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

🔹 ${prefix}فهرس
     ↳ عرض قائمة أرقام جميع السور

🔹 ${prefix}سورة + رقم
     ↳ إرسال سورة كاملة نصاً
     ↳ مثال : ${prefix}سورة 18

🔹 ${prefix}تلاوة + رقم
     ↳ إرسال سورة بالصوت
     ↳ مثال : ${prefix}تلاوة 36

🔹 ${prefix}صفحة + رقم
     ↳ إرسال صفحة من المصحف (1 - 604)
     ↳ مثال : ${prefix}صفحة 1

🔹 ${prefix}آية
     ↳ آيـة عشوائية من القرآن الكريم

🔹 ${prefix}حديث
     ↳ حديث عشوائي من السنة النبوية

🔹 ${prefix}سؤال
     ↳ سؤال إسلامي عشوائي مع خيارات
     ↳ أجب بـ 1 أو 2 أو 3

┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
✨ *مميزات البوت*
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

🤲 دعاء تلقائي عند كل بضعة رسائل
📖 آيات قرآنية من المصحف
🎙️ تلاوة سور القرآن بأصوات عالية الجودة
🖼️ صفحات المصحف بجودة عالية

┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
⚠️ يجب كتابة *${prefix}* قبل كل أمر
`.trim();

        await sock.sendMessage(sender, { text: menuText });
    }
});

// Info Command - معلومات
registerCommand('info', {
    aliases: ['معلومات', 'عن', 'حول'],
    description: 'Show bot information',
    descriptionAr: 'عرض معلومات البوت',
    category: 'general',
    async execute(sock, msg, args, sender) {
        const uniqueCommands = getUniqueCommands().length;
        const infoText = `
🤖 * معلومات البوت *

📛 الاسم: ${config.bot.name}
📦 المكتبة: Baileys
⏰ مدة التشغيل: ${formatUptime(process.uptime())}
📊 الأوامر: ${uniqueCommands}
💾 الذاكرة: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
        `.trim();

        await sock.sendMessage(sender, { text: infoText });
    }
});

// Time Command - وقت
registerCommand('time', {
    aliases: ['وقت', 'الوقت', 'ساعة'],
    description: 'Show current time',
    descriptionAr: 'عرض الوقت الحالي',
    category: 'general',
    async execute(sock, msg, args, sender) {
        const now = new Date();
        await sock.sendMessage(sender, {
            text: `🕐 الوقت الحالي: ${now.toLocaleString('ar-SA')} `
        });
    }
});

// Echo Command - صدى
registerCommand('echo', {
    aliases: ['صدى', 'ردد', 'قل'],
    description: 'Echo back the provided text',
    descriptionAr: 'إعادة النص المرسل',
    usage: '!echo <text> | !صدى <نص>',
    category: 'fun',
    async execute(sock, msg, args, sender) {
        const text = args.join(' ');
        if (text) {
            await sock.sendMessage(sender, { text: `📢 ${text} ` });
        } else {
            await sock.sendMessage(sender, {
                text: '❌ الرجاء إدخال نص!'
            });
        }
    }
});

// Sticker Command - ملصق
registerCommand('sticker', {
    aliases: ['ملصق', 'ستيكر', 's'],
    description: 'Convert image to sticker',
    descriptionAr: 'تحويل صورة إلى ملصق',
    usage: '!sticker | !ملصق (رد على صورة أو أرسل مع صورة)',
    category: 'media',
    async execute(sock, msg, args, sender) {
        const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
        const { Sticker, StickerTypes } = await import('wa-sticker-formatter');

        const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMessage = msg.message?.imageMessage || quotedMessage?.imageMessage;
        const videoMessage = msg.message?.videoMessage || quotedMessage?.videoMessage;

        const mediaMessage = imageMessage || videoMessage;
        const mediaType = imageMessage ? 'image' : 'video';

        if (!mediaMessage) {
            await sock.sendMessage(sender, {
                text: '❌ الرجاء إرسال صورة/فيديو مع الأمر أو الرد على صورة/فيديو!'
            });
            return;
        }

        await sock.sendMessage(sender, { text: '🔄 جاري إنشاء الملصق...' });

        try {
            const stream = await downloadContentFromMessage(mediaMessage, mediaType);
            const chunks = [];

            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            const buffer = Buffer.concat(chunks);

            // Create sticker with metadata using wa-sticker-formatter
            const sticker = new Sticker(buffer, {
                pack: config.sticker.packName,      // Pack name
                author: config.sticker.author,      // Author name
                type: StickerTypes.FULL,            // Full sticker (not cropped)
                quality: 80,                        // Quality (1-100)
            });

            const stickerBuffer = await sticker.toBuffer();

            await sock.sendMessage(sender, {
                sticker: stickerBuffer
            });

            logger.success(`Sticker created for ${sender}`);
        } catch (error) {
            logger.error(`Sticker creation failed: ${error.message} `);
            await sock.sendMessage(sender, {
                text: '❌ فشل في إنشاء الملصق. حاول مرة أخرى.'
            });
        }
    }
});

// Menu Command (alias for help) - قائمة
registerCommand('menu', {
    aliases: ['قائمة', 'القائمة'],
    description: 'Show command menu',
    descriptionAr: 'عرض قائمة الأوامر',
    category: 'general',
    async execute(sock, msg, args, sender) {
        const helpCmd = getCommand('help');
        await helpCmd.execute(sock, msg, args, sender);
    }
});

// Owner Command (example owner-only command) - إذاعة
registerCommand('broadcast', {
    aliases: ['اذاعة', 'إذاعة', 'بث'],
    description: 'Broadcast message to all chats',
    descriptionAr: 'إرسال رسالة لجميع المحادثات',
    usage: '!broadcast <message> | !اذاعة <رسالة>',
    category: 'owner',
    ownerOnly: true,
    async execute(sock, msg, args, sender, pushName, isGroup, trackedChats) {
        const message = args.join(' ');

        if (!message) {
            await sock.sendMessage(sender, {
                text: '❌ الرجاء إدخال رسالة للإذاعة!\n\n💡 مثال: !اذاعة مرحباً بالجميع!'
            });
            return;
        }

        if (!trackedChats || trackedChats.size === 0) {
            await sock.sendMessage(sender, {
                text: '❌ لا توجد محادثات محفوظة للإذاعة.\n\nيتم حفظ المحادثات تلقائياً عند استلام رسائل.'
            });
            return;
        }

        const allChats = Array.from(trackedChats);
        const totalChats = allChats.length;

        // Send start notification
        await sock.sendMessage(sender, {
            text: `📢 * جاري الإذاعة...*\n\n📝 الرسالة: ${message}\n📊 عدد المحادثات: ${totalChats}`
        });

        let successCount = 0;
        let failCount = 0;
        const failedChats = [];

        // Broadcast to all chats
        for (const chatJid of allChats) {
            // Skip the sender to avoid duplicate message
            if (chatJid === sender) continue;

            try {
                await sock.sendMessage(chatJid, {
                    text: `📢 * رسالة إذاعية *\n\n${message}`
                });
                successCount++;

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                failCount++;
                failedChats.push(chatJid);
            }
        }

        // Send completion report
        const report = `
✅ * تم الانتهاء من الإذاعة! *

📊 * الإحصائيات:*
├ ✅ نجاح: ${successCount}
├ ❌ فشل: ${failCount}
└ 📋 الإجمالي: ${totalChats}

📝 الرسالة: ${message}
    `.trim();

        await sock.sendMessage(sender, { text: report });
    }
});

// Chat Stats Command - إحصائيات المحادثات
registerCommand('chatstats', {
    aliases: ['احصائيات', 'إحصائيات', 'stats'],
    description: 'Show tracked chats statistics',
    descriptionAr: 'عرض إحصائيات المحادثات المحفوظة',
    category: 'owner',
    ownerOnly: true,
    async execute(sock, msg, args, sender, pushName, isGroup, trackedChats) {
        if (!trackedChats || trackedChats.size === 0) {
            await sock.sendMessage(sender, {
                text: '📊 لا توجد محادثات محفوظة بعد.'
            });
            return;
        }

        const allChats = Array.from(trackedChats);
        const groups = allChats.filter(c => c.endsWith('@g.us')).length;
        const privates = allChats.length - groups;

        const stats = `
📊 * إحصائيات المحادثات *

├ 📋 الإجمالي: ${allChats.length}
├ 👥 المجموعات: ${groups}
└ 👤 المحادثات الخاصة: ${privates}

💡 استخدم!اذاعة < رسالة > للإرسال للجميع
    `.trim();

        await sock.sendMessage(sender, { text: stats });
    }
});

registerCommand('فهرس', {
    aliases: ['قائمة', 'قائمة السور', 'لستة', 'السور'],
    description: 'show random surah from holy quran',
    descriptionAr: 'ارسال قائمة السور',
    category: 'quran',
    async execute(sock, msg, args, sender) {
        try {
            const list = `1 - الفاتحة	2 - البقرة	3 - آل عمران
4 - النساء	5 - المائدة	6 - الأنعام
7 - الأعراف	8 - الأنفال	9 - التوبة
10 - يونس	11 - هود	12 - يوسف
13 - الرعد	14 - إبراهيم	15 - الحجر
16 - النحل	17 - الإسراء	18 - الكهف
19 - مريم	20 - طه	21 - الأنبياء
22 - الحج	23 - المؤمنون	24 - النور
25 - الفرقان	26 - الشعراء	27 - النمل
28 - القصص	29 - العنكبوت	30 - الروم
31 - لقمان	32 - السجدة	33 - الأحزاب
34 - سبأ	35 - فاطر	36 - يس
37 - الصافات	38 - ص	39 - الزمر
40 - غافر	41 - فصلت	42 - الشورى
43 - الزخرف	44 - الدخان	45 - الجاثية
46 - الأحقاف	47 - محمد	48 - الفتح
49 - الحجرات	50 - ق	51 - الذاريات
52 - الطور	53 - النجم	54 - القمر
55 - الرحمن	56 - الواقعة	57 - الحديد
58 - المجادلة	59 - الحشر	60 - الممتحنة
61 - الصف	62 - الجمعة	63 - المنافقون
64 - التغابن	65 - الطلاق	66 - التحريم
67 - الملك	68 - القلم	69 - الحاقة
70 - المعارج	71 - نوح	72 - الجن
73 - المزمل	74 - المدثر	75 - القيامة
76 - الإنسان	77 - المرسلات	78 - النبأ
79 - النازعات	80 - عبس	81 - التكوير
82 - الانفطار	83 - المطففين	84 - الانشقاق
85 - البروج	86 - الطارق	87 - الأعلى
88 - الغاشية	89 - الفجر	90 - البلد
91 - الشمس	92 - الليل	93 - الضحى
94 - الشرح	95 - التين	96 - العلق
97 - القدر	98 - البينة	99 - الزلزلة
100 - العاديات	101 - القارعة	102 - التكاثر
103 - العصر	104 - الهمزة	105 - الفيل
106 - قريش	107 - الماعون	108 - الكوثر
109 - الكافرون	110 - النصر	111 - المسد
112 - الإخلاص	113 - الفلق	114 - الناس`

            await sock.sendMessage(sender, { text: `🕌 فهرس سور القرآن الكريم 🕋\n💡استخدم الأمر : /سورة + رقم السورة\n\n${list}` });

        } catch (error) {
            logger.error(`Surah fetch failed: ${error.message}`);
            await sock.sendMessage(sender, {
                text: '❌ فشل في جلب قائمة سور القرآن الكريم. حاول مرة أخرى.'
            })
        }
    }
});

registerCommand('surah', {
    aliases: ['سورة', 'سوره', 'سوره', 'سور'],
    description: 'show a full surah from holy quran',
    descriptionAr: 'ارسال سورة كاملة من القرآن الكريم',
    category: 'quran',
    async execute(sock, msg, args, sender) {
        try {
            const surahindex = args[0];

            // Validate input
            if (!surahindex) {
                await sock.sendMessage(sender, {
                    text: 'أمر خاطيء ❌\n\nاستعمل الأمر : /سورة + رقم السورة\n\nلعرض فهرس السور استخدم الأمر : /فهرس 📜'
                });
                return;
            }
            if (!isValidSurahNumber(surahindex)) {
                await sock.sendMessage(sender, {
                    text: '❌ الرجاء إدخال رقم سورة صحيح بين 1 و 114.\n💡 مثال: /سورة 1'
                });
                return;
            }

            await sock.sendMessage(sender, { text: '🕌 جاري جلب سورة من القرآن الكريم...' }, { quoted: msg });

            const surahUrl = `https://quran-api.santrikoding.com/api/surah/${surahindex}`;
            const response = await axios.get(surahUrl);
            const surahData = response.data;

            if (!surahData || !surahData.ayat) {
                throw new Error('Invalid API response');
            }

            const surahName = surahData.nama;
            const ayatCount = surahData.jumlah_ayat;
            let surahType = surahData.tempat_turun;
            surahType = surahType === 'madinah' ? 'مـدنـيـة 🕌' : 'مـكـيـة 🕋';

            let surahText = `🕌 سـورة : ${surahName}\n💡نـوعـهـا : ${surahType}\n📜عـدد آيـاتـهـا : ${ayatCount}\n\n`;

            for (const aya of surahData.ayat) {
                surahText += `(${aya.nomor}) ${aya.ar}\n`;
            }

            surahText += `\n\nتقبل الله منا و منكم ، لا تنسونا من صالح الدعاء 🤍`;

            await sock.sendMessage(sender, {
                text: surahText
            }, { quoted: msg });

        } catch (error) {
            logger.error(`Surah fetch failed: ${error.message}`);
            await sock.sendMessage(sender, {
                text: '❌ فشل في جلب سورة من القرآن الكريم. حاول مرة أخرى.'
            });
        }
    }
})


registerCommand('تلاوة', {
    aliases: ['صوت', 'تلاوه', 'قراءة', 'voice'],
    description: 'show a full surah from holy quran',
    descriptionAr: 'ارسال سورة كاملة بالصوت من القرآن الكريم',
    category: 'quran',
    async execute(sock, msg, args, sender) {
        try {
            const surahindex = args[0];

            // Validate input
            if (!surahindex) {
                await sock.sendMessage(sender, {
                    text: 'أمر خاطيء ❌\n\nاستعمل الأمر : /تلاوة + رقم السورة\n\nلعرض فهرس السور استخدم الأمر : /فهرس 📜'
                });
                return;
            }
            if (!isValidSurahNumber(surahindex)) {
                await sock.sendMessage(sender, {
                    text: '❌ الرجاء إدخال رقم سورة صحيح بين 1 و 114.\n💡 مثال: /سورة 1'
                });
                return;
            }

            // await sock.sendMessage(sender, { text: '🕌 جاري جلب سورة من القرآن الكريم...' }, { quoted: msg });

            const surahUrl = `https://quran-api.santrikoding.com/api/surah/${surahindex}`;
            const response = await axios.get(surahUrl);
            const surahData = response.data;

            if (!surahData || !surahData.ayat) {
                throw new Error('Invalid API response');
            }

            const surahName = surahData.nama;
            const ayatCount = surahData.jumlah_ayat;
            let surahType = surahData.tempat_turun;
            surahType = surahType === 'madinah' ? 'مـدنـيـة 🕌' : 'مـكـيـة 🕋';

            const surahVoice = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surahindex}.mp3`;

            let surahText = `📖 ســورة ${surahName}\n🔸 ${ayatCount} آية`;

            const duaa = `> تقبل الله منا و منكم ، لا تنسونا من صالح الدعاء 🤍`;
            await sock.sendMessage(sender, { text: surahText }, { quoted: msg });
            // Send info text first

            // Download the MP3 as a buffer then send it
            const audioResponse = await axios.get(surahVoice, { responseType: 'arraybuffer' });
            const audioBuffer = Buffer.from(audioResponse.data);

            // Send audio separately (Baileys doesn't support text + audio in one message)
            await sock.sendMessage(sender, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: msg });

            await sock.sendMessage(sender, { text: duaa }, { quoted: msg });

        } catch (error) {
            logger.error(`Surah fetch failed: ${error.message}`);
            await sock.sendMessage(sender, {
                text: '❌ فشل في جلب سورة من القرآن الكريم. حاول مرة أخرى.'
            });
        }
    }
})

registerCommand('صفحة', {
    aliases: ['صفحه', 'رقم', 'ص'],
    description: 'show a full surah from holy quran',
    descriptionAr: 'ارسال صفحة من القرآن الكريم',
    category: 'quran',
    async execute(sock, msg, args, sender) {
        const number = args.join(' ');
        if (isValidPageNumber(number.trim())) {
            const num = parseInt(number.trim(), 10);
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

                await sock.sendMessage(sender, { image: jpegBuffer, caption: `📖رقـم الـصـفـحـة : ${num}\n\nتقبل الله منا و منكم ، لا تنسونا من صالح الدعاء 🤍` }, { quoted: msg });
            } catch (error) {
                logger.error(`Failed to send quran page: ${error.message}`);
            }
        }
    }
})

registerCommand('آية', {
    aliases: ['اية', 'aya', 'آيه', 'ايه'],
    description: 'show random aya from holy quran',
    descriptionAr: 'ارسال آية عشوائية من القرآن الكريم',
    category: 'quran',
    async execute(sock, msg, args, sender) {
        try {
            //await sock.sendMessage(sender, { text: '🕌 جاري جلب آية من القرآن الكريم...' });

            // First, get a random surah (1-114)
            const randAya = Math.floor(Math.random() * 6236) + 1;

            // Get the entire surah to know how many ayas it has
            const ayaurl = `http://api.alquran.cloud/v1/ayah/${randAya}/ar.asad`;
            const ayaResponse = await axios.get(ayaurl);
            const ayaData = ayaResponse.data;

            if (!ayaData.status || ayaData.code !== 200) {
                throw new Error('Invalid API response');
            }
            const message = `*${ayaData.data.text}*\n\n*-${ayaData.data.surah.name} ${ayaData.data.numberInSurah}*`;

            await sock.sendMessage(sender, { text: message }, { quoted: msg });
            logger.success(`Sent random aya to ${sender}`);
        } catch (error) {
            logger.error(`Failed to fetch aya: ${error.message}`);
            await sock.sendMessage(sender, {
                text: '❌ عذراً، حدث خطأ في جلب الآية. حاول مرة أخرى.'
            });
        }
    }
});


registerCommand('حديث', {
    aliases: ['بخاري', 'سنة', 'hadith', 'الحديث'],
    description: 'radnom hadith from sunnah',
    descriptionAr: 'حديث عشوائي من السنة النبوية',
    category: 'quran',
    async execute(sock, msg, args, sender) {
        try {
            const hadithNum = Math.floor(Math.random() * 7000) + 1;
            const hadithUrl = `https://hadithapi.com/public/api/hadiths?apiKey=$2y$10$1XF2Ut3N76romcSPD4gXeuux6rabkGGRLCJxnQeACFTJcP1l0LWy&hadithNumber=${hadithNum}`
            const hadithResponse = await axios.get(hadithUrl);
            const status = hadithResponse.data.status;
            if (status !== 200) {
                throw new Error('Invalid API response');
            }
            const hadithData = hadithResponse.data.hadiths.data[0];
            const hadithNumber = hadithData.hadithNumber;
            const hadithContent = hadithData.hadithArabic;
            let hadithSource = hadithData.bookSlug;
            hadithSource === 'sahih-bukhari' ? hadithSource = 'صحيح البخاري' : hadithSource = 'السنن'


            const text = `🔸 حديث رقم : ${hadithNumber}\n\n${hadithContent}\n\n📗 ${hadithSource}`
            await sock.sendMessage(sender, { text: text }, { quoted: msg });
            logger.success(`Sent random hadith to ${sender}`);

        } catch (error) {
            logger.error(`Failed to fetch hadith: ${error.message}`);
            await sock.sendMessage(sender, {
                text: '❌ عذراً، حدث خطأ في جلب الحديث. حاول مرة أخرى.'
            });
        }

    }
});

/*
registerCommand('', {
    aliases: [],
    description: '',
    descriptionAr: '',
    category: '',
    async execute(sock, msg, args, sender) {
       
    }
});

*/

// ── Quiz Command ──────────────────────────────────────────────────────────────
registerCommand('سؤال', {
    aliases: ['أسئلة', 'مسابقة', 'quiz', 'اختبار', 'فوازير', 'فزورة'],
    description: 'Islamic quiz question',
    descriptionAr: 'سؤال إسلامي عشوائي من قاعدة بيانات الدرر السنية',
    category: 'quran',
    async execute(sock, msg, args, sender, pushName) {
        if (QUIZ_POOL.length === 0) {
            await sock.sendMessage(sender, { text: '❌ لم يتم تحميل قاعدة بيانات الأسئلة.' });
            return;
        }

        // Block double-quiz in same chat
        if (quizSessions.has(sender)) {
            await sock.sendMessage(sender, {
                text: '⏳ يوجد سؤال قيد الانتظار! أجب عليه أولاً بـ *1* أو *2* أو *3*'
            });
            return;
        }

        // Pick a random question
        const question = QUIZ_POOL[Math.floor(Math.random() * QUIZ_POOL.length)];

        // Build the message
        const letters = ['1️⃣', '2️⃣', '3️⃣'];
        let questionText = `🕌 *سؤال إسلامي*\n`;
        questionText += `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n\n`;
        questionText += `❓ *${question.q}*\n\n`;
        question.answers.forEach((a, i) => {
            questionText += `${letters[i]} ${a.answer}\n`;
        });
        questionText += `\n┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n`;
        questionText += `⏱️ لديك *30 ثانية* للإجابة\n`;
        questionText += `💬 أرسل رقم الإجابة: *1* أو *2* أو *3*`;

        await sock.sendMessage(sender, { text: questionText });

        // Set 30s timeout — auto-reveal if no answer
        const timer = setTimeout(async () => {
            if (!quizSessions.has(sender)) return;
            quizSessions.delete(sender);

            const correct = question.answers.find(a => a.t === 1);
            const correctNum = question.answers.findIndex(a => a.t === 1) + 1;
            await sock.sendMessage(sender, {
                text: `⏰ *انتهى الوقت!*\n\n📌 الإجابة الصحيحة كانت رقم *${correctNum}*: ${correct?.answer}`
            });
        }, 30_000);

        // Store session
        quizSessions.set(sender, { question, timer });
        logger.info(`Quiz started for ${pushName} in ${sender}`);
    }
});

export default commands;


