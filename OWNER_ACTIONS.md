# Owner Actions Required

To finalize the deployment and handover, please perform the following actions:

## 1. Accounts & Hosting
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
If the Dashboard is empty or shows errors, check the **Browser Console (F12)** for CORS errors ensuring `ALLOWED_ORIGINS` matches exactly.
