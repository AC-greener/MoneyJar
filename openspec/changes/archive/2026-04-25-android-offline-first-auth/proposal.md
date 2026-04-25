## Why

The Android app now has a usable mock MVP, but it still lacks the real data lifecycle needed for daily use. We need the next phase to support local-first bookkeeping, native login, and backend API integration without breaking the key promise that users can keep recording expenses even before they sign in.

## What Changes

- Add Android native login using the backend's existing Google login endpoint for authenticated sessions.
- Replace the current mock-only bookkeeping flow with a local-first architecture backed by persistent on-device storage.
- Allow unauthenticated users to continue creating and viewing transactions locally without backend access.
- Automatically claim and sync anonymous local transactions into the signed-in account after login.
- Introduce authenticated transaction API access, token refresh handling, and sync state tracking for local records.
- Keep Android UI flows usable offline, with the local database as the primary source of truth and cloud sync as an enhancement layer.

## Capabilities

### New Capabilities
- `android-offline-first-auth-app`: Android local-first bookkeeping with native login, persistent local storage, backend transaction sync, and automatic claiming of anonymous local transactions after sign-in.

### Modified Capabilities
- None.

## Impact

- Affected code: Android app data layer, auth/session layer, local persistence, sync orchestration, and settings/login UI surfaces.
- Affected APIs: Android will consume `/api/auth/google`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/me`, and authenticated `/api/transactions` endpoints.
- Affected systems: Android client directly; backend contracts are reused rather than fundamentally changed.
- Dependencies: Google sign-in/Credential Manager, Room or equivalent local persistence, DataStore for session storage, Retrofit/OkHttp or equivalent network layer, and background sync coordination.
