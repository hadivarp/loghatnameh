require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const users = {};
const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'fa', name: 'Persian' },
    { code: 'ar', name: 'Arabic' },
    // Add more languages
];

// Main Menu
function createMainMenu() {
    return {
        reply_markup: {
            keyboard: [
                ['🔤 Translate'],
                ['⚙️ Settings', '❓ FAQ']
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
}

// Settings Menu
function createSettingsMenu() {
    return {
        reply_markup: {
            keyboard: [
                ['📜 List of Commands'],
                ['🔙 Back to Main Menu']
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
}

// Function to create available commands menu
function createCommandsMenu() {
    return {
        reply_markup: {
            keyboard: [
                ['/donate'],
                ['/buy_me_coffee'],
                ['/support_message'],
                ['/add_to_your_group'],
                ['🔙 Back to Settings']
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
}

// Language Menu
function createLanguageMenu(isSource = true) {
    const keyboard = languages.map(lang => [lang.name]);
    keyboard.push(['🔍 Search']);
    keyboard.push(['🔙 Back to Main Menu']);

    return {
        reply_markup: {
            keyboard: keyboard,
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
}

// Input Menu
function createInputMenu() {
    return {
        reply_markup: {
            keyboard: [
                ['🔙 Back to Main Menu']
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    };
}

// Respond to /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!users[chatId]) {
        users[chatId] = {}; // Ensure user state is initialized
    }

    if (!users[chatId].started) {
        bot.sendMessage(chatId, 'Please choose an option:', createMainMenu());
        users[chatId].started = true; // Flag the user as having started the bot
    }
});

// Respond to user messages
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!users[chatId]) {
        users[chatId] = {};
    }

    switch (text) {
        case '🔤 Translate':
            users[chatId].step = 'select_source';
            bot.sendMessage(chatId, 'Please select the source language:', createLanguageMenu(true));
            break;
        case '⚙️ Settings':
            bot.sendMessage(chatId, 'Settings Menu:', createSettingsMenu());
            break;
        case '📜 List of Commands':
            bot.sendMessage(chatId, 'Available commands:', createCommandsMenu());
            break;
        case '/donate':
            bot.sendMessage(chatId, 'Thank you for considering a donation! You can support us using this link: [Donation Link]');
            break;
        case '/buy_me_coffee':
            bot.sendMessage(chatId, 'Buy me a coffee ☕️ using this link: [Coffee Link]');
            break;
        case '/support_message':
            bot.sendMessage(chatId, 'Send us a support message ❤️! We value your feedback. You can send your message here: [Support Link](https://t.me/hadivarp)', {
                parse_mode: 'Markdown'
            });
            break;
        case '/add_to_your_group':
            bot.sendMessage(chatId, 'Add the bot to your group using this link: [Group Link]');
            break;
        case '🔍 Search':
            users[chatId].step = 'search_language';
            bot.sendMessage(chatId, 'Please enter a language name to search:');
            break;
        case '🔙 Back to Main Menu':
            users[chatId].step = null;
            bot.sendMessage(chatId, 'Main Menu:', createMainMenu());
            break;
        case '🔙 Back to Settings':
            bot.sendMessage(chatId, 'Settings Menu:', createSettingsMenu());
            break;
        default:
            if (users[chatId].step === 'search_language') {
                const matchedLanguages = languages.filter(lang =>
                    lang.name.toLowerCase().includes(text.toLowerCase())
                );
                if (matchedLanguages.length > 0) {
                    const keyboard = matchedLanguages.map(lang => [lang.name]);
                    keyboard.push(['🔙 Back to Language List']);
                    bot.sendMessage(chatId, 'Here are the matching languages:', {
                        reply_markup: {
                            keyboard: keyboard,
                            resize_keyboard: true,
                            one_time_keyboard: false
                        }
                    });
                } else {
                    bot.sendMessage(chatId, 'No matching languages found. Please try again or go back to the language list.', createLanguageMenu(users[chatId].selectingSource));
                }
            } else if (users[chatId].step === 'select_source' || users[chatId].step === 'select_target') {
                const selectedLang = languages.find(lang => lang.name === text);
                if (selectedLang) {
                    if (users[chatId].step === 'select_source') {
                        users[chatId].fromLang = selectedLang.code;
                        users[chatId].step = 'select_target';
                        bot.sendMessage(chatId, 'Great! Now select the target language:', createLanguageMenu(false));
                    } else {
                        users[chatId].toLang = selectedLang.code;
                        users[chatId].step = 'input_text';
                        const sourceLang = languages.find(l => l.code === users[chatId].fromLang).name;
                        const targetLang = languages.find(l => l.code === users[chatId].toLang).name;
                        bot.sendMessage(chatId, `You've selected to translate from ${sourceLang} to ${targetLang}. Please enter the text you want to translate:`, createInputMenu());
                    }
                } else {
                    bot.sendMessage(chatId, 'Please select a valid language from the list.', createLanguageMenu(users[chatId].step === 'select_source'));
                }
            } else if (users[chatId].step === 'input_text') {
                translateText(text, users[chatId].fromLang, users[chatId].toLang)
                    .then(translatedText => {
                        const sourceLang = languages.find(l => l.code === users[chatId].fromLang).name;
                        const targetLang = languages.find(l => l.code === users[chatId].toLang).name;
                        const response = `🌏 Translated from: ${sourceLang}\n🌏 Translated to: ${targetLang}\n🪄 Translated Text is:\n${translatedText}\nClick on the text for Copy 👆`;
                        bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
                        users[chatId].step = 'select_source';
                        bot.sendMessage(chatId, 'Do you want to translate another text?', createLanguageMenu(true));
                    })
                    .catch(error => {
                        console.error('Translation error:', error);
                        bot.sendMessage(chatId, 'An error occurred during translation. Please try again.');
                    });
            } else {
                bot.sendMessage(chatId, 'Please choose an option:', createMainMenu());
            }
    }
});
