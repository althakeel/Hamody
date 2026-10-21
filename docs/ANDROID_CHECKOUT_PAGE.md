# Store1920 checkout — Android

Last updated: 14 October 2026  
Audience: Android app  
Website: `https://www.store1920.com/checkout`  
API root: `https://www.store1920.com/api`  
Web source: `app/(public)/checkout/CheckoutPageUI.jsx`

This file is the whole checkout screen: what to draw, which calls to make, how delivery and store pickup differ, and the body that places the order.

The top bar is [ANDROID_MOBILE_NAVBAR.md](./ANDROID_MOBILE_NAVBAR.md). The bottom tab bar is [FLUTTER_MOBILE_BOTTOM_BUTTON.md](./FLUTTER_MOBILE_BOTTOM_BUTTON.md). Hide the tab bar on this screen so the sticky pay button is the only bar at the bottom. Cart lines and prices match the cart the customer already built. Order fields after place are [ORDER_DETAILS.md](./ORDER_DETAILS.md). Route index is [MOBILE_APP_API.md](./MOBILE_APP_API.md) sections 5–7.

Send `Accept-Language: en` or `ar`. Arabic mirrors the screen (`dir="rtl"`). Signed-in calls send `Authorization: Bearer {firebaseIdToken}`. Guest place-order sends `isGuest: true` and no token.

Do not store card numbers. Card, Google Pay, Apple Pay, Tabby, and Tamara open a hosted page. The app never talks to Stripe, VaultsPay, Tabby, or Tamara webhooks.

An empty cart leaves checkout and opens the cart screen. Do not draw delivery or payment on an empty cart.

---

## 1. Calls when the screen opens

Run these together. A failed optional call must not take the screen down. Coupon and alert failures show an empty list or no banner.

| Call | Auth | Use |
|---|---|---|
| `GET /api/shipping` | Public | Delivery options, fees, and which payment methods are on |
| `GET /api/public/customer-pickup` | Public | Store pickup on or off, and the warehouse address |
| `GET /api/checkout-alert` | Public | Optional banner under the title |
| `GET /api/store-info` | Public | `store._id` for coupons |
| `GET /api/coupons?storeId={store._id}` | Public, Bearer when signed in | Coupon list. Skip if store id is missing |
| `GET /api/address` | Bearer | Saved addresses. Signed in only |
| `GET /api/wallet` | Bearer | Wallet coins. Signed in only, and only if the app wallet flag is on |
| `POST /api/products/batch` | Public | `{ "productIds": ["…"] }` for cart lines whose product is not already loaded |

`GET /api/shipping?storeId=` is optional. The website calls `GET /api/shipping` with no store id.

If `GET /api/public/customer-pickup` fails, treat pickup as **on** and use the address in section 5.

---

## 2. Phone layout

One column. Side padding **16** px. White background. Leave about **88** px under the last block so the sticky button does not cover the summary.

Order on the screen:

1. Title **Checkout**, **24** px, bold, `#111827`.
2. Checkout alert, when section 3 returns one.
3. **Your order** — up to **4** lines, then a dashed **+N** tile.
4. **Delivery method** — Deliver to you / Store pickup, then the shipping options or the pickup card.
5. Contact and address. Guest sees a sign-in card first.
6. **Payment methods**.
7. **Order summary** — coupon, lines, total.
8. Safe-checkout notes.
9. Sticky pay button, full width, fixed to the bottom.

| Piece | Size |
|---|---|
| Section title | **20** px, bold, `#111827` |
| Card radius | **12** |
| Choice card padding | **16** |
| Selected delivery / shipping card | Border **2** px `#0f172a`, fill `#f8fafc` |
| Selected store pickup card | Border **2** px `#d97706`, fill `#fffbeb` |
| Radio | **20** px |
| Sticky button | Full width, padding **16** vertical, radius **8**, **16** px horizontal. Amount on the start, label on the end |
| Sticky button color | `#dc2626` when the form can be submitted. `#d97706` when a required field or payment is still missing. `#9ca3af` while the request is in flight |
| Field | Radius **16**, border `#e2e8f0`, fill `#f8fafc`, focus border `#f59e0b` |
| Error field | Border `#f87171`, ring `#fee2e2` |

Prices use the same formatter as the rest of the app. Server amounts are AED. A zero fee prints **Free**.

---

## 3. Checkout alert

```http
GET /api/checkout-alert
```

```json
{
  "checkoutAlert": {
    "enabled": true,
    "title": "Delivery notice",
    "titleAr": "تنبيه التوصيل",
    "message": "…",
    "messageAr": "…",
    "showOnCheckout": true
  }
}
```

Draw the banner only when `enabled` is true, `showOnCheckout` is not false, and the message for the current language is not empty. Arabic uses `titleAr` and `messageAr` when those strings are not empty. Otherwise use `title` and `message`.

---

## 4. Your order

Each line comes from the local cart plus the product from `POST /api/products/batch`.

Show the image, name (`nameAr` when Arabic and that field is not empty), variant text, quantity, and line total. A free-gift line is marked as a gift and cannot be removed by itself.

| Piece | Rule |
|---|---|
| Preview | First **4** lines |
| More than 4 | Button **View all ({count})** and a dashed tile **+{hidden}**. Both open a sheet of every line |
| Last item | Minus on the last remaining product asks **Remove this item and leave checkout?** Confirm removes it and opens the cart |
| Out of stock | If every line is out of stock, block place order with that message |

Line total is the cart price times quantity, including bundle pricing already stored on the cart line.

---

## 5. Delivery or store pickup

```http
GET /api/public/customer-pickup
```

```json
{
  "enabled": true,
  "scope": "all",
  "skus": [],
  "address": "18 Maleha St - Warehouses Land - Industrial Area - Sharjah"
}
```

`scope` is `all`, `include`, or `exclude`. `skus` is an uppercase list. Pickup is one choice for the whole cart.

| `scope` | Show the pickup card when |
|---|---|
| `all` | `enabled` is not false |
| `include` | every cart line SKU (product or selected variant) is in `skus`. An empty list hides pickup |
| `exclude` | no cart line SKU is in `skus`. An empty list shows pickup for every product |

If the shopper already chose pickup and then the cart no longer matches, switch back to delivery. `POST /api/orders` rejects pickup for a cart that does not match.

Show the two choice cards only when that rule passes. When it does not, skip the choice cards and show delivery only.

| Card | Title | Hint |
|---|---|---|
| Delivery | Deliver to you | We bring it to your address |
| Store pickup | Store pickup | Collect it yourself. Shipping is free |

Default choice is **delivery**.

### Store pickup

When pickup is selected:

- Shipping fee is **0**. Hide the delivery-option list and the address form.
- Show the address from `address`. If that field is empty, use `18 Maleha St - Warehouses Land - Industrial Area - Sharjah`.
- Caption: collect from this warehouse.
- **View location** opens a centered sheet. The sheet stays inside the screen. The map is about **42%** of the screen height, at least **180** px, and **Close** stays visible. Map embed:

```
https://maps.google.com/maps?q=18%20Maleha%20St%20-%20Warehouses%20Land%20-%20Industrial%20Area%20-%20Sharjah&hl=en&z=16&output=embed
```

**Open in Maps** uses:

```
https://www.google.com/maps/search/?api=1&query=18%20Maleha%20St%20-%20Warehouses%20Land%20-%20Industrial%20Area%20-%20Sharjah
```

Encode `address` the same way when the API string differs.

Guest pickup needs full name, email, and phone only. Signed-in pickup needs a valid phone. If the account has no phone, show one phone field. Do not ask for street, emirate, or area.

The warehouse fields the server stores are:

| Field | Value |
|---|---|
| `street` | `18 Maleha St` |
| `district` | `Industrial Area` |
| `city` | `Sharjah` |
| `state` | `Sharjah` |
| `country` | `United Arab Emirates` |
| `zip` / `pincode` | empty |

On place order send:

```json
{
  "shippingFee": 0,
  "shippingMethod": "customer_pickup",
  "fulfillmentMode": "customer_pickup"
}
```

Copy those three fields onto `guestInfo` or `addressData` as well: `street`, `city`, `state`, `district`, `country`, `zip`. Keep the customer name, email, and phone.

Cash on Delivery is labeled **Cash on Pickup**. Subtitle: **Pay when you collect**. The stored `paymentMethod` stays `COD`.

### Delivery options

`GET /api/shipping` returns `setting`. Use `setting.shippingOptions` when it is a non-empty list. Otherwise the website builds options from the legacy flat-rate fields. Draw only options whose `enabled` is not false and whose `availableStates` is empty or contains the selected emirate or state.

Each row:

| Piece | Source |
|---|---|
| Name | `name` |
| Days | `estimatedDays`, fallback `3-5`. Label: Delivered in {days} days |
| Fee | Calculated in section 6. **Free** when the fee is 0 |
| Icon | Express when the name contains “express”. Otherwise a truck |
| Selected | `id` matches the chosen option |

Select the option with `isDefault`, or the first available option, when the emirate changes and the current id is no longer in the list.

If the list is empty, show: **No delivery options are available for the selected location.**

A `?` next to **Delivery method** shows: free standard delivery on a qualifying merchandise total of **AED 100** or more. Express, remote-area, and Cash on Delivery fees still show in the summary before place order.

If `setting.stateCharges` has a row whose `state` matches the selected emirate, show: **Shipping charge for {state}: {fee}**.

Send the chosen option id as `shippingMethod` (for example `standard` or `express`) and the calculated fee as `shippingFee`.

---

## 6. Shipping fee

Calculate on the device with the same rules as `lib/shipping.js`. Pickup short-circuits to **0**.

If `setting.enabled` is false, or there is no option, the fee is **0**.

Split the cart:

- A line with `freeShippingEligible: true` is free.
- When `enableProductSpecificFreeShipping` is true and `productSpecificFreeShippingMode` is `ORDER_LEVEL`, one eligible line makes the whole order’s base fee **0**.
- Otherwise only eligible lines are free. The fee is calculated on the other lines.
- When every line is eligible, the base fee is **0**. A Cash on Delivery fee can still be added.

Base fee from the selected option:

| `shippingType` | Fee |
|---|---|
| `FREE` | 0 |
| `FLAT_RATE` | `flatRate` |
| `PER_ITEM` | `perItemFee` × total quantity, then capped by `maxItemFee` when that field is set |
| `WEIGHT_BASED` | `baseWeightFee` up to `baseWeight`. Each extra weight unit adds `additionalWeightFee` |

Then:

1. Standard flat rate becomes **0** when the chargeable merchandise subtotal is **100 AED or more**, the option is not express (`id` is not `express` and the name does not contain “express”), and this emirate has no `stateCharges` row.
2. If this emirate has a `stateCharges` row, that row’s `fee` **replaces** the base fee.
3. When the selected payment is Cash on Delivery or Cash on Pickup, `enableCOD` is not false, and `codFee` is greater than 0, add `codFee`.

Card, Tabby, Tamara, VaultsPay, Google Pay, and Apple Pay do not add `codFee`. Recalculate when the payment method, emirate, option, or cart changes.

A free-shipping coupon sets the charged shipping to **0** and shows the old fee with a strikethrough.

---

## 7. Contact and address

### Guest

Blue card: **Checkout as guest**, with **Sign in** opening the existing sign-in screen.

**Step 1 — Contact**

| Field | Required |
|---|---|
| Full name | Yes |
| Email | Yes. Must contain `@` and a dot after it |
| Phone | Yes. Country code plus local number. Default code `+971` |

**Step 2 — Delivery address.** Hidden for store pickup.

| Field | When |
|---|---|
| Country | Default `United Arab Emirates` |
| Emirate | UAE. List: Abu Dhabi, Dubai, Sharjah, Ajman, Umm Al Quwain, Ras Al Khaimah, Fujairah |
| State | India uses the India state list. Any other country is a text field |
| Area | UAE, after an emirate is chosen. Searchable list for that emirate. The customer can type an area that is not in the list |
| District | India, after a state is chosen |
| Street | Always for delivery. Hint under the field |
| Pincode | India only. Exactly **6** digits. `000000` is invalid |

UAE delivery does not ask for a pincode.

Phone rules (`lib/phoneValidation.js`):

| Code | Valid local number |
|---|---|
| `+971` | 9 digits starting with `5` (`501234567`), or 10 digits starting with `05` (`0501234567`) |
| `+91`, `+92` | Exactly 10 digits |
| Other | 9 or 10 digits |

The country code is a separate control. A number that starts with `971` or `00971` while `+971` is selected is invalid. Tell the customer to start with `05` or `5`.

Alternate phone is optional. If it is filled, it uses the same rules.

### Signed in

Load `GET /api/address`. Select the first address when none is selected.

Show one address card: **Deliver to {NAME}**, then street, city, area, emirate. **Switch address** and tapping the card open the address sheet. **Add delivery address** when the list is empty.

`401` on the address call means the session expired. Show **Sign in again**.

If the saved UAE address has an emirate and no area, or the saved India address has a state and no district, block checkout and open the editor.

If the saved address and the account both have no valid phone, show a required phone field on a yellow card.

Store pickup hides this address card. Keep the phone field when the account has no valid phone.

Address create and edit use the existing address APIs:

| Method | Path |
|---|---|
| `POST` | `/api/address` |
| `PUT` | `/api/address/{id}` |
| `DELETE` | `/api/address/{id}` |

Body fields: `name`, `email`, `street`, `city`, `state`, `district`, `zip`, `country`, `phone`, `phoneCode`. Default `phoneCode` is `+971`.

---

## 8. Payment methods

Read enable flags and max amounts from `setting` on `GET /api/shipping`. A missing enable flag means the method is **on**. A max of `0` or missing means **no cap**. Hide a method when its enable flag is false, or when `total to pay` is above its max.

| App value | Enable field | Max field | `paymentMethod` sent |
|---|---|---|---|
| `cod` | `enableCOD` | `maxCODAmount` | `COD` |
| `card` | `enableCard` | `maxCardAmount` | `STRIPE` |
| `vaultspay` | `enableVaultsPay` | `maxVaultsPayAmount` | `VAULTSPAY` |
| `googlepay` | `enableVaultsPayGooglePay` and VaultsPay on | `maxVaultsPayAmount` | `VAULTSPAY` with `vaultsPayMethod: "googlepay"` |
| `applepay` | `enableVaultsPayApplePay` and VaultsPay on | `maxVaultsPayAmount` | `VAULTSPAY` with `vaultsPayMethod: "applepay"` |
| `tabby` | `enableTabby` | `maxTabbyAmount` | `TABBY` |
| `tamara` | `enableTamara` | `maxTamaraAmount` | `TAMARA` |
| `wallet` | App wallet flag, signed in, balance covers the total | — | `WALLET` |

Default selection is `cod` when that row is available.

| Row | Label | Notes |
|---|---|---|
| Card (Stripe) | Credit / debit card | Visa, Mastercard, Amex, Google Pay marks. Hosted Stripe page |
| VaultsPay card | Credit / debit card | Visa and Mastercard. Shown only when VaultsPay is on. Hosted VaultsPay page |
| Google Pay | Google Pay | Only inside VaultsPay |
| Apple Pay | Apple Pay | Only inside VaultsPay |
| Cash | **Cash on Delivery**, or **Cash on Pickup** when pickup is selected | Subtitle **Pay when you receive it** or **Pay when you collect**. If the total is over `maxCODAmount`, keep the row visible, disable it, and show `Max limit AED {max}` |
| Tamara | Split in up to 4 payments | Today’s amount is total ÷ 4. Then three interest-free payments. Accent `#f075a3` |
| Tabby | Split in up to 4 payments | Same four-way split. Accent `#3dbea3` |

A cart line that has `offerToken` is a personalized offer. Hide Cash on Delivery and show: **Cash on Delivery is not available for personalized offer products. Please use online payment.**

Guest, and no offer line: a green note that Cash on Delivery works without an account.

### Wallet

Show the wallet block only when the shopper is signed in, the app has wallet turned on, and `GET /api/wallet` returns `coins` greater than 0.

```json
{ "coins": 40, "rupeesValue": 40 }
```

One coin is 1 AED. The checkbox **Use wallet balance** starts checked.

Redeem amount is `min(floor(coins), floor(order total before wallet))`. Send it as `coinsToRedeem`.

When redeem amount equals the order total, hide the other payment rows and send `paymentMethod: "WALLET"`. The summary line is **Wallet applied** with a minus amount.

---

## 9. Coupon and summary

Coupons apply only when the selected payment is **card (Stripe)** or **Cash on Delivery / Cash on Pickup**. Disable Apply for Tabby, Tamara, VaultsPay, Google Pay, Apple Pay, and wallet, and say coupons are for card and cash only.

```http
POST /api/coupons
Content-Type: application/json
```

```json
{
  "code": "SAVE10",
  "storeId": "…",
  "orderTotal": 120,
  "userId": "firebase-uid-or-omit",
  "cartProductIds": ["…"]
}
```

`orderTotal` is the merchandise subtotal before shipping. `code` is uppercase.

Success is `valid: true` and `coupon.discountAmount`. `coupon.freeShipping: true` zeroes shipping. Show the code, the discount, **You save**, and **Remove**. A failed code shows `error` under the field and does not change the total. A network error shows **Failed to apply coupon** and leaves checkout on screen.

`GET /api/coupons?storeId=` fills **View {n} available coupons**. Tapping a code applies it with the same POST.

Summary rows, in order:

| Row | Amount |
|---|---|
| Subtotal | Sum of line totals |
| Coupon | Minus `discountAmount`, with the code |
| Shipping | Option name and days, or **Collect from the warehouse** for pickup. Fee or **Free** |
| Free-shipping coupon | Minus the shipping that was waived |
| Wallet | Minus redeem amount |
| **Total to pay** | Subtotal − coupon + shipping − wallet. Caption: prices include VAT |

Item count under the summary title is the sum of quantities.

---

## 10. Validation before place order

Tapping pay with missing fields opens a sheet: **Please complete these fields.** Each row scrolls to that field. The sticky button turns amber and the error is repeated above it.

| Situation | Required |
|---|---|
| Store pickup, guest | Name, valid email, valid phone, and a payment method when the total is above 0 |
| Store pickup, signed in | Valid phone, and a payment method when the total is above 0 |
| Delivery, signed in | A saved address with street and emirate or state. UAE also needs area. India also needs district and a 6-digit pincode |
| Delivery, guest | Name, email, phone, country, emirate or state, street. UAE area. India district and pincode |
| Any | Payment selected, and that method still enabled and under its max |

The pay label:

| Payment | Label |
|---|---|
| Cash, delivery | Pay by **Cash on Delivery** |
| Cash, pickup | Pay by **Cash on Pickup** |
| Stripe or VaultsPay card | Pay by **Card** |
| Google Pay / Apple Pay / Tabby / Tamara / Wallet | Pay by **{method}** |
| Nothing selected and total above 0 | Select a payment method |
| Wallet covers the total | Pay by **Wallet** |

While the request runs, the label is **Placing order** for cash and wallet, and **Redirecting to payment...** for hosted methods. Disable the button until the request finishes.

---

## 11. Place order

```http
POST /api/orders
Content-Type: application/json
Authorization: Bearer …    (signed in only)
```

Timeout about **45** seconds. Items:

```json
{
  "id": "productId",
  "quantity": 1,
  "variantOptions": { "Color": "Black", "bundleQty": 2 },
  "offerToken": "only-when-the-cart-line-has-one",
  "freeGift": {},
  "fbtMainProductId": "only-for-a-frequently-bought-together-add-on"
}
```

Omit `variantOptions`, `offerToken`, `freeGift`, and `fbtMainProductId` when the line does not have them. Drop lines with quantity 0.

Coupon object, only when a coupon is applied and the discount or free shipping is real:

```json
{
  "coupon": {
    "code": "SAVE10",
    "discountAmount": 10,
    "freeShipping": false,
    "shippingDiscount": 0,
    "title": "",
    "description": ""
  }
}
```

If the app stored an abandoned-cart recovery token, send `recoveryToken` with it.

### Signed-in delivery

```json
{
  "items": [{ "id": "…", "quantity": 1 }],
  "paymentMethod": "COD",
  "shippingFee": 0,
  "shippingMethod": "standard",
  "addressId": "…"
}
```

Use `addressData` instead of `addressId` when the account has no saved address and the form has street, city, state, and country.

### Guest delivery

```json
{
  "isGuest": true,
  "items": [{ "id": "…", "quantity": 1 }],
  "paymentMethod": "COD",
  "shippingFee": 15,
  "shippingMethod": "standard",
  "guestInfo": {
    "name": "Ali",
    "email": "ali@example.com",
    "phone": "501234567",
    "phoneCode": "+971",
    "street": "12 Example St",
    "city": "Dubai",
    "state": "Dubai",
    "district": "Al Barsha",
    "country": "United Arab Emirates",
    "pincode": ""
  }
}
```

`city` for UAE is the area (`district`) when city is empty.

### Store pickup

Same bodies, with `shippingFee: 0`, `shippingMethod: "customer_pickup"`, `fulfillmentMode: "customer_pickup"`, and the warehouse street, city, state, district, and country written into `guestInfo` or `addressData`. Guest pickup still sends name, email, and phone. Signed-in pickup can send `addressId` when one exists. The server replaces the shipping location with the warehouse and keeps the contact fields.

Partial wallet adds `coinsToRedeem` on any of these bodies. Full wallet uses `paymentMethod: "WALLET"`.

### What comes back

| Method | Success | App |
|---|---|---|
| `COD`, `WALLET` | `{ "orderId", "id", "total", "prepaidUpsellToken" }` | Section 12 |
| `STRIPE` | `{ "session": { "url" }, "orderId" }` | Open `session.url` |
| `VAULTSPAY`, `TABBY`, `TAMARA` | `{ "checkout_url", "orderId" }` | Open `checkout_url` |

VaultsPay also sends `vaultsPayMethod`: `card`, `googlepay`, or `applepay`. `paymentStatus` on hosted methods is `pending`.

After the hosted page returns to the app:

| Method | Call |
|---|---|
| Stripe | `POST /api/orders/verify-stripe` with `{ "orderId", "sessionId" }` |
| Tabby | `POST /api/orders/verify-tabby` with `{ "orderId" }` |
| Tamara | `POST /api/orders/verify-tamara` with `{ "orderId" }` |
| VaultsPay card, Google Pay, Apple Pay | `POST /api/orders/verify-vaultspay` with `{ "orderId" }`. Full steps: [VAULTSPAY_CHECKOUT.md](./VAULTSPAY_CHECKOUT.md) |
| Customer cancelled | `POST /api/payment-cancelled` with `{ "orderId", "reason" }` then open the failed screen |

Verified payment opens `/order-success?orderId={orderId}`. Failure opens `/order-failed?reason=…`.

If `POST /api/orders` fails with a message about pincode, phone, address, a missing field, or rate limit, stay on checkout and show the message. Any other failure opens the failed screen. **Too many requests** stays on checkout.

---

## 12. After Cash on Delivery

When the create response has an order id, payment was cash, and `autoEmxShipping` is not true:

If card payment is enabled and the order total is within `maxCardAmount`, show a sheet before success:

- Offer is **5%** of the order total (`orderTotal * 0.05`).
- **Pay now** calls `POST /api/orders/prepaid-upsell` with `{ "orderId", "prepaidUpsellToken" }`. Open `url` from the response. The 5% applies only after Stripe pays.
- **No thanks**, or a failed upsell call, opens `/order-success?orderId={orderId}`. The cash order stays placed.

If card is off or over the card max, open the success screen immediately.

On the success screen, a pickup order shows **Customer pickup chosen**, the full warehouse address, **View location**, **Open in Maps**, shipping **Store pickup · Free**, and for cash **Due when you collect**. Also show: for any location doubt, call toll-free **800 786 1920** (`tel:8007861920`).

---

## 13. Safe checkout block

Under the summary, a lock and **Safe & secure checkout**, then four lines: SSL encrypted, secure transactions, data protected, easy returns. A green lock card says card data is handled by the payment provider. Support line: toll-free **800 786 1920** and `support@store1920.com`.

---

## 14. What not to call

| Path | Why |
|---|---|
| `PUT /api/shipping` | Seller settings |
| `GET /api/store/settings` for this screen | Pickup for shoppers is `GET /api/public/customer-pickup` |
| Payment provider webhooks | Server only |
| `POST /api/razorpay/order` | Legacy. UAE checkout uses Stripe, VaultsPay, Tabby, Tamara, and cash |

`POST /api/abandoned-checkout` is the website’s drop-off heartbeat. The app can skip it. It is not required to place an order.
