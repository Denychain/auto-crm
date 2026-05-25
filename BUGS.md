# BUGS.md — Auto-CRM Test Report

**Generated:** 2026-05-20  
**Status:** 🟢 Unit tests all passing | E2E pending server  
**Unit tests:** 94/94 passed | **E2E:** not yet run (requires dev server)

---

## Unit Tests (vitest)

| Metric | Value |
|--------|-------|
| ✅ Passed | 94 |
| ❌ Failed | 0 |
| Test files | 5 |
| ⏱ Duration | ~2.5s |

**Test suites:**
- `tests/unit/utils.test.ts` — 22 tests (cn, calcOrderTotal, calcDebt, calcIdleDays, isOverdue, formatPlate)
- `tests/unit/currency.test.ts` — 31 tests (convert, normalizeToUSD, formatMoney, formatMoneyShort, parseMoneyInput)
- `tests/unit/finance.test.ts` — 12 tests (getDateRangeForPeriod, handleOrderClosed / DreamFund 5%)
- `tests/unit/share-distribution.test.ts` — 22 tests (applyShareTemplate, share math, messenger links)
- `tests/unit/exchange-rate.test.ts` — 7 tests (getCachedRate DB cache, NBU fetch, fallback chain)

> All unit tests passing ✅

---

## E2E Tests (Playwright)

> ⚠️ E2E tests have not been run yet.
> 
> **To run E2E tests:**
> 1. Set up test DB: fill in `.env.test` with a Neon test branch URL
> 2. Reset & seed: `npm run test:db:reset`
> 3. Start dev server: `npm run dev`
> 4. Run E2E: `npm run test:e2e`
> 5. Or generate full report: `npm run find:bugs`

**E2E test files created:**
- `tests/e2e/orders/kanban.spec.ts` — 6 tests
- `tests/e2e/orders/detail.spec.ts` — 8 tests
- `tests/e2e/orders/finance-math.spec.ts` — 3 tests
- `tests/e2e/clients/clients.spec.ts` — 7 tests
- `tests/e2e/finance/reports.spec.ts` — 6 tests
- `tests/e2e/dashboard/dashboard.spec.ts` — 6 tests
- `tests/e2e/shopping/shopping.spec.ts` — 5 tests
- `tests/e2e/backlog/backlog.spec.ts` — 3 tests
- `tests/e2e/team/workers.spec.ts` — 6 tests
- `tests/e2e/mobile/critical-mobile.spec.ts` — 5 tests (webkit-mobile)
- `tests/e2e/journeys/full-order-lifecycle.spec.ts` — 4 journey tests

---

## Known Bugs Found During Development

### BUG-001: Template picker dropdown clipped by Card overflow:hidden
**Status:** Fixed  
**Fix:** Rewrote `TemplatePicker` to use `createPortal` + `position: fixed` + `getBoundingClientRect()`

### BUG-002: `Currency` enum undefined in vitest
**Status:** Fixed  
**Fix:** `lib/currency.ts` used `export type { Currency }` (type-only). Tests now import `Currency` directly from `@prisma/client`.

### BUG-003: UAH formatting uses U+00A0 (non-breaking space)
**Status:** Documented (not a bug, by design)  
**Note:** `formatMoney()` uses ` ` (char code 160) as thousands separator and before ₴ symbol. Tests use `const NBSP = " "`.

### BUG-004: Template application was destructive (deleted all workers, added abstract ones)
**Status:** Fixed  
**Fix:** `applyShareTemplate()` now matches by `roleSnapshot`, updates % for existing shares, returns `needWorkers[]` for roles with no assigned worker. Never calls `deleteMany`.

### BUG-005: Worker payouts table grouped Тато once (missed PAINTER vs OWNER split)
**Status:** Fixed  
**Fix:** `groupKey` now uses `workerId::role` composite key so the same worker appears separately for each role.

### BUG-006: `Number(prismaDecimal)` vs `.toNumber()` — mock fund amounts
**Status:** Fixed (in tests)  
**Note:** `handleOrderClosed` uses `Number(f.currentAmount)` to compare fund amounts. Test mocks must use real `Decimal` instances (not plain objects with `.toNumber()`) so `Number()` calls `Decimal.valueOf()` correctly.

---

## How to Re-Run

```bash
# Unit tests only (fast, no server needed)
npm run test:unit

# Unit tests with UI
npm run test:unit:ui

# E2E (requires dev server on localhost:3000)
npm run test:e2e

# E2E with UI debugger
npm run test:e2e:ui

# Full report (unit + E2E → BUGS.md)
npm run find:bugs

# Reset test DB before E2E
npm run test:db:reset
```
