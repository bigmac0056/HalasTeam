# Smart Home System - Backend

Backend сервер для системы умного дома на Node.js + Express.

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

3. Заполните переменные окружения в `.env`:
- `PORT` - порт сервера (по умолчанию 3000)
- `JWT_SECRET` - секретный ключ для JWT токенов

## Запуск

```bash
# Обычный запуск
npm start

# Запуск с автоперезагрузкой (требует nodemon)
npm run dev
```

## API Endpoints

### Авторизация

- `POST /auth/register` - Регистрация нового пользователя
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "Иван Иванов"
  }
  ```

- `POST /auth/login` - Вход в систему
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

### Устройства

Все запросы требуют заголовок `Authorization: Bearer {token}`

- `GET /devices` - Получить все устройства пользователя
- `POST /devices/add` - Добавить новое устройство
  ```json
  {
    "name": "Лампа в гостиной",
    "room": "Гостиная",
    "type": "Light",
    "source": "Philips Hue"
  }
  ```
- `POST /devices/toggle` - Переключить статус устройства
  ```json
  {
    "deviceId": "device-id"
  }
  ```

### Погода

- `GET /weather?lat=55.7558&lon=37.6173` - Получить данные о погоде

### Аналитика

- `GET /analytics` - Получить аналитику и рекомендации
- `GET /analytics?lat=55.7558&lon=37.6173` - С рекомендациями на основе погоды

## Структура проекта

```
server/
├── index.js                 # Точка входа сервера
├── state.js                 # Временное хранение данных в памяти
├── routes/                  # Маршруты API
│   ├── auth.js             # Авторизация
│   ├── devices.js          # Управление устройствами
│   ├── weather.js          # Погода
│   └── analytics.js        # Аналитика
├── services/                # Сервисы
│   ├── automationEngine.js # Движок автоматизации
│   ├── weatherService.js   # Сервис погоды
│   └── recommendationService.js # Сервис рекомендаций
└── middleware/              # Middleware
    └── authMiddleware.js   # JWT аутентификация
```

## Особенности

- JWT аутентификация
- Хранение данных в памяти (для разработки)
- Интеграция с Open-Meteo API (без API ключа)
- Система рекомендаций на основе погоды и энергопотребления
- Движок автоматизации для умного дома
