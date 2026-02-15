require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('./config/passport');

const authRoutes = require('./routes/auth');
const devicesRoutes = require('./routes/devices');
const weatherRoutes = require('./routes/weather');
const analyticsRoutes = require('./routes/analytics');
const profileRoutes = require('./routes/profile');
const oauthRoutes = require('./routes/oauth');
const notificationsRoutes = require('./routes/notifications');
const automationRoutes = require('./routes/automation');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Production CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Health check endpoint for deployment monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (required for Passport)
app.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());


// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/devices', devicesRoutes);
app.use('/weather', weatherRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/profile', profileRoutes);
app.use('/oauth', oauthRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/automation', automationRoutes);
app.use('/settings', require('./routes/settings'));
app.use('/music', require('./routes/music')); // New music routes

// Serve uploads for local storage
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/tariffs', require('./routes/tariffs'));


// Корневой маршрут
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

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Внутренняя ошибка сервера'
  });
});

// Обработка 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Маршрут не найден'
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 API доступен по адресу http://localhost:${PORT}`);

  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET не установлен. Используйте .env файл для настройки.');
  }

  if (!process.env.OPENWEATHER_API_KEY) {
    console.warn('⚠️  OPENWEATHER_API_KEY не установлен. Функционал погоды будет недоступен.');
  }

  // Start Automation Scheduler
  const { startScheduler } = require('./services/scheduler');
  startScheduler();
});

module.exports = app;
