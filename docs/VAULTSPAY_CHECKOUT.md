# VaultsPay checkout — app

Last updated: 16 October 2026  
Audience: Android and Flutter  
Website checkout: `https://www.store1920.com/checkout`  
API root: `https://www.store1920.com/api`  
Web source: `lib/vaultsPay.js`, `app/api/orders/route.js`, `app/order-success/page.jsx`

This is the hosted card payment used at checkout. It covers **credit / debit card**, **Google Pay**, and **Apple Pay**. Stripe card is a different row and a different verify call. Cash, Tabby, Tamara, and wallet are in [ANDROID_CHECKOUT_PAGE.md](./ANDROID_CHECKOUT_PAGE.md).

The app never talks to VaultsPay. It does not send a card number, expiry, or CVV. It does not store a VaultsPay client id or secret. The server opens the hosted page and confirms the payment.

---

## 1. What the shopper sees

`GET /api/shipping` returns `setting`. A missing enable flag means the method is **on**. A max of `0` or missing means **no cap**. Hide a row when its enable flag is false, or when the total to pay is above its max.

| App row | Show when | `paymentMethod` | `vaultsPayMethod` |
|---|---|---|---|
| Credit / debit card | `enableVaultsPay` is not false | `VAULTSPAY` | `card` |
| Google Pay | VaultsPay is on and `enableVaultsPayGooglePay` is not false | `VAULTSPAY` | `googlepay` |
| Apple Pay | VaultsPay is on and `enableVaultsPayApplePay` is not false | `VAULTSPAY` | `applepay` |

All three use `maxVaultsPayAmount`. Labels:

| Row | Label |
|---|---|
| Card | Credit / debit card. Marks: Visa and Mastercard |
| Google Pay | Google Pay |
| Apple Pay | Apple Pay |

Stripe stays a separate **Credit / debit card** row when `enableCard` is not false. Do not merge Stripe and VaultsPay into one button.

Coupons apply only to Stripe card and cash. Leave Apply disabled on these three rows. Say coupons are for card and cash only.

The pay button label is **Pay by Card**, **Pay by Google Pay**, or **Pay by Apple Pay**. While `POST /api/orders` is running, the label is **Redirecting to payment...**.

---

## 2. Place the order

Same checkout body as [ANDROID_CHECKOUT_PAGE.md](./ANDROID_CHECKOUT_PAGE.md) section 11. Signed-in calls send `Authorization: Bearer {firebaseIdToken}`. Guest sends `isGuest: true` and no token.

```http
POST /api/orders
Content-Type: application/json
```

```json
{
  "items": [{ "id": "productId", "quantity": 1 }],
  "paymentMethod": "VAULTSPAY",
  "vaultsPayMethod": "card",
  "shippingFee": 15,
  "shippingMethod": "standard",
  "addressId": "…"
}
```

`vaultsPayMethod` is `card`, `googlepay`, or `applepay`. Omit it and the server uses `card`. Any other value is treated as `card`.

Guest delivery uses `guestInfo` instead of `addressId`. Store pickup uses `shippingFee: 0`, `shippingMethod: "customer_pickup"`, and `fulfillmentMode: "customer_pickup"`. A partial wallet adds `coinsToRedeem`. A wallet that covers the whole total uses `paymentMethod: "WALLET"` and does not open VaultsPay.

Success:

```json
{
  "checkout_url": "https://…",
  "orderId": "…"
}
```

Open `checkout_url` in a browser or in-app web view. Do not change the URL. Every hosted page expires after **30 minutes** (`expiryInSeconds: 1800`). The order stays unpaid until verify succeeds.

The return URL alone is not proof of payment. The order is paid only after `POST /api/orders/verify-vaultspay` returns `success: true`, or after the server webhook does the same check.

Every initialization request sends `https://www.store1920.com/api/vaultspay/callback` as `callBackUrl`. VaultsPay calls that endpoint when the transaction changes. The callback never trusts the posted status by itself; the server loads the authoritative transaction from VaultsPay before changing the order. A dedicated expiry sweep also checks due transactions every minute, marking an order failed shortly after the 30-minute expiry if VaultsPay still reports it as unpaid (`Initiated` or `Pending`). Provider-confirmed success always takes precedence.

### Errors from place order

Stay on checkout and show `error`.

| Status | Meaning |
|---|---|
| `400` | Method off, over the max, or the address / phone / cart is invalid. Typical text: `Card payment is not available for orders above AED {max}.` |
| `403` | `{ "error", "code": "FRAUD_BLOCKED" }`. Show `error` |
| `502` | VaultsPay did not start. Typical text: `Card payment is temporarily unavailable. Please try again.` or `Google Pay is not available right now.` |

Do not mark the cart paid on these responses.

---

## 3. Return from the hosted page

The server tells VaultsPay to send the shopper back to:

```
https://www.store1920.com/order-success?orderId={orderId}&vaultspay=1
```

Watch the web view for that URL. `orderId` is the id from `POST /api/orders`. Close the hosted page, then verify. Do not treat the redirect itself as paid.

If the shopper closes the page or lands on `/order-failed`, follow section 5.

---

## 4. Confirm the payment

```http
POST /api/orders/verify-vaultspay
Content-Type: application/json
```

```json
{ "orderId": "…" }
```

No Bearer token is required. Call this when the return URL contains `vaultspay=1` and the order is not already paid. The server asks VaultsPay for the transaction. It can wait a few seconds while the status is still pending.

| Result | App |
|---|---|
| `{ "success": true, "paymentVerified": true }` | Paid. Open the order success screen |
| `{ "success": true, "alreadyPaid": true }` | Already paid. Open the order success screen |
| `{ "success": false, "pending": true }` | Still pending. Stay on a waiting state and call verify again, or reload the order |
| `{ "success": false, "pending": true }` while the 30-minute checkout is still valid and VaultsPay says `Initiated` | Unpaid. Keep the order awaiting payment and do not fulfill it |
| `{ "success": false, "failed": true, "expired": true, "reason": "payment_expired" }` | Expired. Open the failed screen; the order remains unpaid |
| `{ "success": false, "failed": true, "reason": "payment_cancelled" }` | Cancelled. Open the failed screen |
| `{ "success": false, "failed": true, "reason": "payment_failed" }` | Declined. Open the failed screen |
| `{ "success": false, "reason": "amount_mismatch" }` or `currency_mismatch` or `reference_mismatch` | Do not show success. Leave the order unpaid |
| `400` `{ "error": "orderId is required" }` | Send the order id |
| `500` `{ "error": "Failed to verify card payment" }` | Retry verify. Do not mark paid |

Paid means `isPaid` is true or `paymentStatus` is `paid` on the order. Until then the order status stays awaiting payment.

Reload the order after a successful verify:

```http
GET /api/orders?orderId={orderId}
```

Use the signed-in token when the shopper is signed in. Guest success still uses the `orderId` from place order.

---

## 5. Cancel or close

If the shopper leaves the hosted page without a success return:

```http
POST /api/payment-cancelled
Content-Type: application/json
```

```json
{
  "orderId": "…",
  "reason": "Payment was not completed"
}
```

Read `result.reason` and `result.provider`.

| `result.reason` | App |
|---|---|
| `provider_payment_succeeded` and `result.provider` is `VAULTSPAY` | Money was taken. Open success and call verify |
| `order_already_paid` | Open success |
| `provider_payment_in_progress` | Do not show a hard failure yet. Call verify again |
| anything else | Failed screen. The unpaid order is cancelled and stock is returned |

The failed screen copy is: **Payment Failed**. **We couldn't process your payment. Your order was cancelled and has not been placed.**

---

## 6. Do not build these

| Do not | Why |
|---|---|
| Card form, card scan, or saved cards | Card data stays on the hosted page |
| VaultsPay auth, `clientId`, or `clientSecret` | Server only |
| `POST` to `vaultspay.com` from the app | Server only |
| Trust `checkout_url` query params as paid | Verify with section 4 |
| Call `/api/webhooks/vaultspay` or `/api/vaultspay/callback` | VaultsPay calls these. The app does not |
| Use `POST /api/orders/verify-stripe` for this row | Stripe and VaultsPay are separate |
| Apply a coupon on these rows | Coupons are Stripe card and cash only |
