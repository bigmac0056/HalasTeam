# Deployment Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 15+
- (Optional) S3-compatible storage bucket

## Environment Variables

### Server (.env)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/smartsphere"

# Auth
JWT_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_CALLBACK_URL="http://localhost:3000/oauth/google/callback"
FRONTEND_URL="http://localhost:5173"
ALLOWED_ORIGINS="http://localhost:5173,https://your-vercel-domain.vercel.app"

# Storage
STORAGE_PROVIDER="local" # or "s3"
STORAGE_PUBLIC_BASE_URL="http://localhost:3000/uploads"

# Music Limits
MUSIC_MAX_TRACKS_PER_USER=500
MUSIC_MAX_STORAGE_BYTES=2147483648 # 2GB

# S3 Configuration (Required if STORAGE_PROVIDER="s3")
S3_ENDPOINT="https://s3.region.amazonaws.com"
S3_REGION="us-east-1"
S3_BUCKET="your-bucket-name"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
S3_FORCE_PATH_STYLE="false"
```

## Build & Run

1. **Server**
   ```bash
   cd server
   npm install
   npx prisma db push
   npm start
   ```

2. **Client**
   ```bash
   cd client
   npm install
   npm run build
   # Serve dist/ folder via Nginx or static server
   ```

## Production Notes (Render + Vercel)
- Backend URL example: `https://your-backend.onrender.com`
- Frontend URL example: `https://your-frontend.vercel.app`
- Set on Render (backend):
  - `FRONTEND_URL=https://your-frontend.vercel.app`
  - `GOOGLE_CALLBACK_URL=https://your-backend.onrender.com/oauth/google/callback`
  - `ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:5173`
  - `DATABASE_URL=postgres://...`
  - `JWT_SECRET=...`
- Set on Vercel (frontend):
  - `VITE_API_BASE_URL=https://your-backend.onrender.com`
