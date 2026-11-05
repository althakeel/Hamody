# Store1920 app checkout

Last updated: 27 October 2026  
Audience: Android and Flutter  
Website: `https://www.store1920.com/checkout`  
API root: `https://www.store1920.com/api`

This is the shopper checkout. Place the order with `POST /api/orders`. Do not call seller routes, and do not talk to VaultsPay, Stripe, Tabby, or Tamara from the app.

Screen layout and field sizes are in [ANDROID_CHECKOUT_PAGE.md](./ANDROID_CHECKOUT_PAGE.md). Card, Apple Pay, and Google Pay return handling is also in [VAULTSPAY_CHECKOUT.md](./VAULTSPAY_CHECKOUT.md).

Signed-in calls send `Authorization: Bearer {Firebase ID token}`. A guest sends `isGuest: true` and no token. Send `Accept-Language: en` or `ar`.

Do not store a card number, expiry, or CVV. Card, Apple Pay, Google Pay, Tabby, and Tamara each open a hosted page. The return URL is not proof of payment.

An empty cart leaves checkout. Do not draw delivery or payment on an empty cart.

---

## 1. Calls when the screen opens

Run these together. A failed optional call must not take the screen down.

| Call | Auth | Use |
|---|---|---|
| `GET /api/shipping` | Public | Delivery options, fees, and which payment methods are on |
| `GET /api/public/customer-pickup` | Public | Store pickup on or off, and the warehouse address |
| `GET /api/checkout-alert` | Public | Optional banner under the title |
| `GET /api/store-info` | Public | `store._id` for the coupon list |
| `GET /api/coupons?storeId={store._id}` | Public. Bearer when signed in | Coupon list. Skip when the store id is missing |
| `GET /api/address` | Bearer | Saved addresses. Signed in only |
| `GET /api/wallet` | Bearer | Wallet coins. Signed in only, when the wallet flag is on |
| `POST /api/products/batch` | Public | `{ "productIds": ["…"] }` for cart lines that are not already loaded |

`GET /api/shipping?storeId=` is optional. The website calls `GET /api/shipping` with no store id.

If `GET /api/public/customer-pickup` fails, treat pickup as on.

---

## 2. Payment rows

`GET /api/shipping` returns `setting`. A missing enable flag means the method is **on**. A max of `0` or missing means **no cap**. Hide a row when its flag is false, or when the total to pay is above its max.

Apple Pay and Google Pay also hide when `enableVaultsPay` is false.

| App row | Show when | `paymentMethod` | Extra field |
|---|---|---|---|
| Cash on delivery | `enableCOD` is not false | `COD` | |
| Credit / debit card (Stripe) | `enableCard` is not false | `STRIPE` | |
| Visa / Mastercard | `enableVaultsPay` is not false | `VAULTSPAY` | `"vaultsPayMethod": "card"` |
| Apple Pay | VaultsPay is on and `enableVaultsPayApplePay` is not false | `VAULTSPAY` | `"vaultsPayMethod": "applepay"` |
| Google Pay | VaultsPay is on and `enableVaultsPayGooglePay` is not false | `VAULTSPAY` | `"vaultsPayMethod": "googlepay"` |
| Tabby | `enableTabby` is not false | `TABBY` | |
| Tamara | `enableTamara` is not false | `TAMARA` | |
| Wallet | Signed in, and coins cover the total | `WALLET` | |

| Cap field | Rows |
|---|---|
| `maxCODAmount` | Cash |
| `maxCardAmount` | Stripe card |
| `maxVaultsPayAmount` | Visa / Mastercard, Apple Pay, and Google Pay |
| `maxTabbyAmount` | Tabby |
| `maxTamaraAmount` | Tamara |

Visa / Mastercard, Apple Pay, and Google Pay are three separate rows. They are not one card button. Stripe stays its own card row. Do not merge Stripe with VaultsPay.

The pay button label is **Pay by Cash on Delivery**, **Pay by Card**, **Pay by Apple Pay**, **Pay by Google Pay**, **Pay by Tabby**, **Pay by Tamara**, or **Pay by Wallet**. Cash on pickup uses **Pay by Cash on Pickup**. While a hosted method is starting, the label is **Redirecting to payment...**.

---

## 3. Place the order

```http
POST https://www.store1920.com/api/orders
Content-Type: application/json
X-Store1920-Client: app
X-Store1920-Platform: android
```

Send both headers on every app checkout, including a guest order. `X-Store1920-Platform` is `android` or `ios`.

Without those headers the order is saved as a website order. The seller orders page then shows **Direct** and has no app badge. **Direct** is the marketing source. It does not mean the website.

Timeout about **45** seconds. Each item:

```json
{
  "id": "productId",
  "quantity": 1,
  "variantOptions": { "Color": "Black" },
  "offerToken": "only-when-the-cart-line-has-one",
  "freeGift": {},
  "fbtMainProductId": "only-for-a-frequently-bought-together-add-on"
}
```

Omit `variantOptions`, `offerToken`, `freeGift`, and `fbtMainProductId` when the line does not have them. Drop lines with quantity 0.

Send `coupon` only when a coupon is applied and the discount or free shipping is real:

```json
{
  "coupon": {
    "code": "SAVE10",
    "discountAmount": 10,
    "freeShipping": false,
    "shippingDiscount": 0
  }
}
```

If the app stored an abandoned-cart recovery token, send `recoveryToken` with it. A partial wallet adds `coinsToRedeem`. A wallet that covers the whole total uses `paymentMethod: "WALLET"`.

### Signed-in delivery

```json
{
  "items": [{ "id": "productId", "quantity": 1 }],
  "paymentMethod": "COD",
  "shippingFee": 15,
  "shippingMethod": "standard",
  "addressId": "savedAddressId"
}
```

Use `addressData` instead of `addressId` when the account has no saved address. `addressData` needs street, city, state, and country.

### Guest delivery

```json
{
  "isGuest": true,
  "items": [{ "id": "productId", "quantity": 1 }],
  "paymentMethod": "COD",
  "shippingFee": 15,
  "shippingMethod": "standard",
  "guestInfo": {
    "name": "Ali Hassan",
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

For UAE, `city` is the area when the city field is empty. Every delivery field is in [APP_DELIVERY_ADDRESS.md](./APP_DELIVERY_ADDRESS.md).

### Store pickup

Same body, with:

```json
{
  "shippingFee": 0,
  "shippingMethod": "customer_pickup",
  "fulfillmentMode": "customer_pickup"
}
```

Write the warehouse street, city, state, district, and country into `guestInfo` or `addressData`. Guest pickup still sends name, email, and phone. The server keeps the contact fields and replaces the shipping location with the warehouse.

### Visa / Mastercard

```json
{
  "items": [{ "id": "productId", "quantity": 1 }],
  "paymentMethod": "VAULTSPAY",
  "vaultsPayMethod": "card",
  "shippingFee": 15,
  "shippingMethod": "standard",
  "addressId": "savedAddressId"
}
```

### Apple Pay

Same body. Set `"vaultsPayMethod": "applepay"`.

### Google Pay

Same body. Set `"vaultsPayMethod": "googlepay"`.

`vaultsPayMethod` must be `card`, `applepay`, or `googlepay`. Omit it and the server uses `card`. Any other value is treated as `card`.

The server sends the order number, customer name, email, and phone to the payment page. The app does not send those as separate VaultsPay fields.

### Tabby and Tamara

```json
{
  "paymentMethod": "TABBY"
}
```

```json
{
  "paymentMethod": "TAMARA"
}
```

Use the same items, address, and shipping fields as cash. Do not send `vaultsPayMethod`.

---

## 4. What place order returns

| Method | Success body | App |
|---|---|---|
| `COD`, `WALLET` | `{ "orderId", "id", "total", "prepaidUpsellToken" }` | Open the order success screen. Cash may offer the card upsell in section 6 |
| `STRIPE` | `{ "session": { "url" }, "orderId" }` | Open `session.url` |
| `VAULTSPAY` | `{ "checkout_url", "orderId" }` | Open `checkout_url` |
| `TABBY`, `TAMARA` | `{ "checkout_url", "orderId" }` | Open `checkout_url` |

Open the hosted URL in a browser or in-app web view. Do not change it. Every VaultsPay page expires after **30 minutes** (`expiryInSeconds: 1800`). The order stays unpaid until verify succeeds.

The server includes `https://www.store1920.com/api/vaultspay/callback` as `callBackUrl` on every VaultsPay initialization. The callback confirms the authoritative transaction with VaultsPay before it changes the order; the callback payload alone is not proof of payment.

The callback handles provider updates as they arrive. A separate expiry check runs every minute and marks still-unpaid VaultsPay orders failed shortly after the 30-minute checkout expiry. Provider-confirmed success always takes precedence.

Stay on checkout and show `error` when place order fails.

| Status | Meaning |
|---|---|
| `400` | Missing details, method off, over the max, or the address / phone / cart is invalid |
| `403` | `{ "error", "code": "FRAUD_BLOCKED" }`. Show `error` |
| `429` | Too many requests. Stay on checkout |
| `502` | The hosted page did not start. Typical text: `Card payment is temporarily unavailable. Please try again.` or `Apple Pay is not available right now.` |

Do not mark the cart paid on these responses.

---

## 5. After the hosted page

Watch the web view for the return URL. `orderId` is the id from `POST /api/orders`. Close the hosted page, then verify. Do not treat the redirect itself as paid.

| Method | Return URL | Verify |
|---|---|---|
| Visa / Mastercard, Apple Pay, Google Pay | `/order-success?orderId={orderId}&vaultspay=1` | `POST /api/orders/verify-vaultspay` `{ "orderId" }` |
| Stripe | `/order-success?orderId={orderId}` | `POST /api/orders/verify-stripe` `{ "orderId", "sessionId" }` |
| Tabby | `/order-success?orderId={orderId}&tabby=1` | `POST /api/orders/verify-tabby` `{ "orderId" }` |
| Tamara | `/order-success?orderId={orderId}&tamara=1` | `POST /api/orders/verify-tamara` `{ "orderId" }` |

Verify calls do not need a Bearer token.

VaultsPay verify:

| Result | App |
|---|---|
| `{ "success": true, "paymentVerified": true }` | Paid. Open success |
| `{ "success": true, "alreadyPaid": true }` | Already paid. Open success |
| `{ "success": false, "pending": true }` | Still pending. Call verify again |
| `{ "success": false, "pending": true }` while VaultsPay says `Initiated` | Unpaid. Keep waiting; do not fulfill the order |
| `{ "success": false, "failed": true, "expired": true, "reason": "payment_expired" }` | Expired and unpaid. Open the failed screen |
| `{ "success": false, "failed": true }` | Declined or cancelled. Open the failed screen |
| `{ "success": false, "reason": "amount_mismatch" }` | Do not show success. Leave the order unpaid |
| `500` `{ "error": "Failed to verify card payment" }` | Retry verify. Do not mark paid |

Paid means `isPaid` is true or `paymentStatus` is `PAID`. Until then the order stays awaiting payment.

Reload the order after a successful verify:

```http
GET /api/orders?orderId={orderId}
```

Use the signed-in token when the shopper is signed in. `paymentScheme` is `Apple Pay`, `Google Pay`, or `Card` for a VaultsPay order. Visa or Mastercard can replace `Card` after the bank confirms the brand. The app never reads the card number.

If the shopper closes the hosted page or lands on `/order-failed`:

```http
POST /api/payment-cancelled
Content-Type: application/json
```

```json
{
  "orderId": "orderId",
  "reason": "Payment was not completed"
}
```

| `result.reason` | App |
|---|---|
| `provider_payment_succeeded` | Money was taken. Open success and call verify |
| `order_already_paid` | Open success |
| `provider_payment_in_progress` | Do not show a hard failure yet. Call verify again |
| anything else | Failed screen. The unpaid order is cancelled and stock is returned |

Failed screen copy: **Payment Failed**. **We couldn't process your payment. Your order was cancelled and has not been placed.**

---

## 6. After cash on delivery

When the create response has an order id, payment was cash, and `autoEmxShipping` is not true:

If Stripe card is enabled and the total is within `maxCardAmount`, show a sheet before success.

- The offer is **5%** of the order total.
- **Pay now** calls `POST /api/orders/prepaid-upsell` with `{ "orderId", "prepaidUpsellToken" }`. Open `url` from the response. The discount applies only after Stripe pays.
- **No thanks**, or a failed upsell call, opens `/order-success?orderId={orderId}`. The cash order stays placed.

If card is off or over the card max, open the success screen immediately.

A pickup order shows **Customer pickup chosen**, the warehouse address, and for cash **Due when you collect**. Support line: toll-free **800 786 1920**.

---

## 7. Do not call these

| Path | Why |
|---|---|
| `POST /api/store/orders/{orderId}/payment-link` | Seller dashboard. Staff send a pay link for an existing order |
| `POST /api/store/orders/{orderId}/vaultspay-link` | Seller dashboard |
| `PUT /api/shipping` | Seller settings |
| `GET /api/store/settings` | Pickup for shoppers is `GET /api/public/customer-pickup` |
| `/api/webhooks/vaultspay`, `/api/webhooks/tamara`, Tabby webhooks | The provider calls these. The app does not |
| `POST /api/razorpay/order` | Legacy. UAE checkout uses the methods in section 2 |

`POST /api/abandoned-checkout` is the website drop-off heartbeat. The app can skip it. It is not required to place an order.
