require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');

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

// Puppeteer translation function
async function puppeteerTranslate(fromLang, toLang, text) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const translateUrl = `https://translate.google.com/?sl=${fromLang}&tl=${toLang}&text=${encodeURIComponent(text)}&op=translate`;

    console.log('Opening URL:', translateUrl);
    await page.goto(translateUrl);

    // Wait for both source and result containers to appear
    await page.waitForSelector('.D5aOJc');
    await page.waitForSelector('.result-container');

    // Extract the source and translated text
    const [sourceText, translatedText] = await page.evaluate(() => {
        const source = document.querySelector('.D5aOJc').innerText;
        const result = document.querySelector('.result-container').innerText;
        return [source, result];
    });

    console.log('Source Text:', sourceText);
    console.log('Translated Text:', translatedText);

    await browser.close();
    return translatedText;
}

// Modified translateText function using Puppeteer
async function translateText(text, fromLang, toLang) {
    const fullURL = `https://translate.google.com/?sl=${fromLang}&tl=${toLang}&text=${encodeURIComponent(text)}&op=translate`;
    console.log('Generated Google Translate URL:', fullURL);

    try {
        const translatedText = await puppeteerTranslate(fromLang, toLang, text);
        console.log('Translated Text:', translatedText);
        return translatedText;
    } catch (error) {
        console.error('Error fetching translation with Puppeteer:', error);
        throw new Error('Failed to fetch translation');
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
                translateText(text, users[chatId].fromLang, users[chatId].toLang)
                    .then(result => {
                        const sourceLang = languages.find(l => l.code === users[chatId].fromLang).name;
                        const targetLang = languages.find(l => l.code === users[chatId].toLang).name;
                        const response = `🌏 Translated from: ${sourceLang}\n🌏 Translated to: ${targetLang}\n\n${result}`;
                        bot.sendMessage(chatId, response);
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
