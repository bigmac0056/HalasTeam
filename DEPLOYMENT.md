# Deployment Guide

This project is ready for deployment on Vercel (Frontend) and Render/Railway (Backend).

## 1. Backend Deployment (Render/Railway)

### Prerequisites
- GitHub Repository connected.
- **PostgreSQL Database** (Neon.tech, Supabase, or Render PostgreSQL).
- Environment Variables ready.

### Environment Variables
Set these in your hosting dashboard:
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgres://user:password@host:port/dbname?sslmode=require
JWT_SECRET=your-production-secret-key-min-32-chars
ALLOWED_ORIGINS=https://your-frontend-domain.com
# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://your-backend-domain.com/oauth/google/callback
FRONTEND_URL=https://your-frontend-domain.com
```

### Build Command
```bash
npm install
npx prisma generate
```

### Start Command
```bash
# This will push the schema to the DB on start (good for MVP/Indie hackers)
npx prisma db push && node index.js
```
*Note: For larger teams, use `npx prisma migrate deploy` instead of `db push`.*

### Health Check
Configure health check path to: `/health`

---

## 2. Frontend Deployment (Vercel)

### Environment Variables
Set these in Vercel Project Settings:
```env
VITE_API_BASE_URL=https://your-backend-domain.com
```

### Build Command
```bash
npm run build
```

### Output Directory
`dist`

---

## 3. Google OAuth Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project -> **APIs & Services** -> **Credentials**.
3. Edit your OAuth 2.0 Client ID.
4. **Authorized JavaScript origins**:
   - `https://your-frontend-domain.com`
   - `http://localhost:5173` (for local dev)
5. **Authorized redirect URIs**:
   - `https://your-backend-domain.com/oauth/google/callback`
   - `http://localhost:3000/oauth/google/callback` (for local dev)

## 4. Post-Deployment Verification
1. Open Frontend URL.
2. Check Console for any CORS errors.
3. Try **Login with Google**.
4. Check **Automation Logs** (should be empty initially).
