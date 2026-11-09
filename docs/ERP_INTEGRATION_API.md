# Store1920 ERP Integration API

**Audience:** ERP dashboard developers  
**Style:** Same layout as [Zoho Inventory API](https://www.zoho.com/inventory/api/v1/introduction/) — overview, attributes, request example, response example  
**Base URL:** `https://www.store1920.com`  
**API root:** `https://www.store1920.com/api/erp`  
**Last updated:** 9 November 2026  
**Machine list:** [ERP_API_LIST.json](./ERP_API_LIST.json)

---

## Introduction

The Store1920 ERP API lets the warehouse / ERP dashboard do the same stock and catalog jobs that staff need on screen:

- Load the product catalog  
- Read **available** stock by warehouse location (for the “below 20” check)  
- Receive live stock changes when the website or app sells or returns  
- Add stock only after a verifier accepts a delivery  
- Resolve warehouse location codes that match the website  
- Sign staff in with real accounts (no shared pilot passwords)

This API follows REST principles. Every resource is a URL under the API root.

### API root endpoint

```text
https://www.store1920.com/api/erp
```

### Quick index

| # | Resource | Method | Endpoint | Required |
|---|----------|--------|----------|----------|
| 1 | Products | `GET` | `/api/erp/products` | Yes |
| 2 | Stock balances | `GET` | `/api/erp/stock` | Yes |
| 3 | Stock events | `POST` | `/api/erp/stock/events` | Yes |
| 4 | Accepted stock | `POST` | `/api/erp/stock/accepted` | Yes |
| 5 | Locations | `GET` | `/api/erp/locations` | Useful |
| 6 | Staff session | `POST` | `/api/erp/staff/session` | Useful |

---

## Overview

### HTTP methods

| Method | Usage |
|--------|--------|
| `GET` | Fetch products, stock, locations |
| `POST` | Create stock events, accepted stock, staff session |

### Headers

| Header | Type | Description | Example |
|--------|------|-------------|---------|
| `x-erp-key` | string | Server-to-server key. Must match Store1920 env `ERP_API_KEY`. Required on all ERP routes except staff login body exchange. | `5b3a…0975` |
| `Authorization` | string | `Bearer` staff token from Staff session. Required for **Add accepted stock**. | `Bearer eyJhbG…` |
| `Content-Type` | string | Use `application/json` on every `POST`. | `application/json` |
| `Idempotency-Key` | string | Optional extra client key. `eventId` / `receiptNumber` still win. | `client-req-001` |

### Auth modes

| Mode | How |
|------|-----|
| ERP key | Send `x-erp-key` |
| ERP key + staff | Send `x-erp-key` and `Authorization: Bearer …` |
| Staff session | `POST /api/erp/staff/session` with email + password → returns `token` + staff profile |

### Location codes

Locations are independent warehouses. The same SKU at Sharjah and Dubai is **two balances**. Never merge them.

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `locationCode` | string | Stable code shared by website and ERP | `SHJ_FULFILMENT` |
| `name` | string | Human label | `Sharjah fulfilment` |

| locationCode | name |
|--------------|------|
| `SHJ_FULFILMENT` | Sharjah fulfilment |
| `DXB_STAGING` | Dubai staging |

### Available quantity

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `available` | number | Units that **can be sold now** | `18` |

**Must not** be included in `available`:

- Reserved (held for open orders / checkout)  
- Damaged  
- Incoming purchase-order units (not yet verifier-accepted)

### Pagination

List endpoints support:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `limit` | number | Page size. Default `100`. Max `500`. | `100` |
| `cursor` | string | Opaque next-page token from the previous response | `eyJwYWdlIjoyfQ` |
| `updatedSince` | string | ISO-8601. Return rows changed at or after this time | `2026-11-01T00:00:00.000Z` |

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `nextCursor` | string \| null | Pass as `cursor` on the next call. `null` = last page | `null` |

### Response format

Success responses are JSON objects. Write endpoints also return:

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `ok` | boolean | Request accepted | `true` |
| `applied` | boolean | `true` if stock changed; `false` on idempotent replay | `true` |
| `duplicate` | boolean | `true` when the same idempotency key was seen before | `false` |

### Errors

```json
{
  "code": "UNAUTHORIZED",
  "error": "Unauthorized"
}
```

| HTTP | code (typical) | Description |
|------|----------------|-------------|
| `400` | `BAD_REQUEST` | Validation failed |
| `401` | `UNAUTHORIZED` | Missing or bad `x-erp-key` / token |
| `403` | `FORBIDDEN` | Authenticated but role not allowed |
| `404` | `NOT_FOUND` | Unknown SKU or location |
| `409` | `CONFLICT` | Same idempotency key with a different body |
| `422` | `UNPROCESSABLE` | Business rule failed (e.g. negative available) |
| `429` | `RATE_LIMITED` | Too many requests |
| `500` | `SERVER_ERROR` | Unexpected server error |
| `503` | `ERP_KEY_NOT_CONFIGURED` | `ERP_API_KEY` missing on Store1920 |

---

## Not a Store1920 API

These stay inside the ERP. Do **not** call Store1920 for them.

| Capability | Why it stays in ERP |
|------------|---------------------|
| Manager and Accounts approval | ERP workflow / permissions |
| Purchase orders and supplier prices | ERP purchasing master data |
| Goods receipts | ERP receiving UI |
| Receiver cannot verify their own delivery | ERP same-user block before calling Accepted stock |
| Email and WhatsApp links to the ERP record | ERP notification templates |

---

## Products

### Overview

Used to load the catalog that staff can monitor on the ERP dashboard.

**Endpoint:** `GET /api/erp/products`  
**Auth:** `x-erp-key`

### Attributes (product)

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `sku` | string | Stock keeping unit. Empty only if the product has no SKU. | `PDSB1062BU` |
| `productName` | string | English product name | `Fitness Band 2 Straps Included Soft Silicone` |
| `category` | string | Primary category name. Empty string if unset. | `Fitness Trackers` |
| `active` | boolean | `true` = sellable / not archived | `true` |
| `imageUrl` | string \| null | Absolute image URL when the website has one | `https://www.store1920.com/.../product.jpg` |

### Query parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `sku` | string | Exact SKU filter | `PDSB1062BU` |
| `active` | boolean | Filter by active flag | `true` |
| `q` | string | Search name or SKU | `fitness` |
| `limit` | number | Page size | `100` |
| `cursor` | string | Next page | |
| `updatedSince` | string | Changed since | `2026-11-01T00:00:00.000Z` |

### List products

Request example

```http
GET /api/erp/products?active=true&limit=100
x-erp-key: <ERP_API_KEY>
```

Response example

```json
{
  "code": 0,
  "message": "success",
  "products": [
    {
      "sku": "PDSB1062BU",
      "productName": "Fitness Band 2 Straps Included Soft Silicone",
      "category": "Fitness Trackers",
      "active": true,
      "imageUrl": "https://www.store1920.com/.../product.jpg"
    }
  ],
  "nextCursor": null
}
```

---

## Stock balances

### Overview

Used for the **“below 20”** check. Each row is one SKU at one location. Reserved, damaged, and incoming PO units are excluded from `available`.

**Endpoint:** `GET /api/erp/stock`  
**Auth:** `x-erp-key`

### Attributes (balance)

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `sku` | string | Stock keeping unit | `PDSB1062BU` |
| `locationCode` | string | Warehouse code | `SHJ_FULFILMENT` |
| `available` | number | Sellable units now | `18` |
| `updatedAt` | string | ISO-8601 UTC when this balance last changed | `2026-11-09T08:15:22.000Z` |

### Query parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `sku` | string | Filter by SKU | `PDSB1062BU` |
| `locationCode` | string | Filter by location | `SHJ_FULFILMENT` |
| `below` | number | Only balances with `available` less than this value | `20` |
| `limit` | number | Page size | `100` |
| `cursor` | string | Next page | |
| `updatedSince` | string | Changed since | `2026-11-01T00:00:00.000Z` |

### List stock balances

Request example

```http
GET /api/erp/stock?below=20
x-erp-key: <ERP_API_KEY>
```

Response example

```json
{
  "code": 0,
  "message": "success",
  "balances": [
    {
      "sku": "PDSB1062BU",
      "locationCode": "SHJ_FULFILMENT",
      "available": 18,
      "updatedAt": "2026-11-09T08:15:22.000Z"
    },
    {
      "sku": "PDSB1062BU",
      "locationCode": "DXB_STAGING",
      "available": 45,
      "updatedAt": "2026-11-09T07:01:10.000Z"
    }
  ],
  "nextCursor": null
}
```

**Notes**

- Missing row = no balance for that SKU + location. Do not invent stock.  
- Dashboard low-stock screen should call with `below=20`.

---

## Stock events

### Overview

Used when the website or the app sells or returns an item, so the ERP dashboard updates without a manual refresh.

**Endpoint:** `POST /api/erp/stock/events`  
**Auth:** `x-erp-key` (optional staff Bearer if a person posts an adjustment)

### Attributes (request)

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `eventId` | string | Unique id. Same id must not apply twice. | `evt_ord_A1B2C3_line_1_sale` |
| `sku` | string | Stock keeping unit | `PDSB1062BU` |
| `locationCode` | string | Warehouse code | `SHJ_FULFILMENT` |
| `available` | number | **New** available quantity after the change | `17` |
| `reason` | string | `sale` · `return` · `adjustment` | `sale` |
| `occurredAt` | string | Optional ISO-8601 time. Defaults to server time. | `2026-11-09T08:20:00.000Z` |
| `orderId` | string | Optional related order id | `69f0…` |
| `quantityDelta` | number | Optional signed change | `-1` |

### Attributes (response)

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `ok` | boolean | Request accepted | `true` |
| `applied` | boolean | Whether stock changed | `true` |
| `duplicate` | boolean | Replay of the same `eventId` | `false` |
| `balance` | object | Current balance after the call | see below |

### Create a stock event

Request example

```http
POST /api/erp/stock/events
x-erp-key: <ERP_API_KEY>
Content-Type: application/json
```

```json
{
  "eventId": "evt_ord_A1B2C3_line_1_sale",
  "sku": "PDSB1062BU",
  "locationCode": "SHJ_FULFILMENT",
  "available": 17,
  "reason": "sale",
  "occurredAt": "2026-11-09T08:20:00.000Z",
  "orderId": "optional-order-id",
  "quantityDelta": -1
}
```

Response example

```json
{
  "code": 0,
  "message": "success",
  "ok": true,
  "applied": true,
  "duplicate": false,
  "balance": {
    "sku": "PDSB1062BU",
    "locationCode": "SHJ_FULFILMENT",
    "available": 17,
    "updatedAt": "2026-11-09T08:20:00.000Z"
  }
}
```

**Idempotency**

| Case | Result |
|------|--------|
| First `eventId` | Apply → `applied: true` |
| Same `eventId` + same body | No change → `applied: false`, `duplicate: true` |
| Same `eventId` + different body | `409 CONFLICT` |

---

## Accepted stock

### Overview

Used **only after a verifier accepts a delivery**. Rejected or damaged units are not sent. Sending the same receipt number again must not add stock twice.

**Endpoint:** `POST /api/erp/stock/accepted`  
**Auth:** `x-erp-key` + `Authorization: Bearer <staff token>`

### Attributes (request)

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `sku` | string | Stock keeping unit | `ST4003` |
| `locationCode` | string | Where accepted units go | `SHJ_FULFILMENT` |
| `acceptedQuantity` | number | Accepted units only. Integer greater than 0. | `40` |
| `receiptNumber` | string | Goods receipt number. Idempotency key. | `GRN-2026-00412` |
| `purchaseOrderNumber` | string | Purchase order reference | `PO-2026-0088` |

### Attributes (response)

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `ok` | boolean | Request accepted | `true` |
| `applied` | boolean | Whether stock was increased | `true` |
| `duplicate` | boolean | Replay of the same `receiptNumber` | `false` |
| `balance` | object | Current balance after the call | see below |

### Add accepted stock

Request example

```http
POST /api/erp/stock/accepted
x-erp-key: <ERP_API_KEY>
Authorization: Bearer <staff token>
Content-Type: application/json
```

```json
{
  "sku": "ST4003",
  "locationCode": "SHJ_FULFILMENT",
  "acceptedQuantity": 40,
  "receiptNumber": "GRN-2026-00412",
  "purchaseOrderNumber": "PO-2026-0088"
}
```

Response example

```json
{
  "code": 0,
  "message": "success",
  "ok": true,
  "applied": true,
  "duplicate": false,
  "balance": {
    "sku": "ST4003",
    "locationCode": "SHJ_FULFILMENT",
    "available": 116,
    "updatedAt": "2026-11-09T09:00:00.000Z"
  }
}
```

**Idempotency**

| Case | Result |
|------|--------|
| First `receiptNumber` | Add stock → `applied: true` |
| Same `receiptNumber` + same body | No second add → `applied: false`, `duplicate: true` |
| Same `receiptNumber` + different SKU / qty / location | `409 CONFLICT` |

**Rules**

- Do not call for rejected or damaged units.  
- Incoming PO quantity becomes `available` only through this endpoint.  
- Receiver ≠ verifier is enforced in the ERP **before** this call.

---

## Locations

### Overview

Warehouse code and name so Sharjah fulfilment and Dubai staging match the website.

**Endpoint:** `GET /api/erp/locations`  
**Auth:** `x-erp-key`

### Attributes (location)

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `locationCode` | string | Code used on all stock APIs | `SHJ_FULFILMENT` |
| `name` | string | Display name | `Sharjah fulfilment` |
| `active` | boolean | Inactive locations must not receive new accepted stock | `true` |

### List locations

Request example

```http
GET /api/erp/locations
x-erp-key: <ERP_API_KEY>
```

Response example

```json
{
  "code": 0,
  "message": "success",
  "locations": [
    {
      "locationCode": "SHJ_FULFILMENT",
      "name": "Sharjah fulfilment",
      "active": true
    },
    {
      "locationCode": "DXB_STAGING",
      "name": "Dubai staging",
      "active": true
    }
  ]
}
```

---

## Staff session

### Overview

Replace pilot passwords. Each person needs an id, name, email, and role.

**Endpoint:** `POST /api/erp/staff/session`  
**Auth:** none on the body (rate-limited). Later staff writes use the returned token.

### Attributes (request)

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `email` | string | Staff email | `verifier@store1920.com` |
| `password` | string | Staff password | `••••••••` |

### Attributes (staff)

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `id` | string | Stable staff id | `uid_abc123` |
| `name` | string | Display name | `Sara Al Blooshi` |
| `email` | string | Email | `verifier@store1920.com` |
| `role` | string | One of the roles below | `Verifier` |

### Allowed roles

| role | Typical ERP use |
|------|-----------------|
| `Manager` | Approvals, overview |
| `Accounts` | Financial approval |
| `Procurement` | Purchase orders |
| `Receiving` | Goods receipt |
| `Verifier` | Accept delivery → call Accepted stock |
| `Admin` | Full ERP admin |
| `Management` | Executive view |

### Create staff session

Request example

```http
POST /api/erp/staff/session
Content-Type: application/json
```

```json
{
  "email": "verifier@store1920.com",
  "password": "••••••••"
}
```

Response example

```json
{
  "code": 0,
  "message": "success",
  "token": "<Firebase ID token or Store1920 session token>",
  "expiresAt": "2026-11-09T12:00:00.000Z",
  "staff": {
    "id": "uid_abc123",
    "name": "Sara Al Blooshi",
    "email": "verifier@store1920.com",
    "role": "Verifier"
  }
}
```

**Notes**

- Role checks for approvals and receiver≠verifier stay in the ERP.  
- Store1920 only identifies the person for attributed writes.

---

## Suggested dashboard flows

### Monitor catalog + low stock

1. `POST /api/erp/staff/session` — sign in  
2. `GET /api/erp/locations` — cache codes  
3. `GET /api/erp/products` — catalog grid  
4. `GET /api/erp/stock?below=20` — alert list  
5. Refresh on an interval, or apply live stock events into local cache  

### Sale / return (no manual refresh)

1. Customer buys or returns on website / app  
2. Store1920 posts `POST /api/erp/stock/events` with a unique `eventId`  
3. ERP upserts local balance from `available`  
4. If `available < 20`, show alert  

### Accepted delivery

1. Receiving creates goods receipt in the ERP  
2. A different user with role `Verifier` accepts  
3. ERP calls `POST /api/erp/stock/accepted` once per `receiptNumber`  
4. Rejected / damaged quantities never leave the ERP as accepted stock  

---

## Field checklist

### Product list

- [ ] `sku`  
- [ ] `productName`  
- [ ] `category`  
- [ ] `active`  
- [ ] `imageUrl` (if the website has one)  

### Available stock by location

- [ ] `sku`  
- [ ] `locationCode`  
- [ ] `available` (sellable now only)  
- [ ] `updatedAt`  
- [ ] Reserved / damaged / incoming PO excluded  
- [ ] Same SKU at Sharjah and Dubai = two balances  

### Stock change event

- [ ] `sku`  
- [ ] `locationCode`  
- [ ] `available` (new quantity)  
- [ ] `reason` (`sale` \| `return` \| `adjustment`)  
- [ ] `eventId` (idempotent)  

### Add accepted stock

- [ ] `sku`  
- [ ] `locationCode`  
- [ ] `acceptedQuantity`  
- [ ] `receiptNumber`  
- [ ] `purchaseOrderNumber`  
- [ ] Same receipt does not add stock twice  

### Location list

- [ ] `locationCode`  
- [ ] `name`  

### Staff sign-in

- [ ] `id`, `name`, `email`  
- [ ] `role` ∈ Manager, Accounts, Procurement, Receiving, Verifier, Admin, Management  
