# Changelog

## [1.4.0] - 2026-02-15
### Fixed
- **CameraCard**: Refactored to sync strictly with backend status. Fixed `srcObject` assignment and `autoPlay` logic.
- **HeroCard**: "Devices" count now reflects total devices, and "Active Notifications" count uses real unread status.
- **Notifications**: Added backend notifications for Home Mode and Autopilot changes. Fixed polling and "mark all read" UI.
- **Theme**: Fixed toggle icon logic to mutually exclusive rendering (Sun OR Moon).
- **OAuth**: Enforced `FRONTEND_URL` for Google redirects to prevent localhost fallbacks in production.

## [1.3.0] - 2026-02-15
### Added
- **Notifications Sync**: Implemented real-time notification polling and "Mark as read" functionality.
- **Theme Logic**: Fixed theme toggle to correctly switch icons and persist state without flickering.

### Fixed
- **Camera Stream**: Resolved `srcObject` assignment issues in `CameraCard` for reliable video streaming.
- **Hero Counters**: Updated `HeroCard` to display actual device counts and unread notification alerts.
- **Lint Errors**: Fixed React hook warnings and missing state variables in `CameraCard` and `Header`.

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
