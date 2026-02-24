# iOS Expense Agent Memory

## Project Overview
Expense tracker with React Native/Expo mobile app at `/mobile/`, Angular web frontend at `/frontend/`, and Vercel serverless API at `/api/expenses/`.

## Mobile App Stack
- Expo SDK 54, React Native 0.81.5
- React Navigation v7 (native-stack + bottom-tabs)
- expo-secure-store for Keychain-backed token storage
- axios for HTTP (interceptors attach JWT per-request)
- expo-linear-gradient, @expo/vector-icons (Ionicons)
- Entry: `mobile/index.ts` -> `mobile/App.tsx` -> `src/navigation/AppNavigator.tsx`

## Security Architecture
- JWT tokens stored in iOS Keychain via `expo-secure-store` (WHEN_UNLOCKED_THIS_DEVICE_ONLY)
- Keychain key: `expensify_jwt_token` (defined in `src/services/api.ts`)
- User profile cached in Keychain key: `expensify_current_user`
- AsyncStorage is NOT used for any auth data (previous security gap, now fixed)
- No console.log/error statements with any sensitive data exist in the codebase

## API Configuration
- Production URL: `https://expense-tracker-five-zeta-64.vercel.app`
- Auth: JWT Bearer tokens, 24h expiry
- All routes under `/api/expenses/` and `/api/auth/`
- Route config in `vercel.json` at project root

## API Endpoints (all require Bearer token)
- GET/POST/DELETE `/api/expenses/transactions` (DELETE uses `?id=` query via Vercel route)
- GET/POST `/api/expenses/banks`
- GET/POST/PUT/DELETE `/api/expenses/budgets` (upsert on POST/PUT, DELETE uses `?category=`)
- GET/POST/DELETE `/api/expenses/subscriptions`
- GET/POST/DELETE `/api/expenses/investments`
- GET `/api/expenses/stats`
- PUT `/api/expenses/preferences`
- POST `/api/auth/login`, POST `/api/auth/register`

## Screen Structure
- Login, Signup (auth stack)
- DashboardScreen, TransactionsScreen, BudgetsScreen, SettingsScreen (bottom tabs)
- AddExpenseScreen (modal, triggered by center FAB)
- SubscriptionsScreen, InvestmentsScreen (accessible from Settings + navigator stack)

## Key Files
- `mobile/src/services/api.ts` — axios instance, Keychain token interceptors, BASE_URL
- `mobile/src/services/authService.ts` — login/register/logout using SecureStore
- `mobile/src/services/expenseService.ts` — all API calls
- `mobile/src/services/models.ts` — TypeScript interfaces
- `mobile/src/theme/colors.ts` — design tokens (dark navy theme: #0A0E27 bg, #4A6CF7 primary)
- `mobile/app.json` — bundleIdentifier: `com.expensify.mobile`, expo-secure-store plugin included

## Data Models
- Transaction: { id, amount, category, subCategory, date, mode: 'Bank'|'UPI'|'Card' }
- Budget: { category, limitAmount } — categories match Transaction.category
- Subscription: { id, name, date, amount, icon, color }
- Investment: { id, type, name, amount, returnPct? }
- DashboardStats: { balance, monthlyExpenses, totalInvestment, goalName, goalRequired, goalCollected, bankBalances }

## Design System
- Background: #0A0E27, Surface: #111638, Card: #161B45
- Primary: #4A6CF7, Secondary: #7C3AED, Success: #10B981, Danger: #EF4444, Warning: #F59E0B
- Currency: Indian Rupee (₹), en-IN locale formatting
- Dark mode only (userInterfaceStyle: dark in app.json)
