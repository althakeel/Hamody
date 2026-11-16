# HAMODY app support tickets

Last updated: 27 October 2026  
Audience: Android and Flutter  
App screen: Support tickets  
Website page: `/dashboard/tickets`

This screen is the customer’s tickets. It is not live chat. Every call needs the signed-in customer’s Firebase ID token.

```http
Authorization: Bearer {Firebase ID token}
```

Do not call `/api/store/tickets`. That route is the seller dashboard.

A missing or bad token is `401` `{ "error": "Unauthorized" }`. Show **Please sign in to access support.** The Retry button sends the list call again with a fresh token.

---

## 1. Screen

```text
Support tickets                         [+]
[ Search tickets ]
[ All ] [ Open ] [ In Progress ] [ Closed ]
```

| Control | What it does |
|---|---|
| Back | Previous screen |
| `+` | Create a ticket. `POST /api/tickets` |
| Search | Filter the loaded list on this phone. The API has no search parameter |
| All | Every ticket |
| Open | `status` is `open` |
| In Progress | `status` is `in-progress` |
| Closed | `status` is `closed` or `resolved` |

Load the list once, then filter and search on the device. Newest ticket first. The API already returns that order.

Empty list, after a successful load: no tickets yet. A `401` is the sign-in message, not an empty list.

One ticket opens `/dashboard/tickets/{ticketId}`.

---

## 2. List

```http
GET https://www.hamody.com/api/tickets
```

```json
{
  "success": true,
  "tickets": [
    {
      "_id": "6ae081d2a94db0144a11b64a",
      "subject": "Where is my order",
      "category": "Order Issue",
      "description": "Order: 620406\n\nIt still shows processing.",
      "status": "open",
      "priority": "normal",
      "orderId": null,
      "replies": [],
      "createdAt": "2026-10-27T10:49:54.453Z"
    }
  ]
}
```

Search matches `subject`, `description`, and `category`. It does not call the server again.

| `status` | Chip |
|---|---|
| `open` | Open |
| `in-progress` | In Progress |
| `resolved` | Closed |
| `closed` | Closed |

| `priority` | Label |
|---|---|
| `low` | Low |
| `normal` | Normal |
| `high` | High |
| `urgent` | Urgent |

---

## 3. Create

The `+` button.

```http
POST https://www.hamody.com/api/tickets
Content-Type: application/json
```

```json
{
  "subject": "Where is my order",
  "category": "Order Issue",
  "description": "Order: 620406\n\nIt still shows processing.",
  "priority": "normal"
}
```

| Field | Required | Values |
|---|---|---|
| `subject` | yes | Title |
| `category` | yes | `Order Issue`, `Product Question`, `Payment Issue`, `Account Issue`, `Return Request`, `Complaint`, `Other` |
| `description` | yes | First message |
| `priority` | no | `low`, `normal`, `high`, `urgent`. Default `normal` |
| `orderId` | no | Order document id, 24 hex characters |

A short order number such as `620406` is not an `orderId`. Leave `orderId` out and write `Order: 620406` at the start of `description`. Sending the short number as `orderId` returns `400`.

`201`:

```json
{
  "success": true,
  "message": "Ticket created successfully",
  "ticket": {}
}
```

Then load the list again.

| Status | When |
|---|---|
| `400` | Subject, category, or description is missing, the category is not in the list, or `orderId` is not a 24-character id |
| `401` | Not signed in |

New tickets are saved as `status: "open"`.

---

## 4. One ticket

```http
GET https://www.hamody.com/api/tickets/{ticketId}
```

`404` `{ "error": "Ticket not found" }` when the id is wrong or the ticket belongs to another customer.

| Field | Use |
|---|---|
| `_id` | Ticket id for the other calls |
| `subject` | Title |
| `category` | Issue type |
| `description` | First message |
| `status` | `open`, `in-progress`, `resolved`, `closed` |
| `priority` | `low`, `normal`, `high`, `urgent` |
| `orderId` | Present only when an order id was saved |
| `replies` | Later messages |
| `createdAt` | Opened at |
| `lastReplyAt` | Last reply. Omitted until the first reply |
| `closedAt` | Set when the ticket is closed |

Each reply:

| Field | Use |
|---|---|
| `message` | Text |
| `sender` | `user` is the customer. `admin` is the store |
| `senderName` | Name on that message |
| `createdAt` | When it was sent |

Draw `description` first, then `replies` in order.

---

## 5. Reply

```http
POST https://www.hamody.com/api/tickets/{ticketId}
Content-Type: application/json
```

```json
{ "message": "Any update?" }
```

`400` `{ "error": "Message is required" }` when `message` is missing.

A reply on a `closed` or `resolved` ticket sets `status` back to `open`.

There is no socket. When the customer opens the ticket, call `GET` again so a store reply is on screen.

---

## 6. Close

```http
PATCH https://www.hamody.com/api/tickets/{ticketId}
Content-Type: application/json
```

```json
{ "status": "closed" }
```

The customer action is close. Do not send `in-progress`. Allowed values are `open`, `in-progress`, `resolved`, and `closed`. `closed` also sets `closedAt`.

---

## 7. Checklist

- Support tickets need a signed-in customer. `401` shows “Please sign in to access support.”
- `GET /api/tickets` is the list. Filter All, Open, In Progress, and Closed on the phone.
- Search stays on the phone. Do not add a search query.
- `+` is `POST /api/tickets`.
- A thread is `GET` and `POST` on `/api/tickets/{ticketId}`.
- A short order number goes in `description`, not in `orderId`.
- Close is `PATCH` with `{ "status": "closed" }`.
- Do not call `/api/store/tickets`.
