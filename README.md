# 🏠 SmartSphere - Smart Home System

A modern fullstack Smart Home System for managing IoT devices, monitoring weather, tracking energy consumption, and receiving intelligent automation recommendations.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![React](https://img.shields.io/badge/React-19.2.0-61dafb.svg)
![Node](https://img.shields.io/badge/Node.js-Express-green.svg)

## ✨ Features

- 🔐 **User Authentication** - Secure JWT-based authentication
- 🏡 **Device Management** - Control multiple IoT devices across different rooms
- 🌤️ **Weather Integration** - Real-time weather data from Open-Meteo API
- 🎵 **Music Module** - Library management, drag & drop uploads, playlists, and seamless playback.
- 📊 **Energy Analytics** - Track and analyze energy consumption patterns
- 🤖 **Smart Automation** - Rule-based automation engine with intelligent recommendations
- 💡 **Multi-Device Support** - Lights, thermostats, security systems, and more

## 🏗️ Architecture

```
SmartSphere/
├── client/          # React + Vite Frontend
└── server/          # Node.js + Express Backend
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/bigmac0056/HalasTeam.git
cd SmartSphere
```

2. **Setup Server**
```bash
cd server
npm install
cp .env.example .env  # Create .env and add JWT_SECRET
npm run dev
```

3. **Setup Client** (in a new terminal)
```bash
cd client
npm install
npm run dev
```

4. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 🔧 Technology Stack

### Frontend
- **React** 19.2.0 - UI library
- **Vite** 7.3.1 - Build tool
- **React Router** 7.13.0 - Routing
- **Axios** 1.13.5 - HTTP client

### Backend
- **Node.js** + **Express** 4.18.2 - Server framework
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Open-Meteo API** - Weather data

## 📡 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login

### Devices (Protected)
- `GET /devices` - Get all user devices
- `POST /devices/add` - Add new device
- `POST /devices/toggle` - Toggle device status

### Weather
- `GET /weather?lat={lat}&lon={lon}` - Get weather data

### Analytics
- `GET /analytics` - Get analytics and recommendations

## 🔐 Environment Variables

Create a `.env` file in the `server` directory:

```env
PORT=3000
JWT_SECRET=your-secret-key-here
```

## 🛠️ Development

### Client Development
```bash
cd client
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
```

### Server Development
```bash
cd server
npm run dev      # Start with nodemon (auto-reload)
npm start        # Start production server
```

## ⚠️ Important Notes

- Current implementation uses **in-memory storage**
- Data will be lost on server restart
- For production, implement persistent database (MongoDB, PostgreSQL, etc.)

## 🔮 Future Improvements

- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] Real IoT device integration (MQTT)
- [ ] WebSocket support for real-time updates
- [ ] Push notifications
- [ ] Unit and integration tests
- [ ] Docker containerization
- [ ] CI/CD pipeline

## 📄 License

ISC License

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- Weather data provided by [Open-Meteo](https://open-meteo.com/)
- Built with modern web technologies

---

Made with ❤️ by **HalasTeam**
