#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Telegram бот "Офисный ниндзя"
Интеграция с мини-приложением для игры
"""

import os
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

# Загружаем переменные окружения из .env файла
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠️  python-dotenv не установлен. Используются системные переменные окружения.")

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Получаем токен и URL мини-приложения из переменных окружения
BOT_TOKEN = os.getenv('BOT_TOKEN')
WEBAPP_URL = os.getenv('WEBAPP_URL', 'https://your-app-name.onrender.com')

# Проверяем наличие токена
if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN не установлен! Создайте файл .env с токеном бота.")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Обработчик команды /start
    Показывает приветственное сообщение и кнопку для запуска мини-приложения
    """
    user = update.effective_user
    
    # Текст приветствия
    welcome_text = (
        "Как же я ненавижу встречи 🤢\n\n"
        "Чувствую, что ты тоже. Избавься себя от бесполезной болтовни, "
        "уничтожь календарь со встречами и вспомни: жизнь есть и вне работы."
    )
    
    # Создаем кнопку для запуска мини-приложения
    keyboard = [
        [InlineKeyboardButton("🎮 Играть", web_app=WebAppInfo(url=WEBAPP_URL))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    # Отправляем сообщение с фото (если есть) или просто текст
    photo_path = 'images/start1.jpg'
    
    if os.path.exists(photo_path):
        # Отправляем с картинкой
        with open(photo_path, 'rb') as photo:
            await update.message.reply_photo(
                photo=photo,
                caption=welcome_text,
                reply_markup=reply_markup,
                parse_mode='HTML'
            )
    else:
        # Отправляем просто текст, если картинки нет
        await update.message.reply_text(
            welcome_text,
            reply_markup=reply_markup,
            parse_mode='HTML'
        )
    
    logger.info(f"Пользователь {user.username} ({user.id}) запустил бота")


async def who(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Обработчик команды /who
    Показывает информацию об авторе
    """
    await update.message.reply_text(
        "ceo of everything @jypixob",
        parse_mode='HTML'
    )
    logger.info(f"Пользователь запросил /who")


async def fuck(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Обработчик команды /fuck
    Показывает анти-корпоративное сообщение
    """
    await update.message.reply_text(
        "fuck corporations 🖕",
        parse_mode='HTML'
    )
    logger.info(f"Пользователь запросил /fuck")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Обработчик обычных сообщений (не команд)
    Предлагает начать игру
    """
    keyboard = [
        [InlineKeyboardButton("🎮 Играть", web_app=WebAppInfo(url=WEBAPP_URL))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Нажми на кнопку, чтобы начать игру! 🥷",
        reply_markup=reply_markup
    )


async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Обработчик ошибок
    """
    logger.error(f"Произошла ошибка: {context.error}")


def main() -> None:
    """
    Основная функция для запуска бота
    """
    # Создаем приложение
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Регистрируем обработчики команд
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("who", who))
    application.add_handler(CommandHandler("fuck", fuck))
    
    # Обработчик обычных сообщений
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    
    # Обработчик ошибок
    application.add_error_handler(error_handler)
    
    # Запускаем бота
    logger.info("🚀 Бот запущен!")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()

