# Mobile app — all created orders

API for the **warehouse / mobile app** to list every order created in the store, with the latest saved Waslah / EMX status.

Use this for the app’s order list. The pickup queue (`GET /api/warehouse/tracking?status=...`) is only a short working list and does not return every order.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/warehouse/orders` | All created orders, newest first, paginated |
| `GET /api/warehouse/tracking?q=` | One order by scan (AWB, order number, Waslah id) |
| `POST /api/warehouse/tracking/:orderId` | Force a live Waslah refresh for one order |

Related: [warehouse-tracking-api.md](./warehouse-tracking-api.md)

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Production | `https://store1920.com` |
| Local | `http://localhost:3000` |

---

## Auth

Use **one** of these on every request.

### A) Warehouse API key (recommended for the mobile app)

```http
x-warehouse-key: <WAREHOUSE_SCANNER_API_KEY>
```

Server env:

```env
WAREHOUSE_SCANNER_API_KEY=your-long-secret
WAREHOUSE_STORE_ID=yourStoreMongoId
```

### B) Seller Firebase token

```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

---

## List all created orders

```http
GET /api/warehouse/orders?page=1&limit=50
x-warehouse-key: <WAREHOUSE_SCANNER_API_KEY>
```

Orders are newest first (`createdAt`). Return-pickup clones are omitted. Trash and deleted orders are omitted.

### Query

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | Page number |
| `limit` | `50` | Page size, max `100` |
| `status` | all | Comma list, for example `PICKUP_REQUESTED,SHIPPED,DELIVERED` |
| `fromDate` | | `YYYY-MM-DD`, Dubai start of that day, filters `createdAt` |
| `toDate` | | `YYYY-MM-DD`, Dubai end of that day, filters `createdAt` |
| `q` | | Order number, EMX AWB (`1000…`), Waslah id, customer name, phone, or city |
| `shipment` | all orders | `waslah` or `created` = only orders already created in Waslah |
| `live` | `false` | `true` refreshes Waslah status for up to 20 orders on this page, oldest check first, then returns the updated rows |

### Examples

All created orders, first page:

```http
GET /api/warehouse/orders?page=1&limit=50
```

Only shipments created in Waslah, with a fresh status check:

```http
GET /api/warehouse/orders?shipment=waslah&live=true&page=1&limit=50
```

Orders created from 1 June 2026 through today:

```http
GET /api/warehouse/orders?fromDate=2026-06-01&toDate=2026-09-28&page=1&limit=50
```

One order number or AWB:

```http
GET /api/warehouse/orders?q=619716
GET /api/warehouse/orders?q=1000047297714
```

### Success (`200`)

```json
{
  "success": true,
  "mode": "orders",
  "page": 1,
  "limit": 50,
  "total": 11826,
  "totalPages": 237,
  "filters": {
    "status": null,
    "fromDate": null,
    "toDate": null,
    "q": null,
    "shipment": "waslah",
    "live": true
  },
  "liveSync": {
    "requested": true,
    "refreshed": 20
  },
  "orders": [
    {
      "orderId": "65f0123abc",
      "shortOrderNumber": "619716",
      "status": "SHIPPED",
      "courier": "EMX",
      "trackingNumber": "1000047297714",
      "emxTrackingNumber": "1000047297714",
      "waslahTrackingNumber": "62...",
      "trackingUrl": "https://www.emx.ae/all-services/track-a-package?trackingnumber=1000047297714",
      "labelReady": true,
      "labelDownloadCount": 1,
      "pickup": {
        "requested": true,
        "requestedAt": "2026-09-28T05:00:00.000Z",
        "date": "2026-09-28",
        "time": "09:00-21:00",
        "vehicle": "motorcycle"
      },
      "warehousePacking": {
        "packed": true,
        "packedAt": "2026-09-28T10:30:00.000Z"
      },
      "waslah": {
        "orderId": "waslah-order-id",
        "reference": "619716-R415390",
        "liveStatus": "SHIPPED",
        "currentStatus": "In Transit",
        "currentSubtag": "InTransit_001",
        "lastLocation": "Dubai",
        "lastEventAt": "2026-09-28T12:00:00.000Z",
        "lastStatusSyncAt": "2026-09-28T12:10:00.000Z",
        "events": []
      },
      "customer": {
        "name": "Ayman Hassan",
        "phone": "+971501234567",
        "email": null
      },
      "shippingAddress": {},
      "items": [
        { "name": "Product name", "quantity": 1, "sku": "SKU-1", "image": "https://..." }
      ],
      "paymentMethod": "COD",
      "total": 119,
      "currency": "AED",
      "createdAt": "2026-09-28T08:00:00.000Z",
      "updatedAt": "2026-09-28T12:10:00.000Z"
    }
  ]
}
```

### Fields the app should show

| Field | On screen |
|-------|-----------|
| `shortOrderNumber` | Order # |
| `status` | Store status (this is what the dashboard uses) |
| `waslah.liveStatus` | Latest courier status saved from Waslah |
| `waslah.currentStatus` | Waslah status text |
| `waslah.lastStatusSyncAt` | When that status was last checked |
| `emxTrackingNumber` | EMX AWB (`1000…`) |
| `customer.name` / `customer.phone` | Customer |
| `createdAt` | When the order was created |
| `items` | Product name, qty, image |

`status` and `waslah.liveStatus` can differ. `status` is the store order. `waslah.liveStatus` is the courier. A Waslah cancellation is kept on `waslah` and does not cancel `status`.

### Errors

| Status | Meaning |
|--------|---------|
| `401` | Missing or wrong `x-warehouse-key`, or invalid Firebase token |
| `400` | `fromDate` or `toDate` is not `YYYY-MM-DD` |
| `500` | Server could not load orders |

---

## Refresh one order from Waslah

When the user opens an order, force a live check:

```http
POST /api/warehouse/tracking/65f0123abc
x-warehouse-key: <WAREHOUSE_SCANNER_API_KEY>
```

Or scan:

```http
POST /api/warehouse/tracking
Content-Type: application/json
x-warehouse-key: <WAREHOUSE_SCANNER_API_KEY>

{ "q": "1000047297714", "live": true }
```

---

## App list flow

```
Open Orders screen
        ↓
GET /api/warehouse/orders?page=1&limit=50&shipment=waslah&live=true
        ↓
Show shortOrderNumber, status, waslah.liveStatus, AWB, customer, createdAt
        ↓
Scroll → page=2, page=3, …
        ↓
Tap one order
        ↓
POST /api/warehouse/tracking/:orderId
        ↓
Replace that row with the returned order
```

Pull-to-refresh should call the same list URL with `live=true`. That refreshes up to 20 of the oldest checks on the current page, then returns the page. It does not refresh every order in the store in one call.
