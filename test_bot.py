#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для проверки конфигурации бота
"""

import os
import sys

def test_env():
    """Проверка переменных окружения"""
    print("🔍 Проверка переменных окружения...")
    
    # Пробуем загрузить .env
    try:
        from dotenv import load_dotenv
        load_dotenv()
        print("✅ Модуль python-dotenv установлен")
    except ImportError:
        print("⚠️  Модуль python-dotenv не установлен")
        print("   Установите: pip install python-dotenv")
    
    # Проверяем BOT_TOKEN
    bot_token = os.getenv('BOT_TOKEN')
    if bot_token:
        if bot_token.startswith('your_') or bot_token == 'your_bot_token_here':
            print("❌ BOT_TOKEN не настроен!")
            print("   Получите токен у @BotFather и добавьте в .env")
            return False
        else:
            # Скрываем токен
            masked_token = bot_token[:10] + "..." + bot_token[-4:]
            print(f"✅ BOT_TOKEN найден: {masked_token}")
    else:
        print("❌ BOT_TOKEN не найден в .env")
        return False
    
    # Проверяем WEBAPP_URL
    webapp_url = os.getenv('WEBAPP_URL')
    if webapp_url:
        if webapp_url.startswith('https://your-'):
            print("⚠️  WEBAPP_URL использует дефолтное значение")
            print("   Обновите после деплоя на Render")
        else:
            print(f"✅ WEBAPP_URL найден: {webapp_url}")
    else:
        print("⚠️  WEBAPP_URL не найден (использует дефолт)")
    
    return True


def test_dependencies():
    """Проверка установленных зависимостей"""
    print("\n📦 Проверка зависимостей...")
    
    required = [
        ('telegram', 'python-telegram-bot'),
        ('dotenv', 'python-dotenv'),
    ]
    
    all_installed = True
    for module, package in required:
        try:
            __import__(module)
            print(f"✅ {package} установлен")
        except ImportError:
            print(f"❌ {package} не установлен")
            print(f"   Установите: pip install {package}")
            all_installed = False
    
    return all_installed


def test_files():
    """Проверка наличия необходимых файлов"""
    print("\n📁 Проверка файлов...")
    
    required_files = [
        ('bot.py', True),
        ('index.html', True),
        ('game.js', True),
        ('styles.css', True),
        ('.env', True),
        ('images/start.jpg', False),
    ]
    
    all_exist = True
    for filepath, required in required_files:
        if os.path.exists(filepath):
            print(f"✅ {filepath}")
        else:
            if required:
                print(f"❌ {filepath} не найден (обязателен)")
                all_exist = False
            else:
                print(f"⚠️  {filepath} не найден (опционально)")
    
    return all_exist


def test_bot_connection():
    """Проверка подключения к Telegram API"""
    print("\n🌐 Проверка подключения к Telegram...")
    
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        from telegram import Bot
        import asyncio
        
        bot_token = os.getenv('BOT_TOKEN')
        if not bot_token or bot_token.startswith('your_'):
            print("⚠️  Пропуск: токен не настроен")
            return False
        
        async def check():
            bot = Bot(token=bot_token)
            me = await bot.get_me()
            return me
        
        me = asyncio.run(check())
        print(f"✅ Подключение успешно!")
        print(f"   Бот: @{me.username}")
        print(f"   Имя: {me.first_name}")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")
        return False


def main():
    """Главная функция"""
    print("=" * 50)
    print("🥷 Тестирование бота 'Офисный ниндзя'")
    print("=" * 50)
    
    results = []
    
    # Проверки
    results.append(("Переменные окружения", test_env()))
    results.append(("Зависимости", test_dependencies()))
    results.append(("Файлы", test_files()))
    results.append(("Подключение к Telegram", test_bot_connection()))
    
    # Итоги
    print("\n" + "=" * 50)
    print("📊 Результаты тестирования:")
    print("=" * 50)
    
    for name, result in results:
        status = "✅ Пройдено" if result else "❌ Не пройдено"
        print(f"{name}: {status}")
    
    all_passed = all(result for _, result in results)
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 Все тесты пройдены! Бот готов к запуску.")
        print("   Запустите: python bot.py")
    else:
        print("⚠️  Некоторые проверки не пройдены.")
        print("   Исправьте ошибки и запустите тест снова.")
    print("=" * 50)
    
    return 0 if all_passed else 1


if __name__ == '__main__':
    sys.exit(main())

