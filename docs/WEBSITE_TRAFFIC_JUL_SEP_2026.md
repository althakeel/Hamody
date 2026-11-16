# HAMODY website performance

July, August, and September 2026

Prepared 22 October 2026 from the HAMODY database. Months run on Asia/Dubai time (midnight to midnight). Money is AED. This covers the public website. Orders typed in by staff on the store dashboard are left out of conversion, revenue, and retention.

## How each number is counted

**Sessions.** One website session is one `session_start` recorded by the storefront. This is the traffic total.

**Paid.** The landing address contains an ad marker: `utm_medium` of paid or paid_social, or a click id such as `fbclid` or `gclid`.

**Social.** Meta sends `fb` and `facebook` for Facebook, `ig` for Instagram, `an` for Audience Network, and `th` for Threads. In these three months that social traffic is paid social. Unpaid social was two Instagram visits in August and no orders.

**Organic.** A visit or order tagged as organic search (Google, Bing, or `utm_medium=organic` without an ad click). None were stored. Organic search that arrives with no tag sits in “source not recorded” and cannot be pulled out.

**Direct.** A visit stored with source `direct` and no ad click. None were stored. The same limit applies: a typed-in visit with no tag is inside “source not recorded”.

**Source not recorded.** The session landing address had no source, medium, or ad click. The site does not store the browser referrer on the session, so these sessions mix true direct visits, organic search, and any link that was not tagged.

**Ad visits.** A row in the ad log. This fires when a page opens with a saved campaign tag. One session can write more than one row, so ad visits are slightly higher than paid sessions. Use this table for Facebook versus Instagram, not as the traffic total.

**Website order.** An order placed on the site in that month, not cancelled, and not created by staff. Cash on delivery counts as an order when the customer places it. `isPaid` is not used, because cash orders stay unpaid until delivery.

**Conversion rate.** Website orders divided by sessions.

**Cart abandonment.** Checkout carts saved for that month that are still open or waiting for payment, divided by all checkout carts saved that month. A cart marked converted is not abandoned. This is the checkout cart, not a product-page add.

**Customer.** A registered account, or the guest email when there is no account. The same person is counted once in a month even with several orders. Cancelled orders and staff-created orders are not included.

**Returning customer.** The customer’s first website order was before the month.

**Repeat buyer.** The customer placed two or more website orders in that month.

**Customer retention rate.** Of the customers who placed a website order in the previous month, the share who placed another website order in this month. July uses June as the previous month. June itself is not a column in this report.

## Quarter at a glance

| | July | August | September | Jul–Sep |
| --- | ---: | ---: | ---: | ---: |
| Sessions | 41,818 | 27,654 | 26,775 | 96,247 |
| Page views | 65,604 | 39,588 | 42,824 | 148,016 |
| Website orders | 1,921 | 951 | 281 | 3,153 |
| Order value | 277,568 | 125,972 | 65,016 | 468,556 |
| Conversion | 4.59% | 3.44% | 1.05% | 3.28% |
| Checkout carts | 5,438 | 2,652 | 1,339 | 9,429 |
| Carts still abandoned | 65.54% | 66.44% | 64.90% | 65.70% |
| Customers | 1,613 | 842 | 267 | 2,691 |
| Customer retention rate | 3.73% | 1.55% | 0.24% | — |
| Repeat buyers in the month | 10.11% | 8.08% | 4.12% | 9.88% bought again in the quarter |

Staff also created 97 orders in July, 63 in August, and 25 in September. Those are outside this report. Cancelled website orders were 29, 35, and 102.

## 1. Traffic by source

### Sessions

| Source | July | August | September |
| --- | ---: | ---: | ---: |
| Paid (almost all paid social) | 35,646 | 22,456 | 14,271 |
| Organic search | 0 recorded | 0 recorded | 0 recorded |
| Direct | 0 recorded | 0 recorded | 0 recorded |
| Unpaid social | 0 | 2 Instagram visits in the ad log | 0 |
| Email | 0 | 0 | 36 sessions |
| Other tagged (ChatGPT, Gemini, and similar) | 9 | 30 | 60 |
| Source not recorded | 6,163 | 5,168 | 12,408 |
| **Sessions** | **41,818** | **27,654** | **26,775** |

Paid share of sessions: 85.24% in July, 81.20% in August, 53.30% in September. The untagged share rose from 14.74% to 46.34%.

Page views per session: 1.57 in July, 1.43 in August, 1.60 in September.

A handful of paid sessions used a Google click id (10 in July, 5 in September) or TikTok (2 in July, 1 in September). They are inside the paid row. No Google or TikTok order was stored in these months.

### Paid social visits in the ad log

| Platform | Code | July | August | September |
| --- | --- | ---: | ---: | ---: |
| Facebook | `fb`, `facebook`, `fb-sitelink` | 21,849 | 13,715 | 9,763 |
| Instagram | `ig` | 14,163 | 9,207 paid, plus 2 with medium social | 5,355 |
| Audience Network | `an` | 193 | 113 | 170 |
| Threads | `th` | 134 | 103 | 22 |
| TikTok | `tiktok` | 2 | 0 | 1 |
| **Visits in this table** | | **36,341** | **23,140** | **15,311** |

The two August Instagram visits with medium `social` are the only unpaid social visits in the quarter. Every other visit in this table has medium `paid` or `paid_social`.

Other ad-log rows, not paid social: ChatGPT 9 / 30 / 182, email 0 / 0 / 136 (newsletter 128, plus 8 other email tags), Gemini 1 in September.

### Orders by the same sources

| Source | July orders | July AED | August orders | August AED | September orders | September AED |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Facebook paid | 1,059 | 125,908.77 | 532 | 62,782.20 | 153 | 20,559.67 |
| Instagram paid | 533 | 63,270.55 | 277 | 41,136.88 | 69 | 30,516.94 |
| Threads paid | 6 | 1,195.80 | 2 | 99.80 | 0 | 0.00 |
| Audience Network paid | 2 | 538.00 | 1 | 109.90 | 0 | 0.00 |
| Source not recorded | 321 | 86,654.90 | 139 | 21,843.20 | 59 | 13,939.28 |
| **Website orders** | **1,921** | **277,568.02** | **951** | **125,971.98** | **281** | **65,015.89** |

Organic, unpaid social, and direct produced no orders.

Average order value: AED 144.49 in July, AED 132.46 in August, AED 231.37 in September.

### Largest campaign ids on orders

These are the campaign values stored on the order. They are Meta campaign ids.

| July | Orders | August | Orders | September | Orders |
| --- | ---: | --- | ---: | --- | ---: |
| 120244756692010299 | 239 | 120244756692010299 | 151 | 120244756692010299 | 45 |
| 120244876216310299 | 189 | 120233659048570299 | 94 | 120250707998330299 | 39 |
| 120249115102420299 | 138 | 120249115102420299 | 92 | 120233659048570299 | 35 |
| 120244707404080299 | 109 | 120249587072720299 | 78 | 120249587072720299 | 32 |
| 120233958352000299 | 86 | 120244707404080299 | 56 | 120250710257220299 | 31 |

Campaign `120244756692010299` is the largest in every month.

## 2. Conversion rate

Conversion is website orders divided by sessions.

| | July | August | September | Jul–Sep |
| --- | ---: | ---: | ---: | ---: |
| Sessions | 41,818 | 27,654 | 26,775 | 96,247 |
| Website orders | 1,921 | 951 | 281 | 3,153 |
| Conversion | 4.59% | 3.44% | 1.05% | 3.28% |

By the traffic that can be identified:

| | July | August | September |
| --- | ---: | ---: | ---: |
| Paid sessions | 35,646 | 22,456 | 14,271 |
| Paid orders | 1,600 | 812 | 222 |
| Paid conversion | 4.49% | 3.62% | 1.56% |
| Untagged sessions | 6,163 | 5,168 | 12,408 |
| Untagged orders | 321 | 139 | 59 |
| Untagged conversion | 5.21% | 2.69% | 0.48% |

Checkout starts recorded on the site: 5,911 in July, 3,505 in August, 1,812 in September. Purchase events recorded on the site: 1,742, 895, and 478. Purchase events are not the same as website orders, because a purchase event can fire more than once or miss an order. The conversion rate above uses orders.

How those orders were paid:

| Method | July | August | September |
| --- | ---: | ---: | ---: |
| Cash on delivery | 1,340 | 691 | 232 |
| Tabby | 376 | 166 | 0 |
| Tamara | 147 | 60 | 49 |
| Stripe | 55 | 27 | 0 |
| Card | 3 | 7 | 0 |

Cash on delivery was 69.8% of July orders, 72.7% of August orders, and 82.6% of September orders. September has no Tabby, Stripe, or card orders in the order record.

## 3. Cart abandonment

A checkout cart is saved when a customer reaches checkout and does not finish. Status `converted` means the cart was completed later. Status `active` is still open. Status `pending_payment` is waiting for payment. Open and pending carts are abandoned.

| | July | August | September | Jul–Sep |
| --- | ---: | ---: | ---: | ---: |
| Checkout carts | 5,438 | 2,652 | 1,339 | 9,429 |
| Converted | 1,874 | 890 | 470 | 3,234 |
| Still open | 3,413 | 1,692 | 853 | 5,958 |
| Pending payment | 151 | 70 | 16 | 237 |
| Abandoned carts | 3,564 | 1,762 | 869 | 6,195 |
| Abandonment rate | 65.54% | 66.44% | 64.90% | 65.70% |
| Value of abandoned carts | 491,859 | 501,741 | 405,826 | 1,399,426 |
| Value of converted carts | 230,828 | 105,012 | 121,211 | 457,051 |

The rate stayed near 65% in all three months. The number of carts fell with the number of orders.

September shows 470 converted carts and 281 website orders. A converted cart can belong to an order that was later cancelled, a staff recovery, or more than one cart for the same purchase. The abandonment rate uses the cart status stored on the cart.

A second view, from checkout events rather than saved carts: checkout starts that have no matching purchase event were 70.53% in July (5,911 starts, 1,742 purchase events), 74.47% in August (3,505 and 895), and 73.62% in September (1,812 and 478). Add-to-cart events are a thin sample (475, 150, and 592) and are not used for the rate.

## 4. Retention and repeat purchase

**Customer retention rate** is the share of last month’s customers who ordered again.

| | July | August | September |
| --- | ---: | ---: | ---: |
| Customers in the previous month | 751 (June) | 1,613 (July) | 842 (August) |
| Of those, ordered again this month | 28 | 25 | 2 |
| Customer retention rate | 3.73% | 1.55% | 0.24% |

July kept 28 of the 751 people who ordered in June. August kept 25 of the 1,613 July customers. September kept 2 of the 842 August customers.

Of the 1,613 July customers, 29 ordered again at any point in August or September (1.80%). That is wider than the August rate, because 4 of those 29 skipped August and ordered only in September.

| | July | August | September | Jul–Sep |
| --- | ---: | ---: | ---: | ---: |
| Customers with a website order | 1,613 | 842 | 267 | 2,691 |
| First order in this month | 1,537 | 794 | 249 | — |
| Already a customer before the month | 76 | 48 | 18 | — |
| Share already known | 4.71% | 5.70% | 6.74% | — |
| Bought 2 or more times in the month | 163 | 68 | 11 | — |
| Repeat purchase rate in the month | 10.11% | 8.08% | 4.12% | — |
| Bought in more than one of these months, or more than once in the quarter | — | — | — | 266 |
| Quarter repeat rate | — | — | — | 9.88% |

Most buyers in each month are new. The retention rate fell from 3.73% in July to 1.55% in August and 0.24% in September. About 1 in 10 July customers also ordered a second time inside July. That in-month repeat fell to about 1 in 12 in August and about 1 in 24 in September. Across the quarter, 266 of 2,691 customers (9.88%) either ordered twice or showed up in more than one month.

## What changed across the three months

Sessions fell from 41,818 in July to 26,775 in September. Paid sessions fell faster, from 35,646 to 14,271, while untagged sessions rose from 6,163 to 12,408.

Orders fell from 1,921 to 281, and conversion fell from 4.59% to 1.05%. Untagged conversion fell from 5.21% to 0.48%. Paid conversion fell from 4.49% to 1.56%.

Cart abandonment stayed between 64.90% and 66.44%.

The customer base of each month got smaller. Retention fell from 3.73% in July to 1.55% in August and 0.24% in September. Fewer customers placed a second order in the same month. The share who had bought before the month stayed in a narrow band, 4.71% to 6.74%.
