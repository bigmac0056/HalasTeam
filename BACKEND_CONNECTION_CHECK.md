# 🔌 Проверка подключения к задеплоенному бэкенду

**URL бэкенда:** https://halasteam.onrender.com

---

## ✅ Статус API

Согласно проверке, ваш бэкенд успешно задеплоен и отвечает:

```json
{
  "message": "Smart Home System API",
  "version": "1.0.0",
  "endpoints": {
    "auth": {
      "register": "POST /auth/register",
      "login": "POST /auth/login"
    },
    "devices": {
      "getAll": "GET /devices",
      "add": "POST /devices/add",
      "toggle": "POST /devices/toggle"
    },
    "weather": {
      "get": "GET /weather?lat={latitude}&lon={longitude}"
    },
    "analytics": {
      "get": "GET /analytics?lat={latitude}&lon={longitude}"
    }
  }
}
```

---

## 🔧 Настройка клиента для подключения к задеплоенному бэкенду

### 1. Создайте файл `.env` в папке `client/`

```bash
cd client
cp .env.example .env
```

### 2. Установите правильный URL в `.env`

```env
VITE_API_BASE_URL=https://halasteam.onrender.com
```

**Важно:** 
- Не добавляйте слэш в конце URL
- Используйте `https://` (не `http://`)
- После изменения `.env` перезапустите dev сервер

### 3. Перезапустите клиент

```bash
# Остановите текущий процесс (Ctrl+C)
# Затем запустите снова
npm run dev
```

---

## 🔒 Настройка CORS на сервере

Ваш сервер использует переменную окружения `ALLOWED_ORIGINS` для настройки CORS.

### Для Render.com:

1. Перейдите в настройки вашего сервиса на Render.com
2. Добавьте переменную окружения `ALLOWED_ORIGINS`
3. Укажите домены вашего фронтенда (через запятую):

```
ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:5173,http://localhost:5174
```

**Пример для разных окружений:**
```env
# Production
ALLOWED_ORIGINS=https://your-frontend-domain.com

# Development (если хотите тестировать локально)
ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:5173,http://localhost:5174
```

### Текущая конфигурация CORS:

```javascript
// server/index.js
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];
```

**⚠️ Важно:** Если `ALLOWED_ORIGINS` не установлена, сервер разрешает только локальные домены!

---

## 🧪 Тестирование подключения

### 1. Проверка Health Check

```bash
curl https://halasteam.onrender.com/health
```

Ожидаемый ответ:
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

### 2. Проверка корневого эндпоинта

```bash
curl https://halasteam.onrender.com/
```

### 3. Тест из браузера (Console)

Откройте консоль браузера на вашем фронтенде и выполните:

```javascript
// Проверка базового URL
console.log('API URL:', import.meta.env.VITE_API_BASE_URL);

// Тест запроса
fetch('https://halasteam.onrender.com/health')
  .then(res => res.json())
  .then(data => console.log('Health check:', data))
  .catch(err => console.error('Error:', err));
```

### 4. Проверка CORS

Если видите ошибку типа:
```
Access to fetch at 'https://halasteam.onrender.com/...' from origin 'http://localhost:5173' has been blocked by CORS policy
```

Это значит, что нужно добавить ваш домен в `ALLOWED_ORIGINS` на Render.com.

---

## 📋 Чеклист настройки

- [ ] Создан файл `client/.env` с `VITE_API_BASE_URL=https://halasteam.onrender.com`
- [ ] Перезапущен dev сервер клиента
- [ ] Настроена переменная `ALLOWED_ORIGINS` на Render.com
- [ ] Добавлен домен фронтенда в `ALLOWED_ORIGINS` (если фронтенд тоже задеплоен)
- [ ] Проверен health check эндпоинт
- [ ] Протестирована регистрация/вход
- [ ] Протестированы запросы к устройствам

---

## 🐛 Решение проблем

### Проблема: CORS ошибка

**Решение:**
1. Проверьте, что `ALLOWED_ORIGINS` установлена на Render.com
2. Убедитесь, что домен фронтенда добавлен в список
3. Перезапустите сервис на Render.com после изменения переменных

### Проблема: 404 Not Found

**Решение:**
1. Проверьте, что URL правильный (без слэша в конце)
2. Убедитесь, что эндпоинт существует в `server/routes/`

### Проблема: 401 Unauthorized

**Решение:**
1. Проверьте, что токен сохраняется в `localStorage`
2. Проверьте, что токен отправляется в заголовке `Authorization: Bearer <token>`
3. Убедитесь, что `JWT_SECRET` установлен на Render.com

### Проблема: Запросы идут на localhost вместо задеплоенного сервера

**Решение:**
1. Проверьте, что `.env` файл создан в папке `client/`
2. Убедитесь, что переменная называется `VITE_API_BASE_URL` (с префиксом `VITE_`)
3. Перезапустите dev сервер после создания/изменения `.env`

---

## 🔍 Проверка конфигурации API клиента

Текущая конфигурация в `client/src/api/api.js`:

```javascript
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});
```

**✅ Это правильно!** Клиент будет использовать:
- `VITE_API_BASE_URL` из `.env` файла, если он установлен
- `http://localhost:3000` как fallback для локальной разработки

---

## 📝 Дополнительные настройки для Render.com

### Переменные окружения на Render.com:

Убедитесь, что установлены следующие переменные:

```env
PORT=10000  # или другой порт, который использует Render
JWT_SECRET=your-secret-key-here
DATABASE_URL=postgresql://...
ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:5173
OPENWEATHER_API_KEY=optional
GOOGLE_CLIENT_ID=optional
GOOGLE_CLIENT_SECRET=optional
```

### Настройка базы данных:

1. Убедитесь, что PostgreSQL база данных создана на Render.com
2. Скопируйте `DATABASE_URL` в переменные окружения
3. Выполните миграции Prisma:

```bash
# Локально (если есть доступ к БД)
cd server
npm run prisma:generate
npm run prisma:push

# Или через Render.com Shell
```

---

## ✅ Итоговая проверка

После настройки проверьте:

1. ✅ Health check работает: `https://halasteam.onrender.com/health`
2. ✅ API отвечает: `https://halasteam.onrender.com/`
3. ✅ Клиент подключается (проверьте Network tab в DevTools)
4. ✅ Регистрация/вход работают
5. ✅ Запросы к устройствам работают
6. ✅ Нет CORS ошибок в консоли

---

**Статус:** ✅ Бэкенд задеплоен и работает  
**Следующий шаг:** Настройте `.env` файл в клиенте и проверьте подключение
