# HAMODY store metrics

Prepared 26 October 2026 from the HAMODY database. Money is AED. This is the public website. Orders typed in by staff are not included.

A sales order is a website order that was placed. Cancelled orders are left out. Failed card, Tabby, and Tamara attempts are left out. Checkouts still waiting for payment are left out. Cash on delivery is included when the customer places the order.

Orders run from 25 September 2025, 21:37 Dubai time, through 26 October 2026, 13:03 Dubai time. That is the entire order history in the database: **8,755 orders** and **912,948.35** in sales.

Visits, add-to-cart clicks, and checkout starts are not stored for that whole period. Those rows start on 16 June 2026. Saved carts start on 25 June 2026. The database is set to drop visit rows after 90 days and cart rows after 30 days, so earlier visits and carts cannot be recovered.

## Cart abandonment rate

**66.27%**

Saved carts from 25 June 2026 through 26 October 2026.

| Cart state | Carts | Value |
| --- | ---: | ---: |
| Still open | 7,524 | 1,936,785.32 |
| Waiting for payment | 293 | 71,683.15 |
| Bought | 3,978 | 617,552.11 |
| **All saved carts** | **11,795** | |

Abandonment is the open carts plus the carts waiting for payment, divided by all saved carts: 7,817 of 11,795.

## Add-to-cart rate

**0.30% of visits have a saved add-to-cart event.**

16 June 2026 through 26 October 2026: 134,467 visits, and 404 of those visits saved an add-to-cart event (3,680 events).

That rate is too low to be the real shop rate. In the same window, 12,186 visits started checkout (9.06% of visits). A checkout starts from a cart, so more people added a product than the add-to-cart event recorded. The click is only saved on some add-to-cart actions.

## Checkout completion rate

**29.30%** of checkout visits reached a saved purchase event.

16 June 2026 through 26 October 2026: 12,186 visits started checkout, and 3,571 of those visits have a purchase event.

On the saved-cart list (25 June 2026 onward), **33.73%** of carts were bought: 3,978 of 11,795. The two rates use different records, so they are not the same figure.

## Customer lifetime value

**114.61** average sales per customer.

Entire order history. A customer is the signed-in account, or the guest email when there is no account. 7,950 customers placed 8,736 orders and 911,116.81 in sales. 19 orders had no account and no email, so they are left out of this average. Those 19 orders are 1,831.54.

This is the average spent so far. It is not a forecast of future orders.

## Repeat purchase rate

**7.92%**

630 of 7,950 customers placed two or more orders. Entire order history, same customer key as the lifetime value.

## Revenue per visitor

**2.82** per visit.

16 June 2026 through 26 October 2026 only. Sales in that window are 378,834.27 from 3,298 orders. Visits in that window are 134,467. Visits before 16 June 2026 are not stored, so this cannot be calculated on the full order history.

## Inventory turnover

A full turnover figure is not available. Turnover needs the average stock held over the year. The database stores today's stock and a change log. It does not store the stock level for each past day.

What is stored today, for published products:

| | |
| --- | ---: |
| Published products | 3,045 |
| Units in stock now | 55,285 |
| Units sold on all sales orders | 9,051 |
| Products with a cost price | 105 |
| Stock value of those products, at cost | 353,168.26 |
| Cost of units sold where a cost price exists | 164,506.84 |

On that costed slice only, cost of goods sold divided by today's stock value is **0.47**. That is not an annual turnover rate, and it covers 105 of 3,045 products. 4,271 of the 9,051 units sold had a cost price.

## Stockout rate

**4.14%** of published products are out of stock right now.

126 of 3,045 published products have no units left. This is today's stock. A stockout rate over past months is not stored.

## COD delivery success rate

**62.06%**

Entire order history. Cash on delivery orders that already finished the delivery attempt: 4,432 delivered and 2,709 returned to origin. Success is delivered divided by those two results: 4,432 of 7,141.

7 further COD orders are in a customer-return status (3 returned, 2 return requested, 2 return approved). Those were delivered, then the customer sent them back, so they are not counted as a failed delivery.

180 COD orders are still moving: 7 placed, 56 pickup requested, 26 waiting for pickup, 1 processing, 33 shipped, and 57 out for delivery.

## Campaign profitability

Profit cannot be calculated. The ad-spend list for this store has no rows, so there is no cost to set against the sales.

Paid-campaign sales that do have a source on the order, entire order history:

| Source | Orders | Sales |
| --- | ---: | ---: |
| fb | 1,640 | 168,920.87 |
| ig | 839 | 108,105.17 |
| facebook | 72 | 7,667.49 |
| th | 5 | 379.59 |
| an | 2 | 378.90 |
| **Paid sources** | **2,558** | **285,452.02** |

Those paid sources are 31.27% of website sales (285,452.02 of 912,948.35). Profit on them stays unknown until ad spend is entered.
