# Store1920 — Product data source for Google Merchant Center

**Store:** Store1920 (https://www.store1920.com)  
**Legal entity:** ALTHAKEEL GENERAL TRADING L.L.C  
**Country of sale:** United Arab Emirates (AE)  
**Currency:** AED  

Use this document when connecting products in Google Merchant Center.  
Do **not** use the storefront JSON APIs (`/api/products`, `/api/search-products`). Those are for the website. Google Merchant Center must fetch the **Google Shopping XML feed** below.

---

## 1. Which URL to add

| Field | Value |
|--------|--------|
| Data source name | `Store1920 Products` |
| Fetch method | **Scheduled fetch** (Google pulls the file) |
| File URL | `https://www.store1920.com/api/feeds/google-merchant` |
| File type | RSS 2.0 + Google Base namespace (`xmlns:g`) |
| Content-Type | `application/xml; charset=utf-8` |
| Suggested fetch | Daily (or every 6–12 hours) |
| Target country | United Arab Emirates |
| Language | English |

Open the URL in a browser to confirm it returns XML starting with:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
```

---

## 2. How to add it in Merchant Center

On the “Select how you want to add your products” screen:

1. Do **not** choose **Add products using API**. That is Google’s Merchant API (you push *to* Google). It is not a URL Google calls on our site.
2. Choose **Add products from a file** / **Scheduled fetch** (Google Sheets is also fine later; the file URL is preferred).
3. Paste:

```
https://www.store1920.com/api/feeds/google-merchant
```

4. Set country **United Arab Emirates** and fetch schedule.
5. Save. Google will download the feed and review products against policy.

---

## 3. What each product includes

Each `<item>` uses Google’s `g:` attributes:

| Attribute | Source |
|-----------|--------|
| `g:id` | Product SKU (or product id if SKU is empty) |
| `g:title` | Product name |
| `g:description` | Short description / description |
| `g:link` | HTTPS product page on store1920.com |
| `g:image_link` | Primary product image (HTTPS) |
| `g:availability` | `in_stock` or `out_of_stock` |
| `g:price` | Selling price in AED |
| `g:brand` | Product brand, or Store1920 |
| `g:condition` | `new` |
| `g:google_product_category` | Default Google category |
| `g:mpn` | SKU when present |
| `g:identifier_exists` | `yes` / `no` |
| `g:shipping` | Country `AE`, service Standard |

Only published catalog products with a title, landing URL, image, and price greater than 0 are included.

Optional query parameters (usually leave defaults):

| Param | Default | Meaning |
|-------|---------|---------|
| `inStockOnly=1` | in-stock only | Use `inStockOnly=0` to include out-of-stock items |
| `limit=5000` | 5000 | Max products in one fetch |

Example including out-of-stock:

```
https://www.store1920.com/api/feeds/google-merchant?inStockOnly=0
```

---

## 4. What not to give Google

These are **not** Merchant Center feeds:

| URL | Purpose |
|-----|---------|
| `https://www.store1920.com/api/products` | Website product list (JSON) |
| `https://www.store1920.com/api/products/by-slug?slug=…` | One product page (JSON) |
| `https://www.store1920.com/api/search-products?keyword=…` | Storefront search (JSON) |

Google cannot ingest those JSON endpoints as a product data source.

---

## 5. Business pages Google should also review

| Page | URL |
|------|-----|
| Business information | https://www.store1920.com/business-information |
| Contact | https://www.store1920.com/contact-us |
| Shipping | https://www.store1920.com/shipping-policy |
| Returns | https://www.store1920.com/return-policy |
| Privacy | https://www.store1920.com/privacy-policy |

---

## 6. Contact

- Email: support@store1920.com  
- Phone: 8007861920  
- Website: https://www.store1920.com  
