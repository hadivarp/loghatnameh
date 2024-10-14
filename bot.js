require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');

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

// Language Menu
function createLanguageMenu(isSource = true) {
    const keyboard = languages.map(lang => [lang.name]);
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

// Function to get translation using Google Translate
async function getGoogleTranslation(text, fromLang = 'en', toLang = 'fr') {
    try {
        const url = `https://translate.google.com/m?hl=${toLang}&sl=${fromLang}&q=${encodeURIComponent(text)}&ie=UTF-8&prev=_m`;

        const response = await axios.get(url);

        const $ = cheerio.load(response.data);

        const translation = $('.result-container').text();

        if (translation) {
            return translation;
        } else {
            throw new Error('Translation not found');
        }
    } catch (error) {
        console.error('Error getting translation:', error);
        throw error;
    }
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
bot.on('message', async (msg) => {
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
        case '🔙 Back to Main Menu':
            users[chatId].step = null;
            bot.sendMessage(chatId, 'Main Menu:', createMainMenu());
            break;
        default:
            if (users[chatId].step === 'select_source') {
                const selectedLang = languages.find(lang => lang.name === text);
                if (selectedLang) {
                    users[chatId].fromLang = selectedLang.code;
                    users[chatId].step = 'select_target';
                    bot.sendMessage(chatId, 'Great! Now select the target language:', createLanguageMenu(false));
                } else {
                    bot.sendMessage(chatId, 'Please select a valid language.', createLanguageMenu(true));
                }
            } else if (users[chatId].step === 'select_target') {
                const selectedLang = languages.find(lang => lang.name === text);
                if (selectedLang) {
                    users[chatId].toLang = selectedLang.code;
                    users[chatId].step = 'input_text';
                    const sourceLang = languages.find(l => l.code === users[chatId].fromLang).name;
                    const targetLang = languages.find(l => l.code === users[chatId].toLang).name;
                    bot.sendMessage(chatId, `You've selected to translate from ${sourceLang} to ${targetLang}. Please enter the text you want to translate:`, createInputMenu());
                } else {
                    bot.sendMessage(chatId, 'Please select a valid language.', createLanguageMenu(false));
                }
            } else if (users[chatId].step === 'input_text') {
                try {
                    const translatedText = await getGoogleTranslation(text, users[chatId].fromLang, users[chatId].toLang);
                    const sourceLang = languages.find(l => l.code === users[chatId].fromLang).name;
                    const targetLang = languages.find(l => l.code === users[chatId].toLang).name;
                    const response = `🌏 Translated from: ${sourceLang}\n🌏 Translated to: ${targetLang}\n\nTranslation: ${translatedText}`;
                    bot.sendMessage(chatId, response);
                    users[chatId].step = 'select_source';
                    bot.sendMessage(chatId, 'Do you want to translate another text?', createLanguageMenu(true));
                } catch (error) {
                    bot.sendMessage(chatId, 'An error occurred during translation. Please try again.');
                }
            } else {
                bot.sendMessage(chatId, 'Please choose an option:', createMainMenu());
            }
    }
});
