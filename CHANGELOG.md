# Changelog

## [Unreleased] - 2026-02-15

### Changed
- **CI**: Fixed server CI pipeline by adding PostgreSQL service container and updating database migration command.
- **CI**: Added `test` script to client package.json.
- **UI**: Updated Header logo styling to remove dark background circle.
- **UI**: Localized "Active Devices" text in Dashboard.
- **Legal**: Refactored Landing page footer to remove large legal blocks.
- **Legal**: Added "Terms & Privacy" disclaimer links to Login and Register pages.
- **Automation (P0)**: Scheduler now supports both legacy/new rule schema (`trigger.time/value`, `action.status/setStatus`) and returns executed actions for manual debug trigger.
- **Security Demo (P0)**: Added sensor event engine (smoke/water leak/motion) with chain `sensor -> auto-action -> notification -> automation log`, including anti-spam cooldown.
- **Reports (P0)**: Unified report calculation with Energy calculator via `consumptionKwh` parameter for preview/PDF/email consistency.
- **PDF (P0)**: Hardened font fallback to prevent `Unknown font format` from breaking download/email report generation.
- **Energy (P1)**: Added period comparison block (current vs previous period) and room-based consumption breakdown.
- **Automation (P1)**: Replaced hardcoded "12 triggers today" with real log-based counter.
- **Dashboard (P1)**: Added one-click quick action `Выключить всё`.
- **AI (P1)**: Added backend endpoint `/ai/status` with structured sections `new / applied / effect`.
- **Energy (P1)**: Added visible AI status cards (`Новые / Применено / Эффект`) and "recently applied" list.
- **Dashboard (P1)**: Added separate quick buttons `Я ушел` and `Ночь`.
- **Dashboard (P1)**: Added AI status summary in SmartSphere AI sidebar widget.
- **Tests (CI)**: Updated Dashboard test selectors to handle duplicated `Ночь` button text after quick-action buttons were introduced.

## [1.5.0] - 2026-02-15
### Added
- **Email**: Resend API integration + robust SMTP fallback.
- **Reports**: Accurate tariff calculation sync with Energy page.
- **Reports**: Unicode font support (Roboto) for PDF generation.
- **Docs**: OWNER_ACTIONS.md for production setup.

### Changed
- **UI**: Improved ReportModal UX (status messages instead of alerts).
- **Fix**: Removed hardcoded cost fallback in backend reports.
- **AI**: SmartSphere AI Advisor with energy saving recommendations.
- **Reports**: Energy consumption reports with PDF download and Email support.
- **Music**: Full music module with library, playlists, and playback.
- **Music**: Drag & Drop upload + "Add to Playlist" feature.
- **Music**: Real playback controls in Dashboard MusicCard.
- **Storage**: Hybrid storage service (Local/S3).
- **Database**: New Prisma models for Tracks, Playlists, PlaybackState, AiRecommendation, AiActionLog.
- **UI**: New Music page and updated Dashboard MusicCard.


### Fixed
- **Tests**: Fixed and updated client-side tests for Dashboard and Login pages.

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
