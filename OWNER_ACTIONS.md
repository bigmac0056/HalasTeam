# Owner Actions Manual

This guide describes how to configure and manage the SmartSphere Report & Email system in production (Render).

## 1. Environment Variables (Required)

You must set these variables in your Render Dashboard -> Environment.

### Option A: Resend (Recommended)
Best for reliability and ease of use.

| Variable | Value Example | Description |
|----------|---------------|-------------|
| `MAIL_TRANSPORT` | `resend` | Enables Resend mode |
| `RESEND_API_KEY` | `re_123456789` | Your API Key from [resend.com](https://resend.com) |
| `MAIL_FROM` | `SmartSphere <onboarding@resend.dev>` | Verified sender (or test sender) |

---

### Option B: Gmail SMTP (Fallback)
Use if you don't have Resend. Requires Google App Password.

| Variable | Value Example | Description |
|----------|---------------|-------------|
| `MAIL_TRANSPORT` | `smtp` | Enables SMTP mode |
| `MAIL_PROVIDER` | `gmail` | Provider service name |
| `MAIL_USER` | `your.email@gmail.com` | Your Gmail address |
| `MAIL_APP_PASSWORD` | `abcd efgh ijkl mnop` | Top-secret App Password (NOT your login password) |
| `MAIL_FROM` | `SmartSphere <your.email@gmail.com>` | Sender address |

To generate App Password:
1. Go to Google Account -> Security.
2. Enable 2-Step Verification.
3. Search for "App Passwords".
4. Create new, name it "SmartSphere".
5. Copy the 16-character code.

## 2. Testing Email

1. Open your deployed app.
2. Go to **Energy** page.
3. Click the **"Отчет" (Report)** button.
4. In the modal, enter your email address.
5. Click **"Отправить"**.
6. **Success**: You should see a green success message and receive an email with PDF.
7. **Failure**: You will see a red error message. Check Render Logs for details (`MAIL_AUTH_FAILED` etc.).

## 3. Troubleshooting

**"Error: MAIL_NOT_CONFIGURED"**
- Check if `MAIL_TRANSPORT` is set.
- If Resend, check `RESEND_API_KEY`.
- If SMTP, check `MAIL_USER` and `MAIL_APP_PASSWORD`.

**"Error: MAIL_AUTH_FAILED"**
- (SMTP) Double check your App Password. It changes if you change your Google password.

**"Error: region not identified" in cost**
- Ensure you have selected a valid city in the Energy page or allowed Geolocation.
