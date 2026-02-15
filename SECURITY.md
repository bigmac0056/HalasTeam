# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| Latest (main) | ✅ |

## Authentication

### JWT (JSON Web Tokens)
- All protected API endpoints require a valid JWT in the `Authorization: Bearer <token>` header
- Tokens are signed with a secret key stored in the `JWT_SECRET` environment variable
- Token payload contains only the `userId` — no sensitive data is exposed
- Tokens are verified on each request via `authMiddleware.js`

### Google OAuth 2.0
- Social login uses the **authorization code flow** (secure server-side exchange)
- JWT tokens are **never** exposed in URL query parameters
- Client ID and Client Secret are stored in environment variables, never hardcoded

### Password Security
- Passwords are hashed using `bcryptjs` with automatic salting
- Plain-text passwords are never stored or logged

## Authorization

### IDOR Protection
- All device, notification, and profile endpoints verify resource ownership
- Users can only access their own data — every database query filters by `userId`
- Example: `DELETE /devices/:id` checks that the device belongs to the authenticated user

## Data Security

### Environment Variables
All sensitive configuration is externalized to `.env` files:
- `JWT_SECRET` — Token signing key
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth credentials
- `DATABASE_URL` — Database connection string

> ⚠️ **Never commit `.env` files to version control.** The `.gitignore` file excludes them by default.

### Database
- SQLite database via Prisma ORM
- Database file (`dev.db`) is excluded from version control
- Prisma migrations provide schema versioning and audit trail

## Best Practices

1. **Use strong, unique `JWT_SECRET`** — at least 32 characters, randomly generated
2. **Keep dependencies updated** — run `npm audit` regularly
3. **Use HTTPS in production** — for secure token transmission
4. **Set CORS appropriately** — restrict to your frontend domain in production
5. **Consider httpOnly cookies** — for storing tokens in production (instead of localStorage)

## Known Limitations

- Tokens are stored in `localStorage` (vulnerable to XSS in production)
- No rate limiting on auth endpoints (recommended for production)
- No CSRF protection (mitigated by JWT-based auth)
- SQLite is suitable for development; consider PostgreSQL for production

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue
2. Email the maintainers at the contact listed in the repository
3. Include a detailed description and reproduction steps
4. We will acknowledge receipt within 48 hours

Thank you for helping keep SmartSphere secure! 🔐
