import os
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters
from playwright.async_api import async_playwright

# Your bot token
TELEGRAM_BOT_TOKEN = '7787556743:AAELxUJ_LnZjql64mw9yWzzWETiPWDmYn_A'

# Users dictionary to store user preferences
users = {}

# Supported languages
languages = [
    {'code': 'en', 'name': 'English'},
    {'code': 'es', 'name': 'Spanish'},
    {'code': 'fr', 'name': 'French'},
    {'code': 'de', 'name': 'German'},
    {'code': 'it', 'name': 'Italian'},
    {'code': 'ru', 'name': 'Russian'},
    {'code': 'zh', 'name': 'Chinese'},
    {'code': 'ja', 'name': 'Japanese'},
    {'code': 'fa', 'name': 'Persian'},
    {'code': 'ar', 'name': 'Arabic'}
]

# Function to generate the Google Translate URL
def generate_google_translate_url(from_lang, to_lang, text):
    base_url = 'https://translate.google.com/?'
    lang_params = f'sl={from_lang}&tl={to_lang}'
    encoded_text = text.replace(' ', '%20')
    full_url = f'{base_url}{lang_params}&text={encoded_text}&op=translate'
    return full_url

# Async function to translate text via browser
async def translate_text_via_browser(from_lang, to_lang, text):
    translate_url = generate_google_translate_url(from_lang, to_lang, text)
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(translate_url)
            await page.wait_for_selector('.result-shield-container')  # Adjust this according to the actual page
            translated_text = await page.inner_text('.result-shield-container')  # Adjust the selector
            await browser.close()
            return translated_text
    except Exception as e:
        print(f"Error during translation: {e}")
        return "Translation failed."

# Function to handle the /start command
async def start(update: Update, context):
    chat_id = update.message.chat_id
    users[chat_id] = {}  # Initialize user data
    await context.bot.send_message(chat_id=chat_id, text="Welcome! Please send me a text to translate.")

# Function to handle user messages
async def handle_message(update: Update, context):
    chat_id = update.message.chat_id
    text = update.message.text
    
    # Default languages for testing; adjust as needed
    from_lang = 'en'
    to_lang = 'es'
    
    translated_text = await translate_text_via_browser(from_lang, to_lang, text)
    await context.bot.send_message(chat_id=chat_id, text=f"Translated Text: {translated_text}")

# Main function to start the bot
async def main():
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Command handler for the /start command
    application.add_handler(CommandHandler("start", start))

    # Message handler for user input
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Initialize the application
    await application.initialize()

    # Start polling and block until the bot is stopped
    await application.start()
    print("Bot started...")

    # Instead of waiting for stop, we manually use idle to keep the bot running
    await application.updater.start_polling()
    await application.stop()

# Run the bot
if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
