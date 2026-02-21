# 🌙 بوت القرآن الكريم — Quran WhatsApp Bot

> بوت واتساب مجاني مفتوح المصدر لخدمة القرآن الكريم والسنة النبوية  
> A free, open-source WhatsApp bot dedicated to serving the Holy Quran and Sunnah.

Built with the [Baileys](https://github.com/WhiskeySockets/Baileys) library for Node.js.

---

## ✨ Features / المميزات

### � Holy Quran / القرآن الكريم
| Command | Arabic | Description |
|---------|--------|-------------|
| `/فهرس` | فهرس السور | List all 114 surahs with their numbers |
| `/سورة <number>` | سورة | Send a complete surah as text (e.g. `/سورة 18`) |
| `/تلاوة <number>` | تلاوة | Send a full surah audio recitation — Mishary Alafasy (e.g. `/تلاوة 36`) |
| `/صفحة <number>` | صفحة | Send a Quran page as a high-quality image (pages 1–604) |
| `/آية` | آية | Send a random Quran verse |

### 📚 Sunnah / السنة النبوية
| Command | Arabic | Description |
|---------|--------|-------------|
| `/حديث` | حديث | Send a random hadith from Sahih Bukhari / Sunnah collections |

### � Islamic Quiz / الأسئلة الإسلامية
| Command | Arabic | Description |
|---------|--------|-------------|
| `/سؤال` | سؤال | Random Islamic MCQ with 3 choices & a 30-second timer |

### ⚙️ General / عام
| Command | Description |
|---------|-------------|
| `/help` / `/مساعدة` | Show the full command menu |
| `/info` / `/معلومات` | Show bot info (uptime, memory, command count) |
| `/time` / `/وقت` | Display current time |
| `/ping` / `/اتصال` | Check bot connection & latency |
| `/sticker` / `/ملصق` | Convert any image or video to a WhatsApp sticker |
| `/echo` / `/صدى` | Repeat back any text |

### 🤲 Auto Duaa / دعاء تلقائي
The bot automatically sends Islamic supplications (أدعية) periodically between messages.

---

## 📋 Requirements

- **Node.js** v18 or higher
- **npm**

---

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Trama-007/quran-bot.git
   cd quran-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the bot**
   ```bash
   npm start
   ```

4. **Scan the QR code** that appears in the terminal:
   - Open WhatsApp on your phone
   - Go to **Settings → Linked Devices → Link a Device**
   - Scan the QR code shown in the terminal

---

## ⚙️ Configuration

Edit `config.js` to customize the bot:

```js
export default {
    bot: {
        name: 'بوت القرآن',   // Bot display name
        prefix: ['/', '!'],   // Command prefixes
    },
    sticker: {
        packName: 'Quran Bot',
        author: 'Trama-007',
    }
}
```

---

## 📁 Project Structure

```
quran-bot/
├── index.js              # Main entry point & message handler
├── config.js             # Bot configuration
├── package.json          # Dependencies & scripts
├── README.md             # This file
├── .gitignore            # Git ignore rules
│
├── commands/
│   └── index.js          # All command definitions & registry
│
├── data/
│   ├── quiz.json         # Islamic quiz question database (Durar Al-Sunniyya)
│   └── chats.json        # Tracked chats store
│
└── utils/
    ├── helpers.js        # Utility functions (uptime formatter, etc.)
    ├── logger.js         # Custom logger
    ├── chatStore.js      # Persistent chat tracking
    ├── quizSessions.js   # Active quiz session manager
    └── seenUsers.js      # Seen users tracker
```

## 🔒 Security Notes

- **Never share or commit your `auth_info/` folder** — it holds your WhatsApp session credentials.
- The `auth_info/` directory is already listed in `.gitignore`.
- The bot runs under your WhatsApp account — use broadcast features responsibly.

---

## � License

MIT License — free to use, modify, and distribute.

---

## 👨‍💻 Author

Made with 🤍 for the sake of Allah  
**GitHub:** [github.com/Trama-007](https://github.com/Trama-007)

