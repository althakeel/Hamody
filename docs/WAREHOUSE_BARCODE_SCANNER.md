# Store1920 Warehouse Barcode Scanner

**Audience:** Warehouse Flutter / Android app, ops, backend  
**Purpose:** Detailed guide to the **warehouse barcode scanner** — what is printed on the label, what the scan string contains, how Store1920 normalizes it, which APIs open, and what happens after a scan  
**Base URL:** `https://www.store1920.com`  
**Related:** [ORDER_TRACKING_SHIPPING.md](./ORDER_TRACKING_SHIPPING.md) (couriers), [APP_SCANNER_AI.md](./APP_SCANNER_AI.md) (shopper photo search — **different** scanner)  
**Last updated:** 10 November 2026

---

## 0. Two different “scanners” (do not mix them)

| Scanner | Who uses it | What is scanned | Goal |
|---------|-------------|-----------------|------|
| **Warehouse barcode scanner** (this doc) | Warehouse staff | EMX Door-to-Door **label barcode**, order refs, return codes | Find order → pack / track / collect return |
| **Shopper VISION scanner** | Customer app | Product **photo** | AI image search → product list (`POST /api/search-by-image`) |

The warehouse app reads a **1D barcode / AWB string**. It does **not** call Gemini or ChatGPT.

---

## 1. What the warehouse scanner is for

Typical flow on the warehouse phone:

1. Open camera / hardware barcode gun → read the **EMX Door-to-Door** barcode on the shipping label.  
2. App sends the raw string to Store1920.  
3. Backend cleans the string, finds the matching `Order`.  
4. App shows order details (customer, items, SKUs, packing / pickup / return state).  
5. Staff either:
   - **Looks up** tracking / label / pickup status, or  
   - **Packs** the order (status → `WAITING_FOR_PICKUP` + customer email), or  
   - **Collects a return** (status → `RETURNED` / `RTO` + restock).

---

## 2. What is inside the barcode (label contents)

### 2.1 Primary barcode: EMX Door-to-Door AWB

Printed on the **EMX carrier label** (the physical sticker staff scan).

| Property | Value |
|----------|--------|
| What it is | EMX airway bill / Door-to-Door tracking number |
| Typical shape | Digits starting with **`1000`** |
| Regex Store1920 uses | `^1000\d{9,12}$` |
| Example | `1000045344337`, `1000027243272` |
| Order field | `waslah.emxTrackingNumber` (also may mirror to `waslah.trackingNumber` / `trackingId`) |
| Customer track URL | `https://www.emx.ae/all-services/track-a-package?trackingnumber={awb}` |
| Direct EMX Tracking API | `GET …/tracking/api/Tracking?awbNumber={awb}` (see shipping doc §4.0) |

**This is the number the warehouse scanner is built for.**

From `models/Order.js`:

```text
waslah.emxTrackingNumber  →  EMX Door To Door barcode (1000…) — scanners look this up
waslah.waslahTrackingNumber → Waslah platform receipt (62…) — NOT used for EMX label scans
```

### 2.2 Not the Door-to-Door barcode: Waslah platform number

| Property | Value |
|----------|--------|
| Shape | Digits starting with **`62`** |
| Regex | `^62\d{10,14}$` |
| Example | `62007200719360` |
| Order field | `waslah.waslahTrackingNumber` |
| Scanner rule | Treated as **Waslah platform** id — **not** the EMX label barcode |

Staff should scan the **EMX `1000…` barcode**, not the Waslah `62…` receipt number, when looking up by label.

### 2.3 Other printable identifiers on / near the label

The same lookup engine also accepts these if the gun or staff enters them:

| Printed / typed value | Example | Maps to |
|-----------------------|---------|---------|
| Store reference | `S1920-618752` | `waslah.reference` / `shortOrderNumber` |
| Short order number | `618752` | `shortOrderNumber` |
| Mongo order id | 24-hex ObjectId | `_id` |
| Waslah order id | Mongo-like / Waslah id | `waslah.orderId` |
| Return case id | `RET-1920-123` | ReturnRequest → sale / pickup order |
| Return pickup ref | `618957-RP` | `waslahReturn.reference` |
| Return pickup AWB | another `1000…` | `waslahReturn.trackingNumber` |
| Pasted EMX URL | `…track-a-package?trackingnumber=1000…` | Digits extracted |
| Generic AWB | 10–16 digit non-`62…` | Treated as EMX-like fallback |

### 2.4 What the raw scanner string may contain (before cleanup)

Hardware / camera scanners often wrap the AWB. Store1920 expects that and **normalizes** it.

| Dirty input | Why it happens | Cleaned candidates |
|-------------|----------------|--------------------|
| `1000045344337` | Clean scan | same |
| ` 1000 0453 44337 ` | Spaces / OCR | digits only |
| `001000045344337` | Leading zeros | strip leading `0` before `1000` |
| `001000045344337` with GS1 | AI `00` / `01` prefix | strip `00` or `01` |
| Longer digit blob containing `1000…` | Code128 / GS1 payload | extract embedded `1000\d{6,12}` |
| Full track URL | Staff paste | `trackingnumber=` query |
| `S1920-618752` | Reference line | uppercase ref + order no |

Implementation: `normalizeWarehouseScanCandidates()` in `lib/orderTrackingLookup.js`.

```text
Raw scan
  → keep original
  → extract URL awb / ?awb=
  → digits-only
  → strip leading zeros / GS1 00|01
  → extract embedded 1000…
  → extract S1920-##### / RET-1920-#####
  → try each candidate against Order fields
```

---

## 3. How lookup maps a scan → Order

Function: `findOrderByTrackingIdentifier(q)` (`lib/orderTrackingLookup.js`).

Search order (simplified):

1. Normalize candidates from the raw scan.  
2. If `RET-1920-…` → resolve ReturnRequest → pickup / source order.  
3. For each candidate, match **any** of:
   - `waslah.emxTrackingNumber`
   - `trackingId`
   - `waslah.trackingNumber`
   - `waslah.waslahTrackingNumber`
   - `waslahReturn.trackingNumber` / `reference` / `orderId`
   - `awb` / `airwayBillNo`
   - `waslah.reference` (with or without `S1920-` prefix)
   - `waslah.orderId`
   - Mongo `_id` (24-hex)
   - `shortOrderNumber` (numeric)
4. Prefer exact EMX barcode matches first (public track-order + warehouse).

Helpers:

| Helper | Role |
|--------|------|
| `looksLikeEmxTrackingNumber()` | `1000…` (or other non-`62` 10–16 digit AWB) |
| `looksLikeWaslahPlatformTrackingNumber()` | `62…` |
| `getEmxTrackingNumber(order)` | Best outbound EMX AWB on the order |
| `getReturnEmxTrackingNumber(order)` | Return-pickup AWB on `waslahReturn` |
| `resolveTrackingLookupTarget(order, q)` | Whether this scan was **outbound** or **return** AWB |

---

## 4. Auth for the warehouse scanner

`lib/warehouseAuth.js` — `getWarehouseApiContext(request)`.

| Method | How | Env / token |
|--------|-----|-------------|
| **Scanner key** (device) | Header `x-warehouse-key: <key>` | `WAREHOUSE_SCANNER_API_KEY` + `WAREHOUSE_STORE_ID` |
| **Seller login** | `Authorization: Bearer <Firebase ID token>` | Same as `/store` dashboard; store resolved via `authSeller` |

If neither works → `401 Unauthorized` with hint to send key or Bearer token.

Actor recorded on pack / return collect:

- Key auth → `{ uid: "warehouse-app", name: "Warehouse app" }`
- Seller auth → Firebase uid / name / email

---

## 5. Scanner APIs (what the app calls)

### 5.1 Lookup by barcode / AWB (main scan)

```http
GET  /api/warehouse/tracking?q=<scan>&live=true
POST /api/warehouse/tracking
Content-Type: application/json

{ "q": "1000045344337", "live": true }
```

Aliases for the scan string: `q` | `awb` | `tracking` | `order` | `orderId`.

| Query | Meaning |
|-------|---------|
| `live=true` | Refresh Waslah/EMX status before responding (`syncWaslahStatusForOrder`) |
| `status=WAITING_FOR_PICKUP,…` | List queue (no `q`) |
| `packed=true\|false` | Filter `warehousePacking.packed` |
| `pickup=requested\|pending` | Filter pickup request state |
| `limit` | List page size (max 100) |

**Success (lookup):**

```json
{
  "success": true,
  "mode": "lookup",
  "q": "1000045344337",
  "liveSync": { "changed": true, "skipped": false, "error": null },
  "order": {
    "orderId": "…",
    "shortOrderNumber": "618752",
    "status": "WAITING_FOR_PICKUP",
    "courier": "EMX",
    "trackingNumber": "1000045344337",
    "emxTrackingNumber": "1000045344337",
    "waslahTrackingNumber": "6200…",
    "trackingUrl": "https://www.emx.ae/all-services/track-a-package?trackingnumber=1000045344337",
    "labelReady": true,
    "labelUrl": "…",
    "pickup": { "requested": true, "date": "…", "time": "…" },
    "warehousePacking": { "packed": true, "packedAt": "…" },
    "returnCollected": { "collected": false },
    "returnPickup": null,
    "customer": { "name": "…", "phone": "…", "email": "…" },
    "items": [
      {
        "itemIndex": 0,
        "productId": "…",
        "name": "…",
        "quantity": 1,
        "sku": "…",
        "image": "https://…"
      }
    ],
    "waslah": {
      "orderId": "…",
      "liveStatus": "…",
      "events": []
    }
  }
}
```

Serializer: `serializeWarehouseTrackingOrderHydrated()` in `lib/warehouseTracking.js`  
(hydrates product thumbnails/SKUs when order lines only had ObjectIds).

**Not found:** `404` `{ "error": "Order not found", "q": "…" }`  
Wrong store / deleted → treated as not found.

### 5.2 Order list (warehouse home)

```http
GET /api/warehouse/orders?page=1&limit=50&q=&status=&live=true&shipment=waslah
```

Supports date range (`fromDate` / `toDate` Dubai days), status filter, Waslah-only shipment filter.

### 5.3 Single order by id

```http
GET /api/warehouse/tracking/[orderId]
```

### 5.4 Pack after scan (Packed button)

```http
POST /api/store/orders/pack
Authorization: Bearer <Firebase seller token>
Content-Type: application/json

{
  "q": "1000045344337",
  "notes": optional,
  "force": false,
  "resendEmail": false
}
```

Or `{ "orderId": "<mongoId>" }`.

What packing does (`packStoreOrder` in `lib/warehouseOrderPacking.js`):

1. Resolve order by AWB / order id (same lookup).  
2. Block if status is `CANCELLED`, `DELIVERED`, `RETURNED`, `RTO`, etc.  
3. Set `warehousePacking.packed = true` (+ who / when / notes).  
4. Set order `status` → **`WAITING_FOR_PICKUP`**.  
5. Email customer status email for awaiting pickup.  
6. Write communication log.

### 5.5 Return scan — lookup then collect

**Preview:**

```http
GET /api/warehouse/returns/scan?q=1000…
POST /api/warehouse/returns/scan
{ "q": "1000…", "action": "lookup" }
```

**Collect (mark returned + restock):**

```http
POST /api/warehouse/returns/scan
{
  "q": "1000…",
  "action": "collect",
  "type": "RETURNED",
  "restock": true,
  "notes": optional,
  "itemIndexes": [0, 1]
}
```

Legacy twin:

```http
POST /api/warehouse/returns/collect
```

Collect sets `warehouseReturn.collected`, order status `RETURNED` or `RTO`, optional stock restock, and returns `returnedProducts` for the app UI.

`matchedTrackingKind`: `outbound` | `return` — whether the barcode matched the outbound AWB or the return-pickup AWB.

### 5.6 Inventory (warehouse stock screen)

```http
GET /api/warehouse/inventory
```

(Same warehouse auth; not a barcode decode path — stock list for the app.)

---

## 6. What the app should show after a successful scan

From the `order` object in the tracking payload:

| UI block | Fields |
|----------|--------|
| Header | `shortOrderNumber`, `status`, `courier` |
| Barcode / AWB | `emxTrackingNumber` / `trackingNumber` (+ link `trackingUrl`) |
| Label | `labelReady`, `labelUrl`, `labelPrintedAt`, `labelDownloadCount` |
| Packing | `warehousePacking.packed`, `packedAt`, packed by |
| Pickup | `pickup.requested`, date / time / vehicle |
| Customer | `customer.name`, phone, email, `shippingAddress` |
| Lines | `items[]` — name, qty, sku, image, variantOptions |
| Live courier | `waslah.liveStatus`, `events[]`, `courierReason` |
| Return | `returnCollected`, `returnPickup`, `matchedTrackingKind` on return APIs |

Suggested UX:

1. Scan → call `POST /api/warehouse/tracking` with `live: true`.  
2. Show order card.  
3. If packing: confirm → `POST /api/store/orders/pack` with same `q`.  
4. If return bay: `action: lookup` then `action: collect` on `/api/warehouse/returns/scan`.

---

## 7. Status transitions tied to scanning

| Action | Status change | Extra |
|--------|---------------|--------|
| Scan lookup only | None (optional live sync of Waslah fields) | May refresh `waslah.events` / `appStatus` |
| Pack | → `WAITING_FOR_PICKUP` | `warehousePacking.packed = true`, customer email |
| Return collect | → `RETURNED` or `RTO` | `warehouseReturn.collected = true`, restock once |

Queue statuses used by tracking list default:

`WAITING_FOR_PICKUP`, `PICKUP_REQUESTED`, `PROCESSING`, `ORDER_PLACED`, `SHIPPED`.

---

## 8. How the EMX barcode gets onto the order (before anyone scans)

1. Seller / auto-ship creates shipment via **Waslah → EMX**.  
2. Waslah returns tracking; Store1920 stores:
   - `waslah.emxTrackingNumber` = Door-to-Door `1000…`  
   - `waslah.waslahTrackingNumber` = platform `62…` when present  
3. Label PDF printed (`print-receipt` / carrier-label).  
4. Warehouse scans the **printed EMX barcode** → lookup hits `emxTrackingNumber`.

If EMX AWB was missing after create, status sync / order detail refresh can **recover** `emxTrackingNumber` from Waslah (`lib/waslahOrderStatusSync.js`).

**New path (implementing):** direct EMX `POST /api/Shipments/create` will also produce a `1000…` AWB — same scanner lookup once that AWB is saved on the order. See [ORDER_TRACKING_SHIPPING.md](./ORDER_TRACKING_SHIPPING.md) §4.0.

---

## 9. End-to-end diagram

```text
┌─────────────────┐     raw string      ┌──────────────────────────┐
│ Phone / gun     │ ──────────────────► │ normalizeWarehouseScan   │
│ EMX label 1000… │                     │ Candidates (GS1, URL…)   │
└─────────────────┘                     └────────────┬─────────────┘
                                                     │
                                                     ▼
                                        ┌──────────────────────────┐
                                        │ findOrderByTrackingId…   │
                                        │ emxTrackingNumber / refs │
                                        └────────────┬─────────────┘
                                                     │
                          ┌──────────────────────────┼──────────────────────────┐
                          ▼                          ▼                          ▼
                 Tracking payload            Pack → WAITING_FOR_PICKUP   Return collect
                 /api/warehouse/tracking     /api/store/orders/pack      /returns/scan
```

---

## 10. Env vars (warehouse device)

```text
WAREHOUSE_SCANNER_API_KEY=long_random_secret
WAREHOUSE_STORE_ID=<mongo store id for this warehouse app>
```

Prefer device key for dedicated warehouse phones; use Firebase seller login when staff share the `/store` account.

---

## 11. Code map

| Area | Path |
|------|------|
| Auth | `lib/warehouseAuth.js` |
| Scan normalize + order find | `lib/orderTrackingLookup.js` |
| EMX vs Waslah number rules | `lib/waslahTracking.js` (`looksLikeEmxTrackingNumber`, `getEmxTrackingNumber`) |
| Tracking payload | `lib/warehouseTracking.js` |
| Pack | `lib/warehouseOrderPacking.js`, `app/api/store/orders/pack/route.js` |
| Return scan | `lib/warehouseReturnScan.js`, `app/api/warehouse/returns/scan/route.js` |
| Return collect (legacy) | `app/api/warehouse/returns/collect/route.js` |
| Tracking API | `app/api/warehouse/tracking/route.js` |
| Orders list | `app/api/warehouse/orders/route.js` |
| Order fields | `models/Order.js` → `waslah.emxTrackingNumber`, `warehousePacking`, `warehouseReturn` |

---

## 12. Quick FAQ

**What number should staff scan?**  
The **EMX Door-to-Door barcode** on the carrier label — digits starting with **`1000`**.

**What is inside that barcode?**  
Only the **EMX AWB number** (numeric). It is not a JSON blob. Store1920 maps that number to the order via `waslah.emxTrackingNumber`. Extra GS1 prefixes / spaces / URLs are stripped before lookup.

**Can they scan the Waslah `62…` number?**  
Lookup may still find the order via `waslah.waslahTrackingNumber`, but warehouse ops and docs treat **`1000…` as the scanner barcode**. Do not print/process `62…` as the EMX Door-to-Door code.

**Is this the same as the customer VISION camera?**  
No. VISION is photo → AI product search. Warehouse scanner is barcode → order.

**What if scan returns 404?**  
Confirm shipment was created, `emxTrackingNumber` is saved, label is the EMX one, and the device key’s `WAREHOUSE_STORE_ID` matches the order’s store.
