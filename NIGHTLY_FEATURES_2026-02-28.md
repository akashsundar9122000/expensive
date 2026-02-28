# Nightly Feature Log - February 28, 2026

This file lists **newly added features** in separate groups for quick morning review.

## 1) Goals Tab - New Features Added (Batch 1)

- Interactive goal editing:
  - Edit goal name and target amount directly on Goals screen
  - Save/Cancel flow with validation
- Suggested goal presets:
  - One-click apply for Vacation, Car, Home Down Payment, Education
- Funding upgrades:
  - Quick fund chips (`₹1,000`, `₹5,000`, `₹10,000`, `₹25,000`)
  - Manual fund input + status message
  - Reset collected amount button
- Goal planner:
  - Monthly contribution planner
  - Optional target date
  - Estimated completion month/year
  - Needed-per-month calculation
  - On-track vs needs-boost status
- Milestone system:
  - Visual milestone checkpoints (25/50/75/100)
  - Unlock badges based on progress
  - Goal milestone notifications
- Funding activity feed:
  - Recent contribution timeline persisted per logged-in user/device

## 2) Goals Tab - New Features Added (Batch 2)

- Momentum & Coach panel:
  - Contribution streak tracker (consecutive-day streak)
  - This-week contribution total
  - Weekly target derived from monthly plan
  - Weekly challenge progress bar (%)
- Coach recommendation engine:
  - Calculates expected month-to-date contribution pace
  - Computes gap vs actual month contribution
  - Recommends a top-up amount to stay on track
  - One-click “Add Tip Amount” action to fund recommended value
- Expanded funding history capacity:
  - Increased local history retention from 8 to 30 entries for better trend calculations

## 3) App-Wide Feature Added

- Dashboard Quick Search (live filtering):
  - Search field now actively filters:
    - Recent Transactions table
    - Upcoming Bills list
    - SIP Due Tomorrow list
  - Search supports category, name, mode, date, amount, and related text fields
  - Empty-state messages shown when no match exists

## 4) Technical Files Touched In This Pass

- `frontend/src/app/dashboard/goals/goals.component.ts`
- `frontend/src/app/dashboard/dashboard.component.ts`
- `frontend/src/app/dashboard/dashboard.component.html`
- `frontend/src/app/services/expense.service.ts`
- `frontend/src/app/dashboard/dashboard.component.ts` (goal milestone notifier)

## 5) Validation Status

- Frontend builds successfully after changes (`npm run build`)
- TypeScript diagnostics checked for edited files
- Existing build warnings are third-party CommonJS warnings (pre-existing dependency behavior)
