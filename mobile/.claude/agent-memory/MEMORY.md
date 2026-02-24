# iOS Expense App — Agent Memory

## Project Overview
- Expo SDK ~54.0.33 / React Native 0.81.5
- Backend: Vercel serverless at https://expense-tracker-five-zeta-64.vercel.app
- Auth: JWT in expo-secure-store (iOS Keychain). Key: `expensify_jwt_token`
- User cache key: `expensify_current_user` (SecureStore, non-secret)
- No `keychainAccessible` option passed to SecureStore (was removed — caused native bridge type error)

## Architecture
- `App.tsx` → `AppNavigator.tsx` (Stack + Tab navigators)
- Stack screens: Login, Signup, Main (tabs), AddExpense (modal), Subscriptions, Investments
- Tab screens: Dashboard, Transactions, [FAB], Budgets, Settings
- Services: `authService.ts`, `expenseService.ts`, `api.ts` (axios + interceptors)
- Theme: `src/theme/colors.ts`

## Critical Patterns & Known Issues Fixed

### PostgreSQL numeric type coercion
PostgreSQL returns NUMERIC/DECIMAL columns as **strings** via node-postgres. All
`amount`, `balance`, `limitAmount`, `returnPct` fields must be run through
`parseFloat()` in the service layer before use. Fixed in `expenseService.ts`
with explicit normalization in every getter.

### PostgreSQL unquoted alias lowercasing
`limit_amount as limitAmount` → PostgreSQL returns key as `"limitamount"` (lowercase).
Fix: quote the alias with double-quotes: `limit_amount as "limitAmount"`.
Applied to `api/expenses/budgets.js`. Other files already used quoted aliases.

### Promise.all → Promise.allSettled
Dashboard, BudgetsScreen, and SettingsScreen previously used `Promise.all`
which causes the entire data load to silently fail if any single endpoint
throws. Changed to `Promise.allSettled` with per-result status checks.

### Navigation — AddExpenseTab component
The centre FAB tab previously used `component={AddExpenseScreen}` which caused
AddExpenseScreen to mount eagerly on every app load. Replaced with a `NullScreen`
placeholder — the custom `tabBarButton` handles navigation to the stack-level
AddExpense modal instead.

### Stale closure in AddExpenseScreen.loadBanks
`if (!selectedBank)` inside an async closure reads a stale state snapshot.
Refactored to set `selectedBank` unconditionally from the API result.

## API Endpoint Map
- POST /api/auth/login → auth.js
- POST /api/auth/register → auth.js
- GET/POST/DELETE /api/expenses/transactions → transactions.js
- DELETE /api/expenses/transactions/:id → Vercel rewrites to ?id=:id
- GET/POST /api/expenses/banks → banks.js
- GET/POST/DELETE /api/expenses/subscriptions → subscriptions.js
- DELETE /api/expenses/subscriptions/:id → Vercel rewrites to ?id=:id
- GET/POST/DELETE /api/expenses/investments → investments.js
- DELETE /api/expenses/investments/:id → Vercel rewrites to ?id=:id
- GET/PUT/DELETE /api/expenses/budgets → budgets.js
- GET/PUT /api/expenses/preferences → preferences.js
- GET /api/expenses/stats → stats.js

## Vercel Routing (vercel.json)
- `/api/auth/(.*)` → auth.js
- `/api/expenses/transactions/(.+)` → transactions.js?id=$1
- `/api/expenses/subscriptions/(.+)` → subscriptions.js?id=$1
- `/api/expenses/investments/(.+)` → investments.js?id=$1
- `/api/(.*)` → /api/$1

## Auth Response Shape
`{ token, name, email, avatarUrl? }` — avatarUrl may be null/absent on register.
authService now uses fallback: `data.name ?? email` to prevent null name.
