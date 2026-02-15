# Owner Actions Required

To finalize the deployment and handover, please perform the following actions:

## 1. Accounts & Hosting
- [ ] Create a **PostgreSQL Database** (Recommended: Neon.tech (Free Tier) or Supabase).
- [ ] Record the **DATABASE_URL** (connection string).
- [ ] Record the **Backend URL** (e.g., `https://smartsphere-api.onrender.com`).
- [ ] Record the **Frontend URL** (e.g., `https://smartsphere.vercel.app`).

## 2. Google Cloud Console
- [ ] Go to your Google Cloud Console project.
- [ ] Update **Authorized redirect URIs** to include:
  - `<Backend URL>/oauth/google/callback`
- [ ] Update **Authorized JavaScript origins** to include:
  - `<Frontend URL>`

## 3. Environment Variables (Backend)
Update your backend hosting environment variables:
- [ ] `DATABASE_URL`: Set to your Postgres connection string (e.g. `postgres://...`).
- [ ] `ALLOWED_ORIGINS`: Set to `<Frontend URL>` (e.g., `https://smartsphere.vercel.app`).
- [ ] `FRONTEND_URL`: Set to `<Frontend URL>`.
- [ ] `GOOGLE_CALLBACK_URL`: Set to `<Backend URL>/oauth/google/callback`.

## 4. Environment Variables (Frontend)
Update your frontend hosting (Vercel) environment variables:
- [ ] `VITE_API_BASE_URL`: Set to `<Backend URL>` (no trailing slash).
- [ ] Redeploy frontend to apply changes.

## 5. Final Verification
- [ ] Open the Frontend URL.
- [ ] Log in via Google (checks OAuth & CORS).
- [ ] Go to Dashboard -> Add Device -> Add a Sensor.
- [ ] Go to Automation Logs -> Click "Clear Logs" (DELETE endpoint check).

## Need Help?
If "Login with Google" fails with a 400 error, check the **Authorized redirect URIs** in Google Console.

## 6. Troubleshooting
- **Error P1001 (Connection Refused):** Check if `DATABASE_URL` is correct and the database is active.
- **Error P1000 (Auth Failed):** Check database username/password in `DATABASE_URL`.
- **Error P2021 (Table not found):** Ensure the start command includes `npx prisma db push`.

