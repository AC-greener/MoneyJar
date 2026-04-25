## Why

The project already has working frontend and backend flows, but the Android client is still only a default Compose template. We need a native Android MVP that can demonstrate the core bookkeeping experience quickly without being blocked by login, backend integration, or sync infrastructure.

## What Changes

- Add an Android-native MVP focused on local mock data and core bookkeeping UI flows under the existing `android/` project.
- Define the first Android information architecture around four tabs: record, ledger, stats, and settings.
- Build the MVP around fake repository data so screens, state models, and navigation can stabilize before real API and auth integration.
- Exclude login, real backend requests, and cloud sync from this proposal scope.
- Reserve clear extension points for future integration with Room, Retrofit, auth, and sync workers.

## Capabilities

### New Capabilities
- `android-mock-bookkeeping-app`: A native Android MVP with mock-backed bookkeeping flows for record entry, ledger browsing, simple stats, and settings shell.

### Modified Capabilities
- None.

## Impact

- Affected code: `android/app/src/main/**`, Gradle dependencies, Android app navigation and state structure.
- Affected systems: Android client only for this change; existing frontend and server remain unchanged.
- Dependencies: Jetpack Compose Material 3, Navigation Compose, ViewModel/state tooling, and mock data models.
