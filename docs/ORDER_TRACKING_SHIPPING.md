# Store1920 Order Tracking & Shipping (Couriers)

**Audience:** Ops, warehouse, backend, mobile / ERP partners  
**Purpose:** List the courier companies Store1920 uses today, the APIs wired in the codebase, and the **new direct EMX API** being implemented  
**Customer track page:** `https://store1920.com/track-order`  
**Track API:** `GET /api/track-order`  
**Last updated:** 10 November 2026  
**Source for §4.0:** EMX Postman collection (`EMX API` — Shipments, Tracking, Masters, Rate Calculator)

---

## 1. Courier companies in use

| # | Courier / platform | Code on orders | Role today |
|---|--------------------|----------------|------------|
| 1 | **EMX direct** (EP Services) | `EMX` (planned) | **New courier being implemented.** Direct EMX / `epservices.ae` API (create shipment, track, masters, rate). Not yet the live auto-ship path in Store1920 code. |
| 2 | **EMX** (via **Waslah**) | `EMX` / `Waslah` | **Current primary** UAE last-mile. Auto-ship, warehouse labels, webhooks, and crons go through Waslah today. |
| 3 | **Waslah** | Platform / aggregator | Seller API gateway (`gateway.waslah.ae`). Creates EMX shipments, pickups, labels, tracking history, cancel. |
| 4 | **C3Xpress** | `C3Xpress` | Secondary UAE courier. Full create AWB / track / pickup / label PDF / rate. |
| 5 | **Delhivery** | `Delhivery` | Track, pickup, pincode, TAT. LTL freight console for ops. **B2C create-shipment is not live** (stub only). |

### New courier: EMX direct

Store1920 is adding a **direct EMX** integration (Postman: **EMX API**) alongside the existing Waslah → EMX path:

- Create domestic / international shipments on `epservices.ae`
- Track by AWB on `api-stg.emx.ae` / production EMX tracking host
- Masters: countries, emirates, cities
- Rate calculator on `epservices.ae`

Until that client is wired into seller ship / auto-ship, **production fulfillment still uses Waslah → EMX**.

**Not integrated as couriers in this codebase:** Aramex, DHL, FedEx, SMSA, iMile, J&T, Shipa, Fetchr, Quiqup, Noon Express.

Manual fallback is always available: staff can set `order.courier` + `trackingId` / `trackingUrl` to any free-text carrier.

### Preferred courier (current Waslah path)

```text
WASLAH_PREFERRED_COURIER=EMX
```

Waslah service list is filtered to EMX when that env is set (default **EMX**).

---

## 2. How tracking reaches the customer

| Surface | Path | Notes |
|---------|------|--------|
| Storefront | `/track-order` | Phone, email, AWB, or order id |
| Public API | `GET /api/track-order?phone=&email=&awb=&orderId=&carrier=` | `carrier` = `emx` \| `waslah` \| `c3xpress` |
| Deep link | `/track-order?awb=…&auto=1` or `?order=…` | Built by `buildTrackOrderPageUrl()` |
| EMX public site | `https://www.emx.ae/all-services/track-a-package?trackingnumber={awb}` | `buildEmxTrackingUrl()` |
| EMX Tracking API | `GET …/tracking/api/Tracking?awbNumber=` | Direct EMX API (see §4.0) — **new** |
| C3X public site | `https://c3xpress.com/tracking?awb={awb}` | |
| Delhivery public site | `https://www.delhivery.com/track/package/{awb}` | |

Emails and status messages prefer the EMX public URL when a Waslah/EMX AWB exists.

---

## 3. Where AWB / courier data lives on the order

Stored on the `Order` document (`models/Order.js`):

| Field | Meaning |
|-------|---------|
| `courier` | Display name / code (`EMX`, `C3Xpress`, `Delhivery`, …) |
| `trackingId` | Generic AWB (C3X, Delhivery, manual) |
| `trackingUrl` | Customer-facing track link |
| `waslah.trackingNumber` | Primary Waslah/EMX AWB used in ops |
| `waslah.emxTrackingNumber` | EMX door-to-door barcode (`1000…`) — warehouse scan ([full scanner doc](./WAREHOUSE_BARCODE_SCANNER.md)) |
| `waslah.waslahTrackingNumber` | Waslah platform number (`62…`) — not the EMX label barcode |
| `waslah.orderId` / `reference` / `labelUrl` / events / status | Waslah linkage + live status |
| `waslahReturn.*` | Reverse / return pickup AWBs |

Lookup helpers: `lib/orderTrackingLookup.js`, warehouse: `/api/warehouse/tracking`.

---

## 4. Courier APIs

### 4.0 EMX direct / EP Services — **new courier (being implemented)**

Official EMX / Emirates Post Services HTTP APIs from the **EMX API** Postman collection.  
Store1920 will call these directly (not only through Waslah).

| Item | Detail |
|------|--------|
| Status in Store1920 | **Implementing** — document + credentials first; live ship path still Waslah until client is wired |
| Product types | `Domestic`, `International` |
| Delivery type | `DoorToDoor` (typical) |
| Content type | `NonDocument` / document as required |
| Account (staging sample) | `account.number` = `177122` (confirm with EMX for production) |
| Auth (create shipment) | Header `x-api-key: <EMX_SHIPMENTS_API_KEY>` |
| Auth (tracking) | Header `x-api-key: <EMX_TRACKING_API_KEY>` |
| Auth (rate calculator) | Headers `AccountNo`, `Password` |

**Do not commit real API keys.** Keep them in env / secrets manager only.

#### Hosts (staging from Postman)

| Service | Staging host |
|---------|----------------|
| Create shipment | `https://local-stg.epservices.ae` |
| Tracking | `https://api-stg.emx.ae` |
| Masters (emirates / cities) | `https://masters-stg.epservices.ae` |
| Masters (countries) | `https://masters.epservices.ae` |
| Rate calculator | `https://osbstg-new.epservices.ae` |

Production hosts are provided by EMX when the account goes live (replace `*-stg` / `local-stg` with the live EP Services / EMX hosts).

#### Endpoints

| # | Name | Method | URL | Auth |
|---|------|--------|-----|------|
| 1 | CreateShipment — Domestic | `POST` | `{shipmentsHost}/api/Shipments/create` | `x-api-key` |
| 2 | CreateShipment — International | `POST` | `{shipmentsHost}/api/Shipments/create` | `x-api-key` |
| 3 | Tracking | `GET` | `{trackingHost}/tracking/api/Tracking?awbNumber={awb}` | `x-api-key` |
| 4 | GetCountries | `GET` | `{mastersHost}/locations/api/Countries` | none in Postman |
| 5 | GetEmirates | `GET` | `{mastersStgHost}/locations/api/Emirates` | none in Postman |
| 6 | GetCities | `GET` | `{mastersStgHost}/locations/api/Cities?CountryIsoCode={ISO}` | none in Postman |
| 7 | Rate Calculator | `POST` | `{rateHost}/ebs/genericapi/ratecalculator/rest/CalculatePriceRate` | `AccountNo` + `Password` |

Staging examples:

```text
POST https://local-stg.epservices.ae/api/Shipments/create
GET  https://api-stg.emx.ae/tracking/api/Tracking?awbNumber=1000027243272
GET  https://masters.epservices.ae/locations/api/Countries
GET  https://masters-stg.epservices.ae/locations/api/Emirates
GET  https://masters-stg.epservices.ae/locations/api/Cities?CountryIsoCode=SA
POST https://osbstg-new.epservices.ae/ebs/genericapi/ratecalculator/rest/CalculatePriceRate
```

#### Create shipment — Domestic (body shape)

```json
{
  "weight": { "value": 1000, "unit": "Grams" },
  "shipper": {
    "contact": {
      "name": "Store1920",
      "mobileNumber": "05XXXXXXXX",
      "phoneNumber": "04XXXXXXX",
      "emailAddress": "orders@store1920.com",
      "companyName": "Store1920"
    },
    "address": {
      "line1": "Warehouse address",
      "city": "Dubai",
      "countryCode": "AE",
      "zipCode": "00000"
    },
    "referenceNo1": "ShipperReference1",
    "referenceNo2": "ShipperReference2"
  },
  "consignee": {
    "contact": {
      "name": "Customer name",
      "mobileNumber": "05XXXXXXXX",
      "phoneNumber": "04XXXXXXX",
      "emailAddress": "customer@example.com",
      "companyName": "Customer name"
    },
    "address": {
      "line1": "Delivery address",
      "city": "Sharjah",
      "countryCode": "AE",
      "zipCode": "00000"
    },
    "referenceNo1": "ConsigneeReference1",
    "referenceNo2": "ConsigneeReference2"
  },
  "dimensions": {
    "length": 10,
    "height": 10,
    "width": 10,
    "unit": "Centimetre"
  },
  "account": { "number": 177122 },
  "productCode": "Domestic",
  "serviceType": "None",
  "printType": "AWBOnly",
  "sendMailToSender": false,
  "sendMailToReceiver": false,
  "isInsured": true,
  "customsDeclarations": null,
  "declaredValue": { "amount": 250, "currency": "AED" },
  "numberOfPieces": 1,
  "referenceNumber1": "OrderNumber",
  "referenceNumber2": "",
  "referenceNumber3": "",
  "referenceNumber4": "",
  "specialNotes": "",
  "remarks": "",
  "deliveryType": "DoorToDoor",
  "contentType": "NonDocument",
  "isCod": true,
  "coDAmount": { "amount": 50, "currency": "AED" }
}
```

Headers:

```http
Content-Type: application/json
x-api-key: <EMX_SHIPMENTS_API_KEY>
```

#### Create shipment — International (differences)

Same URL and `x-api-key`. Set:

- `productCode`: `"International"`
- Consignee `countryCode` outside AE (e.g. `"IN"`)
- `customsDeclarations`: array of HS / description / origin / weight / value
- `isCod`: usually `false` for international in the sample
- Dimension `unit` in Postman sample: `"Meter"` (confirm with EMX; domestic sample uses `"Centimetre"`)

#### Tracking

```http
GET https://api-stg.emx.ae/tracking/api/Tracking?awbNumber=1000027243272
x-api-key: <EMX_TRACKING_API_KEY>
```

AWB style in EMX samples: `1000…` (same door-to-door style Store1920 already stores on `waslah.emxTrackingNumber`).

#### Masters

```http
GET https://masters.epservices.ae/locations/api/Countries
GET https://masters-stg.epservices.ae/locations/api/Emirates
GET https://masters-stg.epservices.ae/locations/api/Cities?CountryIsoCode=SA
```

#### Rate calculator

```http
POST https://osbstg-new.epservices.ae/ebs/genericapi/ratecalculator/rest/CalculatePriceRate
Content-Type: application/json
AccountNo: <EMX_RATE_ACCOUNT_NO>
Password: <EMX_RATE_PASSWORD>
```

Body shape from Postman:

```json
{
  "RateCalculationRequest": {
    "ShipmentType": "Express",
    "ServiceType": "Domestic",
    "OriginState": "",
    "OriginCity": 3,
    "DestinationCountry": 971,
    "DestinationState": "Dubai",
    "DestinationCity": "1",
    "Length": 1,
    "Width": 1,
    "Height": 1,
    "Weight": 1000,
    "CalculationCurrencyCode": "AED",
    "ContentTypeCode": "NonDocument",
    "DimensionUnit": "Centimetre",
    "WeightUnit": "Grams",
    "IsRegistered": "No",
    "ProductCode": "EPG-21"
  }
}
```

#### Planned Store1920 env (direct EMX)

```text
EMX_SHIPMENTS_BASE_URL=https://local-stg.epservices.ae
EMX_TRACKING_BASE_URL=https://api-stg.emx.ae
EMX_MASTERS_BASE_URL=https://masters-stg.epservices.ae
EMX_RATE_BASE_URL=https://osbstg-new.epservices.ae
EMX_SHIPMENTS_API_KEY=…
EMX_TRACKING_API_KEY=…
EMX_ACCOUNT_NUMBER=177122
EMX_RATE_ACCOUNT_NO=…
EMX_RATE_PASSWORD=…
```

(Exact names may be finalized when `lib/emx.js` / store routes are added.)

#### Waslah vs direct EMX

| Topic | Waslah → EMX (current live) | EMX direct (new) |
|-------|-----------------------------|------------------|
| Who we call | `gateway.waslah.ae` | `epservices.ae` / `emx.ae` |
| Create AWB | Waslah `POST /orders` | EMX `POST /api/Shipments/create` |
| Track | Waslah `POST /orders/history` | EMX `GET /tracking/api/Tracking` |
| Pickup cart | Waslah `/cart` + checkout | Not in this Postman set (confirm with EMX) |
| Auto-ship / crons today | Yes | Not yet |
| Store1920 client | `lib/waslah.js` | **To implement** |

---

### 4.1 Waslah → EMX (current primary in code)

| Item | Detail |
|------|--------|
| Client | `lib/waslah.js` |
| Tracking normalize | `lib/waslahTracking.js` |
| Ship / auto-ship | `lib/waslahShipmentService.js`, `lib/waslahAutoShipment.js`, `lib/waslahOrderMapper.js` |
| Labels | `lib/waslahEmxLabelPdf.js`, `lib/waslahReceipts.js` |
| Base URL | `WASLAH_API_BASE_URL` → default `https://gateway.waslah.ae/api/v1` (staging: `https://gateway-stg.waslah.ae/api/v1`) |
| Auth | `Authorization: Bearer ${WASLAH_API_TOKEN}` (token from [ship.waslah.ae](https://ship.waslah.ae)) |

#### External Seller API v1 (Waslah)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/orders` | Create shipment (service → EMX) |
| `POST` | `/cart` | Add order(s) to pickup cart |
| `POST` | `/cart/pickup-checkout` | Confirm pickup (`payment_method: credit_limit`) |
| `POST` | `/orders/print-receipt` | Label / receipt PDF |
| `POST` | `/orders/history` | Tracking events by `tracking_number` |
| `POST` | `/orders/cancel` | Cancel by order ids / tracking ids |
| `GET` | `/orders/{id}` | Fetch Waslah order |
| `GET` | `/services`, `/addresses`, … | Services & sender addresses |

Official create → pickup → label → track → cancel flow is documented at the top of `lib/waslah.js`.

#### Store1920 routes (seller / system)

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/store/waslah/ship` | Create EMX shipment for an order |
| `POST` | `/api/store/waslah/pickup` | Request pickup |
| `POST` | `/api/store/waslah/cancel` | Cancel shipment |
| `POST` | `/api/store/waslah/print-receipts` | Print labels |
| `GET`/`POST` | `/api/store/waslah/carrier-label` | Carrier label |
| `POST` | `/api/store/waslah/sync-status` | Pull live status |
| `GET` | `/api/store/waslah/services` | List Waslah services |
| `GET` | `/api/store/waslah/senders` | List sender addresses |
| `GET` | `/api/store/waslah/status` | Config / health |
| `POST` | `/api/webhooks/waslah` | Waslah status webhook (`x-waslah-secret` / Bearer = `WASLAH_WEBHOOK_SECRET`) |

#### Crons (Vercel)

| Cron | Schedule | Role |
|------|----------|------|
| `/api/cron/waslah-auto-ship` | every 5 min | Auto-create EMX shipments when enrolled + `WASLAH_AUTO_SHIP_ENABLED` |
| `/api/cron/waslah-sync-status` | every 5 min | Poll Waslah `/orders/history` |
| `/api/cron/pickup-overdue-alert` | hourly | Email when pickup requested 24h+ and not picked up |

Auth: `Authorization: Bearer ${CRON_SECRET}`.

#### Key env vars

```text
WASLAH_API_BASE_URL=https://gateway.waslah.ae/api/v1
WASLAH_API_TOKEN=…
WASLAH_SENDER_ID=…
WASLAH_SERVICE_ID=…
WASLAH_PREFERRED_COURIER=EMX
WASLAH_AUTO_SHIP_ENABLED=false
WASLAH_WEBHOOK_SECRET=…
```

(Full list in `.env.example` under the Waslah block.)

---

### 4.2 C3Xpress (secondary)

| Item | Detail |
|------|--------|
| Client | `lib/c3xpress.js` |
| Base URL | `https://c3xapi.c3xpress.com/C3XService.svc` |
| Auth | Body credentials: `UserName`, `Password`, `AccountNo`, `Country` |

#### External C3X endpoints

| Endpoint | Purpose |
|----------|---------|
| `Tracking` | Track by AWB (`TrackingAWB`) |
| `TrackByReference` | Track by shipper reference |
| `CreateAirwayBill` | Create AWB |
| `AirwayBillPDFFormat` | Label PDF |
| `SchedulePickup` | Book pickup |
| `PickupTracking` | Track pickup booking |
| `RateFinder` | Rate quote |

#### Store1920 routes

| Route | Purpose |
|-------|---------|
| `/api/c3xpress/create-shipment` | Create AWB |
| `/api/c3xpress/track` | Track |
| `/api/c3xpress/pickup` | Schedule pickup |
| `/api/c3xpress/pdf` | Label PDF |
| `/api/c3xpress/rate` | Rate |

#### Key env vars

```text
C3X_USERNAME=…
C3X_PASSWORD=…
C3X_ACCOUNT_NO=…
C3X_COUNTRY=AE
C3X_PRODUCT=DOM
C3X_SERVICE_TYPE=NOR
C3X_PRODUCT_FALLBACKS=XPS,EXP,ECO
```

---

### 4.3 Delhivery (track / pickup / LTL)

#### B2C (`lib/delhivery.js`)

| Item | Detail |
|------|--------|
| Base | `https://track.delhivery.com` |
| Auth | `Authorization: Token ${DELHIVERY_API_TOKEN}` |

| External URL | Purpose |
|--------------|---------|
| `GET /c/api/pin-codes/json/?filter_codes=` | Pincode serviceability |
| `GET /api/dc/expected_tat?…` | Expected TAT |
| `GET /api/v1/packages/json/?waybill=` | Track package |
| `POST /api/cust/create/pickup` | Schedule pickup |
| `GET /api/cust/pickup/{id}` | Pickup status |
| `POST /api/cust/pickup/{id}/cancel` | Cancel pickup |

Store1920 also exposes `/api/delhivery/*` wrappers and `/api/store/send-to-delhivery` (marks order only — **create shipment TODO**, not a live Delhivery booking).

#### LTL freight console (`lib/delhiveryLtl.js`)

| Item | Detail |
|------|--------|
| Seller UI | `/store/courior` |
| Proxy | `POST /api/store/courior/proxy` |
| Base | `DELHIVERY_LTL_BASE_URL` (default **dev**: `https://ltl-clients-api-dev.delhivery.com`) |
| Auth | `POST /ums/login` → Bearer (`DELHIVERY_LTL_USERNAME` / `PASSWORD`) |

Used for freight estimate, pincode, manifest, LRN, pickup requests, labels — **not** the main B2C UAE fulfillment path.

---

## 5. Status at a glance

| Integration | Create shipment | Track | Pickup | Labels | Auto / cron | Live for UAE B2C? |
|-------------|-----------------|-------|--------|--------|-------------|-------------------|
| **EMX direct (EP Services)** | Documented (Postman) | Documented | Confirm with EMX | `printType: AWBOnly` | Not yet | **New — being implemented** |
| **Waslah → EMX** | Yes | Yes | Yes | Yes | Yes | **Yes (current primary)** |
| **C3Xpress** | Yes | Yes | Yes | Yes | No | Yes (secondary) |
| **Delhivery B2C** | Stub only | Yes | Yes | — | No | Track/pickup only |
| **Delhivery LTL** | Manifest / LRN tools | Via LTL APIs | Yes | Yes | No | Ops console (dev base by default) |

---

## 6. Related code map

```text
lib/waslah.js
lib/waslahTracking.js
lib/waslahShipmentService.js
lib/waslahAutoShipment.js
lib/waslahOrderMapper.js
lib/c3xpress.js
lib/delhivery.js
lib/delhiveryLtl.js
lib/orderTrackingLookup.js
models/Order.js
app/track-order/page.jsx
app/api/track-order/route.js
app/api/webhooks/waslah/route.js
app/api/store/waslah/*/route.js
app/api/c3xpress/*/route.js
app/api/delhivery/*/route.js
app/api/cron/waslah-auto-ship/route.js
app/api/cron/waslah-sync-status/route.js
app/api/cron/pickup-overdue-alert/route.js
app/store/courior/page.jsx
```

---

## 7. Quick answers

**Which courier do we use?**  
- **Today (live):** **EMX via Waslah** (primary), plus **C3Xpress**, and **Delhivery** for track/pickup (+ LTL console).  
- **New (implementing):** **EMX direct** via EP Services (`/api/Shipments/create`, tracking, masters, rate calculator) from the EMX Postman collection.

**Which APIs?**  
- **EMX direct** — `epservices.ae` / `emx.ae` (new)  
- Waslah Seller API v1 → EMX (current live path)  
- C3Xpress `C3XService.svc`  
- Delhivery track.delhivery.com (+ optional LTL clients API)
