# VaultsPay Expiry and Callback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every VaultsPay transaction expire after 1,800 seconds, process callbacks reliably, and never treat `Initiated` as paid.

**Architecture:** Centralize VaultsPay expiry and status normalization in the existing payment module. Keep callbacks untrusted: resolve the order from the callback, fetch the authoritative transaction from VaultsPay, and fulfill only on a verified success status with matching amount, currency, and reference.

**Tech Stack:** Next.js 16 route handlers, Node.js, Mongoose, Node test runner

**Spec:** User-approved requirements in the 29 October 2026 conversation.

## Global Constraints

- Every VaultsPay checkout and seller-generated payment link uses exactly `expiryInSeconds: 1800`.
- Every initialization request includes the public `/api/vaultspay/callback` URL.
- Callback payload status is never trusted without a VaultsPay transaction-details lookup.
- `Initiated` and unknown statuses remain unpaid/pending.
- Only verified success/captured/paid/completed statuses may release an awaiting order.
- An authoritative `Expired` status is stored distinctly as expired.

## Review Focus

- Mixed-case `Initiated` must normalize to pending and never fulfill an order.
- `Expired` must not be collapsed into a generic cancellation status.
- Missing callback identifiers must return an acknowledged no-op without throwing.
- Callback lookup by transaction ID and client order reference must both work.
- All checkout entry points must share the same 1,800-second expiry.

---

### Task 1: Central VaultsPay expiry and status semantics

**Files:**
- Modify: `lib/vaultsPay.js`
- Test: `tests/vaultsPayPolicy.test.mjs`

**Interfaces:**
- Produces: `VAULTSPAY_EXPIRY_SECONDS`, `VAULTSPAY_CALLBACK_PATH`, and `normalizeVaultsPayStatus(status)`.

- [ ] **Step 1: Write failing tests** for the 1,800-second policy, `Initiated` → `PENDING`, `Expired` → `EXPIRED`, and success statuses → `SUCCESS`.
- [ ] **Step 2: Run the focused test and confirm it fails for the missing exports/old behavior.**
- [ ] **Step 3: Implement the shared constants and status normalizer; make checkout initialization default to the shared expiry.**
- [ ] **Step 4: Run the focused test and confirm it passes.**

### Task 2: Apply the policy to every checkout request

**Files:**
- Modify: `app/api/orders/route.js`
- Modify: `app/api/store/orders/[orderId]/vaultspay-link/route.js`
- Modify: `app/api/store/orders/[orderId]/payment-link/route.js`
- Test: `tests/vaultsPayPolicy.test.mjs`

**Interfaces:**
- Consumes: the shared expiry and callback path from Task 1.

- [ ] **Step 1: Add a failing source-contract test** that enumerates all three VaultsPay entry points and requires the shared expiry and callback path.
- [ ] **Step 2: Run the focused test and confirm the current 15-minute/24-hour mix fails.**
- [ ] **Step 3: Pass the shared 1,800-second value and callback path from every entry point; calculate stored expiry timestamps from the same value.**
- [ ] **Step 4: Run the focused test and confirm it passes.**

### Task 3: Repair callback processing and expired-state handling

**Files:**
- Modify: `lib/vaultsPayWebhook.js`
- Modify: `lib/vaultsPayOrderPayment.js`
- Test: `tests/vaultsPayPolicy.test.mjs`

**Interfaces:**
- Produces: callbacks that acknowledge safely and invoke authoritative verification once; verification returns pending for `Initiated` and records `expired` for `Expired`.

- [ ] **Step 1: Add failing tests** for callback identifier extraction, missing identifiers, and distinct expired handling through exported pure helpers.
- [ ] **Step 2: Run the focused test and confirm the malformed callback flow/old cancellation mapping fails.**
- [ ] **Step 3: Remove the duplicate callback verification block, return a stable acknowledgment, and handle `EXPIRED` separately in authoritative verification.**
- [ ] **Step 4: Run the focused test and confirm it passes.**

### Task 4: Documentation, verification, and push

**Files:**
- Modify: `docs/VAULTSPAY_CHECKOUT.md`
- Modify: `docs/APP_CHECKOUT.md`

- [ ] **Step 1: Document the 30-minute expiry, callback URL, and unpaid `Initiated` behavior.**
- [ ] **Step 2: Run the VaultsPay focused tests and the full relevant payment tests.**
- [ ] **Step 3: Run `npm run build` and confirm exit code 0.**
- [ ] **Step 4: Review the diff, commit only the VaultsPay changes, and push the current branch to `origin/main`.**
