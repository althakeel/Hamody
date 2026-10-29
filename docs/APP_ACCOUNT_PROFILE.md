# Store1920 app account profile

Last updated: 28 October 2026  
Audience: Android and Flutter  
App screens: Profile and Account Settings  
Website pages: `/dashboard/profile` and `/settings`  
API root: `https://www.store1920.com/api`

The bottom menu Account item opens the profile. Path: `/dashboard/profile`. Account Settings is a second screen. Path: `/settings`.

Profile calls, saved addresses, referral, photo upload, and delete account need the Firebase ID token. Email preferences use the signed-in email and do not send the token.

```http
Authorization: Bearer {Firebase ID token}
```

A missing or bad token is `401`. Show **Please sign in to view your profile.** Do not draw an empty profile.

Do not call `/api/store/profile`. That route is the seller dashboard.

Sign-in, Google, OTP, and password reset are in [APP_AUTH.md](./APP_AUTH.md). A guest can still place an order from the app. That is section 7. Account Settings is section 6. Orders, wishlist, and tickets are in section 8.

---

## 1. Screen

```text
Your Profile                         [Edit]
[ photo ]  Name
           Email
           Phone
           Account created

Invite & Earn
Your referral code          [Copy]
[ WhatsApp ] [ Telegram ] [ X ] [ Facebook ] [ Copy link ]
Apply referral code         [Apply]

Edit Profile                         Saved addresses          [Add new]
Display name                         Name
Phone                                Street, area, emirate
Photo                                Country
[ Save ] [ Cancel ]                  Phone
                                     [Edit] [Delete]
```

Open the screen and run these together:

| Call | Use |
|---|---|
| Firebase current user | Name, email, photo, account created date |
| `GET /api/profile` | Phone and referral status |
| `GET /api/referral/my-code` | The customer’s own code. This call creates the code when it is missing |
| `GET /api/address` | Saved addresses |

A failed referral or address call does not hide the profile card. Show the error on that block and keep the name and email.

---

## 2. Profile card

Name, email, photo, and account created come from the Firebase user, not from `GET /api/profile`.

| Row | Source | Empty |
|---|---|---|
| Photo | `photoURL` | Circle with the first letter of the name, else the email, else `U` |
| Name | `displayName` | No name set |
| Email | `email` | — |
| Phone | `profile.phone`, else Firebase `phoneNumber` | — |
| Account created | `metadata.creationTime` | — |

Email is read-only on this screen. Do not offer an email field.

```http
GET https://www.store1920.com/api/profile
```

```json
{
  "profile": {
    "name": "Sara Ali",
    "email": "sara@example.com",
    "phone": "501234567",
    "image": "https://cdn.example.com/profile-photos/photo.jpg",
    "referralCode": "",
    "referredByUserId": null,
    "referralRewardCreditedAt": null
  }
}
```

`referralCode` on this response can be empty. Use `GET /api/referral/my-code` for the code the customer shares.

---

## 3. Edit profile

Edit is closed until the customer taps **Edit**. Fields: display name, phone, photo. Phone max length on the website is 15. There is no country-code picker on this field.

Save writes Firebase and the store together.

1. `updateProfile` on the Firebase user with `displayName` and `photoURL`.
2. `PATCH /api/profile` with the same name, phone, image, and the current email.

```http
PATCH https://www.store1920.com/api/profile
Content-Type: application/json
```

```json
{
  "name": "Sara Ali",
  "phone": "501234567",
  "image": "https://cdn.example.com/profile-photos/photo.jpg",
  "email": "sara@example.com"
}
```

Success is `200` with the same `profile` object as GET. Show **Profile updated**.

Cancel closes the form and does not call the API.

### Photo

The customer picks an image under 5 MB. Larger files stay on the phone. Show **Image must be less than 5MB**.

```http
POST https://www.store1920.com/api/imagekit-auth/upload
Content-Type: multipart/form-data
```

| Part | Value |
|---|---|
| `file` | The image file |
| `folder` | `profile-photos` |

```json
{
  "url": "https://cdn.example.com/profile-photos/uid_photo.jpg",
  "fileId": "profile-photos/uid_photo.jpg",
  "name": "uid_1710000000000_photo.jpg"
}
```

After `url` comes back, set Firebase `photoURL` to that URL and `PATCH /api/profile` with `image` set to that URL. Show **Photo uploaded successfully**.

**Remove photo** sets Firebase `photoURL` to an empty string and `PATCH` with `"image": ""`. Show **Profile photo removed**.

`401` on upload is **Please sign in**. Any other upload failure is **Failed to upload photo**.

---

## 4. Invite and earn

Copy on the screen:

**Share your referral code. When your invited customer places their first order, you earn wallet reward.**

```http
GET https://www.store1920.com/api/referral/my-code
```

```json
{ "referralCode": "ABC123XY" }
```

While this call is in flight, show **Generating...**. If it fails, show **Not available** and disable Copy.

| Button | What it shares |
|---|---|
| Copy | The code only |
| Copy link | `https://www.store1920.com/?ref={code}` |
| WhatsApp | `Join and shop with my referral code {code}! {link}` |
| Telegram | Same sentence, link passed separately |
| X | Same sentence plus the link |
| Facebook | The link only |

Share link:

```text
https://www.store1920.com/?ref={referralCode}
```

### Apply a code

One code per account, and only before the first order. Uppercase the input before sending.

```http
POST https://www.store1920.com/api/referral/claim
Content-Type: application/json
```

```json
{ "referralCode": "FRIEND1" }
```

```json
{
  "success": true,
  "message": "Referral code applied successfully",
  "referredByUserId": "firebase-uid-of-inviter"
}
```

Hide the field after success. Show **Referral code already linked to this account.**

If `profile.referredByUserId` is already set when the screen opens, the field starts disabled with that same sentence.

If `profile.referralRewardCreditedAt` is set, show **Inviter reward credited on:** and the date. That date means the invited customer’s first order already paid the wallet reward. An empty date means the reward is still waiting.

| Status | `error` |
|---|---|
| 400 | `referralCode is required` |
| 400 | `You cannot use your own referral code` |
| 400 | `Referral code can only be applied before first purchase` |
| 404 | `Invalid referral code` |
| 409 | `Referral code already claimed for this account` |

Show the `error` string. While the request is in flight, the button reads **Applying...**.

---

## 5. Saved addresses

```http
GET https://www.store1920.com/api/address
```

```json
{
  "addresses": [
    {
      "_id": "66f0c1a2b3c4d5e6f7081920",
      "name": "Sara Ali",
      "email": "sara@example.com",
      "street": "12 Marina Walk",
      "city": "Dubai Marina",
      "state": "Dubai",
      "district": "Dubai Marina",
      "zip": "",
      "country": "United Arab Emirates",
      "phone": "501234567",
      "phoneCode": "+971"
    }
  ]
}
```

Newest first. Use `_id`. Some older rows may also have `id`; accept either.

Empty list: **No saved addresses yet.**

Each row shows name, then street, city, state, and zip, then country, then phone when it is present.

### Add and edit

```http
POST https://www.store1920.com/api/address
```

```json
{
  "address": {
    "name": "Sara Ali",
    "street": "12 Marina Walk",
    "city": "Dubai Marina",
    "state": "Dubai",
    "district": "Dubai Marina",
    "zip": "",
    "country": "United Arab Emirates",
    "phone": "501234567",
    "phoneCode": "+971"
  }
}
```

`201` returns `{ "message": "Address saved", "newAddress": { ... } }`. Put `newAddress` at the top of the list.

Edit uses the same body plus the id.

```http
PUT https://www.store1920.com/api/address
```

```json
{
  "id": "66f0c1a2b3c4d5e6f7081920",
  "address": { "name": "Sara Ali", "street": "14 Marina Walk" }
}
```

`200` returns `{ "message": "Address updated", "updated": { ... } }`. Replace that row.

Default country is **United Arab Emirates** and default `phoneCode` is `+971`.

Countries:

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

Changing country clears emirate, area, and zip, and sets `phoneCode` from the table.

| Field | Rule |
|---|---|
| `name` | Required. Label: Full name |
| `street` | Required |
| `state` | Required. UAE: one of Abu Dhabi, Dubai, Sharjah, Ajman, Umm Al Quwain, Ras Al Khaimah, Fujairah. India: the Indian state |
| `district` | Required for UAE (the area) and for India (the district) once `state` is set |
| `city` | Send the area, else the emirate. The website sets `city` from `district`, then `state` |
| `country` | Required |
| `phone` | Digits only, without the country code |
| `zip` | Required for India: 6 digits, not starting with 0. Optional for UAE. All zeros are rejected |
| `email` | Optional for a signed-in customer |

Phone rules, after stripping spaces and symbols:

| `phoneCode` | Valid number |
|---|---|
| `+971` | 9 digits starting with `5`, or 10 digits starting with `05` |
| `+91`, `+92` | Exactly 10 digits |
| Other codes in the table | 9 or 10 digits |

Do not let the customer type the country code into the number. `971501234567` with `+971` selected is invalid. UAE hint: **Enter 9 or 10 digits starting with 05 or 5**.

Server messages to show as-is:

| Message |
|---|
| `Please enter full name` |
| `Please enter street address` |
| `Please enter state / emirate` |
| `Please enter country` |
| `Please enter phone number` |
| `Please select your area to continue` |
| `Please select your district to continue` |
| `Please enter a valid 6-digit Indian pincode` |

### Delete

Ask **Delete this address?** before calling.

```http
DELETE https://www.store1920.com/api/address?id={addressId}
```

`200` is `{ "message": "Address deleted" }`. Remove the row. `404` is **Not found**.

`DELETE /api/address/{addressId}` does the same job. The website profile page uses the query form.

---

## 6. Account settings

Path: `/settings`. This is not the profile form. Name, phone, photo, referral, and addresses stay on `/dashboard/profile`.

A missing sign-in shows **Please sign in to access your account settings.**

```text
Account Settings

Email Preferences
[ ] Promotional Emails
    Receive special offers, deals, and discounts
[ ] Order Updates
    Status updates for your orders and shipments
[ ] Product Updates
    New products and important service announcements

Privacy
Control how your data is used and shared.
[ Manage Privacy Settings ]

Danger Zone
Permanently delete your account and all associated data.
[ Delete Account ]
```

**Manage Privacy Settings** does nothing on the website. Do not add a privacy screen for that button.

### Email preferences

Load with the signed-in email. No Firebase token on this call.

```http
GET https://www.store1920.com/api/email-preferences?email={email}
```

```json
{
  "success": true,
  "email": "sara@example.com",
  "preferences": {
    "promotional": true,
    "orders": true,
    "updates": true
  }
}
```

Each switch is on by default. Changing one switch sends that one type.

```http
POST https://www.store1920.com/api/email-preferences
Content-Type: application/json
```

```json
{
  "email": "sara@example.com",
  "type": "promotional",
  "value": false
}
```

`type` is `promotional`, `orders`, or `updates`. `value` is `true` or `false`.

Success text: **Email preferences updated successfully**.

| `type` | Label | Description |
|---|---|---|
| `promotional` | Promotional Emails | Receive special offers, deals, and discounts |
| `orders` | Order Updates | Status updates for your orders and shipments |
| `updates` | Product Updates | New products and important service announcements |

### Delete account

**Delete Account** opens a confirm dialog.

Title: **Confirm Account Deletion**.  
Text: **This will permanently delete your account and data. This action cannot be undone.**

The customer must type `DELETE` in capitals. Until that matches, the delete button stays disabled. Cancel closes the dialog and clears the field.

```http
POST https://www.store1920.com/api/account/delete
Authorization: Bearer {Firebase ID token}
```

No body. `401` is `{ "error": "Unauthorized" }`.

```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

Then sign out of Firebase and open the home screen. Show **Your account has been deleted successfully.**

This deletes the profile, addresses, orders, wallet, tickets, wishlist, browse history, recent searches, abandoned carts, return requests, and ratings for that customer. It cannot be undone.

If the data is removed and the Firebase user is not, the error is **Account data deleted, but authentication removal failed. Please contact support.**

---

## 7. Guest orders from the app

A guest can place an order without an account. The profile screen stays behind sign-in. Checkout does not.

The app sends the guest details on `POST /api/orders`. There is no Firebase token. Send `isGuest: true` and `guestInfo`. Also send the app headers so the order is saved as an app order:

```http
POST https://www.store1920.com/api/orders
Content-Type: application/json
X-Store1920-Client: app
X-Store1920-Platform: android
```

`X-Store1920-Platform` is `ios` on iPhone.

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

| Field | Required |
|---|---|
| `guestInfo.name` | Yes |
| `guestInfo.email` | Yes |
| `guestInfo.phone` | Yes. Digits only, without the country code |
| `guestInfo.phoneCode` | Yes. Default `+971` |
| `guestInfo.street`, `city`, `state`, `country` | Yes for delivery |
| `guestInfo.district` | Yes for UAE and India once the emirate or state is set |
| `guestInfo.pincode` | Required for India. Optional for UAE |

Store pickup still sends name, email, and phone. Payment methods are the same as a signed-in checkout. The full place-order bodies are in [APP_CHECKOUT.md](./APP_CHECKOUT.md).

The guest order does not appear on the profile until the customer signs in with the same email or the same phone. After sign-in or sign-up, the app calls:

```http
POST https://www.store1920.com/api/user/link-guest-orders
Authorization: Bearer {Firebase ID token}
Content-Type: application/json
```

```json
{
  "email": "ali@example.com",
  "phone": "+971501234567",
  "phoneNumber": "+971501234567"
}
```

```json
{
  "message": "Successfully linked 1 guest order(s) to your account",
  "linked": true,
  "count": 1
}
```

No match is `{ "message": "No guest orders found", "linked": false }`. That does not undo the sign-in. This call is not a button on the profile screen. Run it once after every successful sign-in.

---

## 8. Other account screens

These are not the profile form and not Account Settings.

| Screen | Path | API |
|---|---|---|
| Orders | `/dashboard/orders` | `GET /api/orders` |
| Wishlist | `/dashboard/wishlist` | `GET /api/wishlist` |
| Support tickets | `/dashboard/tickets` | [APP_SUPPORT_TICKETS.md](./APP_SUPPORT_TICKETS.md) |
| Checkout addresses | `/checkout` | The same `GET /api/address` list. See [APP_CHECKOUT.md](./APP_CHECKOUT.md) |
