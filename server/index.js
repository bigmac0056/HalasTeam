const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const devicesRoutes = require('./routes/devices');
const weatherRoutes = require('./routes/weather');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/auth', authRoutes);
app.use('/devices', devicesRoutes);
app.use('/weather', weatherRoutes);
app.use('/analytics', analyticsRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Smart Home System API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /auth/register',
        login: 'POST /auth/login'
      },
      devices: {
        getAll: 'GET /devices',
        add: 'POST /devices/add',
        toggle: 'POST /devices/toggle'
      },
      weather: {
        get: 'GET /weather?lat={latitude}&lon={longitude}'
      },
      analytics: {
        get: 'GET /analytics?lat={latitude}&lon={longitude}'
      }
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Внутренняя ошибка сервера'
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Маршрут не найден'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 API доступен по адресу http://localhost:${PORT}`);
  
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET не установлен. Используйте .env файл для настройки.');
  }
});

module.exports = app;
