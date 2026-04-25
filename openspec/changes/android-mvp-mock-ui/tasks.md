## 1. Project setup

- [x] 1.1 Add or verify Android dependencies needed for Compose navigation, lifecycle ViewModels, and state collection.
- [x] 1.2 Define the Android package structure for app shell, navigation, models, repositories, and feature screens.
- [x] 1.3 Replace the template `MainActivity` content with an app entry point that hosts the MoneyJar theme and root navigation shell.

## 2. Domain and mock data layer

- [x] 2.1 Define Android domain models for transaction records, category summaries, and screen state that align with the current product vocabulary.
- [x] 2.2 Create repository interfaces for transaction creation, ledger retrieval, and stats retrieval.
- [x] 2.3 Implement a fake in-memory repository with seeded bookkeeping data and local mutation support for new records.

## 3. Navigation and screen implementation

- [x] 3.1 Implement bottom navigation with destinations for Record, Ledger, Stats, and Settings.
- [x] 3.2 Build the Record screen with local input controls for amount, category, note, and a save action wired to the fake repository.
- [x] 3.3 Build the Ledger screen to render reverse-chronological mock transaction history from shared app state.
- [x] 3.4 Build the Stats screen to display weekly and monthly totals plus a lightweight category breakdown derived from the shared dataset.
- [x] 3.5 Build the Settings screen with app information and placeholder preferences that do not require account state.

## 4. State management and UX polish

- [x] 4.1 Introduce ViewModels and observable UI state so screens consume repository-backed data contracts instead of hardcoded lists.
- [x] 4.2 Ensure newly created mock transactions update ledger and stats surfaces immediately.
- [x] 4.3 Add empty, loading, and basic validation feedback states where needed for a coherent MVP demo flow.

## 5. Verification

- [x] 5.1 Add or update Android UI/unit tests for mock record creation, ledger rendering, and summary derivation where practical.
- [x] 5.2 Run the Android test/build commands needed to verify the MVP shell compiles and the basic flows behave as expected.
