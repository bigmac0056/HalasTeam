# Changelog

## [1.2.0] - 2026-02-15
### Added
- **Real Energy Analytics**: Connected `Energy.jsx` to live `/analytics` and `/tariffs/resolve` endpoints.
- **Production API**: Configured frontend to use live Render API exclusively.
- **Auto Logout**: Added 401 interceptor to handle session expiration.

### Changed
- **Removed Mocks**: Deleted all hardcoded data from Energy and Automation pages.
- **Automation Stats**: "Triggered Today" is now calculated from real logs.
- **Currency**: Switched to `KZ Tenge` formatting for all costs.

## [1.1.0] - 2026-02-15
### Added
- PostgreSQL support for production.
- Prisma scripts in `package.json`.

### Changed
- Switched database provider from SQLite to PostgreSQL.
- Removed legacy SQLite migrations.
