# Changelog

All notable changes to the SmartSphere project will be documented in this file.

## [Unreleased]

### Stage 1: Critical Fixes
- **Security**: Removed hardcoded OAuth secrets from `server/config/passport.js`.
- **Security**: Fixed IDOR vulnerability in `PATCH /notifications/:id/read` by enforcing user ownership check.
- **Auth**: Updated `authMiddleware` to verify users by `userId` (from JWT) instead of email, ensuring session stability after profile changes.
- **Frontend**: Fixed runtime bugs in `Header.jsx` (undefined user), `Dashboard.jsx` (double toggles, missing functions).
- **Quality**: Fixed all linting errors in modified files.

### Stage 2: Stability & Configuration
- **Configuration**: Externalized API URLs using `client/.env` and `import.meta.env`.
- **Security**: Implemented secure OAuth flow using short-lived code exchange pattern (replacing direct JWT in URL).
- **Data**: Unified weather data response to include humidity, aligning backend service with frontend requirements.
- **Quality**: Verified all changes with linting and build checks.

### Stage 3: Functional Gaps
- ...

### Stage 4: Architecture & Quality
- ...

### Stage 5: Documentation
- ...
