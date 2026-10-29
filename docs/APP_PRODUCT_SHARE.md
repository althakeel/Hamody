# Store1920 app product share

Last updated: 27 October 2026  
Audience: Android and Flutter  
App screen: Product  
Website page: `/product/{slug}`

This is the share button on the product photo. It does not call an API. The phone builds the link and opens WhatsApp, Facebook, email, the copy action, or the system share sheet.

The product page APIs are in [ANDROID_PRODUCT_PAGE.md](./ANDROID_PRODUCT_PAGE.md). Referral sharing on the account screen is a different sheet. That one is in [APP_ACCOUNT_PROFILE.md](./APP_ACCOUNT_PROFILE.md).

---

## 1. Button

On the product image, bottom right, 12 px from the edges. A white circle, 26 by 26 px, with the share glyph. Accessible name: **Share to**. Arabic: **مشاركة إلى**.

Tap opens a bottom sheet. The dimmed page behind it is `black` at 45% opacity. Tap that dim, the close button, or the system back action to close the sheet. Closing also clears the copied state.

---

## 2. Sheet

```text
Share product with friend          [x]
Send this deal to friends & family

[ photo ]  BRAND
           Product name
           AED 109.90

              SHARE VIA
[ WhatsApp ] [ Facebook ] [ Gmail ] [ Copy ] [ More ]
```

| Text | English | Arabic |
|---|---|---|
| Title | Share product with friend | شارك المنتج مع صديق |
| Subtitle | Send this deal to friends & family | أرسل هذا العرض للأصدقاء والعائلة |
| Label above the buttons | SHARE VIA | شارك عبر |
| WhatsApp | Whatsapp | واتساب |
| Facebook | Facebook | فيسبوك |
| Gmail | Gmail | جيميل |
| Copy | Copy | نسخ |
| After copy | Copied! | تم النسخ |
| More | More | المزيد |

The preview card is a row: 80 by 80 photo, then brand, name, and price.

| Field | Source |
|---|---|
| Photo | Current product image. If it is missing or fails to load, use `https://store1920-images.s3.ap-south-1.amazonaws.com/uploads/placeholder.png` |
| Brand | Product brand. If the product has no brand, the store name. Uppercase, blue `#2563EB`, 11 px. Hide the line when both are empty |
| Name | Product name, two lines |
| Price | Current unit sale price. English is `AED 109.90`. Red `#E52721`, 22 px. Hide the price when it is empty |

The price is the unit sale price, not the line total after the customer changes quantity.

---

## 3. Link and text

```text
https://www.store1920.com/product/{slug}
```

Share that product URL. If the open page has a query string, keep it, so the friend opens the same variant.

```text
Check out {product name}
```

If the name is empty, the text is **Check out this product**.

| Button | Opens | Closes the sheet |
|---|---|---|
| WhatsApp | `https://wa.me/?text={Check out {name} {url}}` | Yes |
| Facebook | `https://www.facebook.com/sharer/sharer.php?u={url}` | Yes |
| Gmail | `mailto:?subject={product name}&body={Check out {name}}` then a new line and the URL | Yes |
| Copy | Copies the URL only | After 1.4 seconds, once the label has changed to **Copied!** |
| More | System share sheet: title is the product name, text is `Check out {name}`, url is the product URL | Yes, after the system sheet returns |

Encode the text and the URL before putting them in the WhatsApp, Facebook, and mailto links.

**More** uses the phone share sheet (`ACTION_SEND` on Android, `Share` on iOS). If that sheet is not available, copy the URL the same way as **Copy**. If the customer cancels the system sheet, leave this sheet open.

Copy failure stays on this sheet. Do not show **Copied!**.

Each tile is 60 by 60 px, corner radius 20 px.

| Tile | Color |
|---|---|
| WhatsApp | `#25D366` |
| Facebook | `#1877F2` |
| Gmail | white |
| Copy | `#E8EEF5`, then `#10B981` while it says **Copied!** |
| More | `#E8EEF5` |
