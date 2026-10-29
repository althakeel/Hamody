# Store1920 app delivery address

Last updated: 28 October 2026  
Audience: Android and Flutter  
Website: `https://www.store1920.com/checkout`  
API root: `https://www.store1920.com/api`

This is the address for a delivery order. Store pickup does not use this address. Pickup still needs the customer name, email, and phone. Checkout payment calls are in [APP_CHECKOUT.md](./APP_CHECKOUT.md).

A signed-in customer sends a saved `addressId`, or `addressData` when nothing is saved. A guest sends `guestInfo` and `isGuest: true`. No Firebase token on a guest order.

---

## 1. Fields

| Field | JSON | Required for delivery |
|---|---|---|
| Full name | `name` | Yes |
| Email | `email` | Yes for a guest. Optional when the customer is signed in |
| Phone | `phone` | Yes. Digits only, without the country code |
| Country code | `phoneCode` | Yes. Default `+971` |
| Street | `street` | Yes. A guest may send this as `address` |
| Emirate or state | `state` | Yes |
| Area | `district` | Yes for the UAE and for India, once `state` is set |
| City | `city` | Yes. For the UAE, send the area when there is no separate city |
| Country | `country` | Yes. Default `United Arab Emirates` |
| Pincode | `zip` or `pincode` | Required for India. Leave it empty for the UAE |
| Alternate phone | `alternatePhone` | No |

UAE emirates for `state`:

- Abu Dhabi
- Dubai
- Sharjah
- Ajman
- Umm Al Quwain
- Ras Al Khaimah
- Fujairah

Countries and the matching `phoneCode`:

| Country | `phoneCode` |
|---|---|
| United Arab Emirates | `+971` |
| India | `+91` |
| Saudi Arabia | `+966` |
| Qatar | `+974` |
| Kuwait | `+965` |
| Bahrain | `+973` |
| Oman | `+968` |
| Pakistan | `+92` |

Changing the country clears the emirate, the area, and the pincode, and sets `phoneCode` from this table.

---

## 2. Phone

Send the local number only. Do not type `971` into `phone` when `phoneCode` is `+971`.

| `phoneCode` | Valid `phone` |
|---|---|
| `+971` | 9 digits starting with `5`, or 10 digits starting with `05`. Example `501234567` |
| `+91`, `+92` | Exactly 10 digits |
| Other codes in the table | 9 or 10 digits |

UAE hint: **Enter 9 or 10 digits starting with 05 or 5**.

---

## 3. Guest delivery

```http
POST https://www.store1920.com/api/orders
Content-Type: application/json
X-Store1920-Client: app
X-Store1920-Platform: android
```

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
    "city": "Al Barsha",
    "state": "Dubai",
    "district": "Al Barsha",
    "country": "United Arab Emirates",
    "pincode": ""
  }
}
```

`X-Store1920-Platform` is `ios` on iPhone. Send both app headers so the order is saved as an app order.

A missing guest field returns `400` `{ "error": "missing guest information", "missingFields": ["city"] }`.

| Missing | `missingFields` |
|---|---|
| No `guestInfo` | `guestInfo` |
| Name | `name` |
| Email | `email` |
| Phone | `phone` |
| Street | `address` |
| City | `city` |
| Emirate | `state` |
| Country | `country` |
| India pincode | `pincode` |

Street, city, emirate, or country still empty after that returns `{ "error": "shipping address required", "source": "guestInfo" }`.

India `pincode` is 6 digits and does not start with `0`. All zeros are rejected.

---

## 4. Signed-in delivery

Send the Firebase ID token. Use a saved address when the customer picked one:

```json
{
  "items": [{ "id": "productId", "quantity": 1 }],
  "paymentMethod": "COD",
  "shippingFee": 15,
  "shippingMethod": "standard",
  "addressId": "savedAddressId"
}
```

The saved address must already have street, city, emirate, and country. Load the list with `GET /api/address`. Saving and editing addresses is in [APP_ACCOUNT_PROFILE.md](./APP_ACCOUNT_PROFILE.md).

When nothing is saved, send `addressData` instead of `addressId`:

```json
{
  "addressData": {
    "name": "Ali Hassan",
    "phone": "501234567",
    "phoneCode": "+971",
    "street": "12 Example St",
    "city": "Al Barsha",
    "state": "Dubai",
    "district": "Al Barsha",
    "country": "United Arab Emirates"
  }
}
```

Empty street, city, emirate, or country returns `{ "error": "shipping address required", "source": "addressData" }`.

Save this address for later with `POST /api/address`. The body is `{ "address": { ...same fields } }`. UAE without an area returns **Please select your area to continue**. India without a district returns **Please select your district to continue**. India without a valid pincode returns **Please enter a valid 6-digit Indian pincode**.
