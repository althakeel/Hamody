import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanHelpProductName,
  extractHelpDateRange,
  extractHelpSearchTerms,
  extractProductQuery,
  getHelpDateBounds,
  orderHasProductMatch,
  formatStoreHelpAnswer,
  formatStoreHelpReply,
  wantsHelpDownload,
  wantsPeriodSalesLookup,
  wantsProductSalesLookup,
  extractCustomerNameQuery,
  wantsCustomerLookup,
  wantsCustomerListExport,
  normalizeHelpQuestion,
  extractHelpStatusFilter,
  isHelpDownloadFollowUp,
  mergeHelpDownloadContext,
  isWebsiteHelpQuestion,
} from '../lib/storeHelpAgentFacts.js';
import { isHelpHowToQuestion, matchHelpHowTo, parseHelpLinkTokens } from '../lib/storeHelpPages.js';

test('extracts mansory from a product-order question', () => {
  const question = 'total how many order i got for mansory product';
  assert.deepEqual(extractProductQuery(question), ['mansory']);
  assert.equal(wantsProductSalesLookup(question, ['mansory']), true);
});

test('does not treat pickup questions as a product search', () => {
  const question = 'How many pickups are waiting now?';
  assert.deepEqual(extractProductQuery(question), []);
  assert.equal(wantsProductSalesLookup(question, []), false);
});

test('matches orders by product id even when the line name is empty', () => {
  const order = {
    orderItems: [{ productId: 'prod-1', name: '', quantity: 2 }],
  };
  assert.equal(orderHasProductMatch(order, {
    terms: ['mansory'],
    productIds: new Set(['prod-1']),
  }), true);
});

test('matches orders by line name when catalog id is missing', () => {
  const order = {
    orderItems: [{ name: 'Mansory steering wheel', quantity: 1 }],
  };
  assert.equal(orderHasProductMatch(order, {
    terms: ['mansory'],
    productIds: new Set(),
  }), true);
});

test('keeps leftover brand words from a short question', () => {
  assert.deepEqual(extractHelpSearchTerms('mansory orders'), ['mansory']);
});

test('download words are detected even with typos', () => {
  assert.equal(wantsHelpDownload('619436 order details'), false);
  assert.equal(wantsHelpDownload('last 2 months sales report to download'), true);
  assert.equal(wantsHelpDownload('last 2 months sales resport to downlaod'), true);
});

test('typos like resport and downlaod still mean last 2 months sales download', () => {
  const question = 'i need to know last 2 months sales resport to downlaod';
  assert.deepEqual(extractProductQuery(question), []);
  assert.equal(extractHelpDateRange(question), 'last_months_2');
  assert.equal(wantsPeriodSalesLookup(question, []), true);
  assert.equal(wantsProductSalesLookup(question, []), false);
  assert.equal(wantsHelpDownload(question), true);
});

test('last 2 months sales report to download is a period export, not a how-to page', () => {
  const question = 'i need to know last 2 months sales report to download';
  assert.deepEqual(extractProductQuery(question), []);
  assert.equal(extractHelpDateRange(question), 'last_months_2');
  assert.equal(wantsPeriodSalesLookup(question, []), true);
  assert.equal(wantsProductSalesLookup(question, []), false);
  assert.equal(wantsHelpDownload(question), true);
  assert.equal(matchHelpHowTo(question), null);
  assert.equal(isHelpHowToQuestion(question), false);
  const answer = formatStoreHelpAnswer({
    periodSales: {
      rangeKey: 'last_months_2',
      orderCount: 40,
      revenue: 9800,
      currency: 'AED',
    },
    productSales: { notFound: true, searched: 'download' },
  }, question);
  assert.equal(
    answer,
    "In the last 2 months you've had 40 orders, totaling AED 9,800. Use Excel or PDF below to download the details.",
  );
});

test('last 6 months is a period total, not a product named last', () => {
  const question = 'in last 6 months how many order we got';
  assert.deepEqual(extractProductQuery(question), []);
  assert.equal(wantsPeriodSalesLookup(question, []), true);
  assert.equal(wantsProductSalesLookup(question, []), false);
  assert.equal(extractHelpDateRange(question), 'last_months_6');
});

test('last 6 months bounds roll back 6 Dubai months', () => {
  const bounds = getHelpDateBounds('last_months_6', new Date('2026-09-21T08:00:00.000Z'));
  assert.equal(bounds.key, 'last_months_6');
  assert.equal(bounds.start.toISOString(), '2026-03-20T20:00:00.000Z');
  assert.match(bounds.label, /last 6 months/);
});

test('cleans raw JSON product names', () => {
  assert.equal(
    cleanHelpProductName('[{"name":"Nexoso 2-in-1 Baby Stroller","quantity":1}]'),
    'Nexoso 2-in-1 Baby Stroller',
  );
});

test('download this month delivered is live sales, not a how-to page', () => {
  const question = 'this motnth delivered revenue downlaod excel';
  assert.match(normalizeHelpQuestion(question), /this month/);
  assert.match(normalizeHelpQuestion(question), /download/);
  assert.equal(extractHelpStatusFilter(question)?.key, 'delivered');
  assert.equal(wantsPeriodSalesLookup(question, []), true);
  assert.equal(matchHelpHowTo(question), null);
  assert.equal(isHelpHowToQuestion(question), false);
  const answer = formatStoreHelpAnswer({
    periodSales: {
      rangeKey: 'this_month',
      orderCount: 40,
      revenue: 12850.5,
      currency: 'AED',
      statusLabel: 'delivered',
    },
  }, question);
  assert.match(answer, /40 orders delivered/);
  assert.match(answer, /Excel or PDF/);
});

test('download those details reuses the last sales question', () => {
  assert.equal(isHelpDownloadFollowUp('download those details'), true);
  assert.equal(isHelpDownloadFollowUp('excel please'), true);
  assert.equal(isHelpDownloadFollowUp('this month delivered download'), false);
  assert.equal(
    mergeHelpDownloadContext('download those details', 'this motnth revenue how many delivered'),
    'this motnth revenue how many delivered download',
  );
});

test('this month sales can include a status breakdown', () => {
  const answer = formatStoreHelpAnswer({
    periodSales: {
      rangeKey: 'this_month',
      orderCount: 157,
      revenue: 44281.78,
      currency: 'AED',
      byStatus: [
        { status: 'PROCESSING', orderCount: 80, revenue: 20000 },
        { status: 'DELIVERED', orderCount: 40, revenue: 12850.5 },
      ],
    },
  }, 'How many sales did I get this month?');
  assert.match(answer, /157 orders/);
  assert.match(answer, /80 processing/);
  assert.match(answer, /40 delivered/);
});

test('how many pages on this website is not a sales export', () => {
  const question = 'how many pages are ther in this website';
  assert.match(normalizeHelpQuestion(question), /pages/);
  assert.doesNotMatch(normalizeHelpQuestion(question), /\bsales\b/);
  assert.equal(isWebsiteHelpQuestion(question), true);
  assert.deepEqual(extractProductQuery(question), []);
  assert.equal(wantsPeriodSalesLookup(question, []), false);
  assert.equal(wantsProductSalesLookup(question, ['pages']), false);
  const reply = formatStoreHelpReply({
    productSales: {
      searched: 'pages',
      range: 'all time',
      rangeKey: 'all_time',
      notFound: false,
      totals: { orderCount: 2, unitsSold: 2, revenue: 279.61 },
    },
  }, question);
  assert.match(reply.answer, /About Us/);
  assert.match(reply.answer, /public website/i);
  assert.match(reply.answer, /seller dashboard/i);
  assert.equal((reply.links || []).some((link) => /orders-by-product|sales-report/i.test(link.href)), false);
});

test('this month delivered revenue is period sales, not a product named delivered', () => {
  const question = 'this motnth revenue how many delivered';
  assert.match(normalizeHelpQuestion(question), /this month/);
  assert.deepEqual(extractProductQuery(question), []);
  assert.equal(extractHelpDateRange(question), 'this_month');
  assert.equal(extractHelpStatusFilter(question)?.key, 'delivered');
  assert.equal(wantsPeriodSalesLookup(question, []), true);
  assert.equal(wantsProductSalesLookup(question, []), false);
  const answer = formatStoreHelpAnswer({
    periodSales: {
      rangeKey: 'this_month',
      orderCount: 40,
      revenue: 12850.5,
      currency: 'AED',
      statusLabel: 'delivered',
    },
  }, question);
  assert.equal(answer, "This month you've had 40 orders delivered, totaling AED 12,850.50.");
});

test('this month sales is a period total, not a product search', () => {
  const question = 'i need to know this month how many sales i got';
  assert.deepEqual(extractProductQuery(question), []);
  assert.equal(wantsPeriodSalesLookup(question, []), true);
  assert.equal(wantsProductSalesLookup(question, []), false);
  assert.equal(extractHelpDateRange(question), 'this_month');
});

test('this month bounds use the Dubai calendar', () => {
  const bounds = getHelpDateBounds('this_month', new Date('2026-09-21T08:00:00.000Z'));
  assert.equal(bounds.key, 'this_month');
  assert.equal(bounds.start.toISOString(), '2026-08-31T20:00:00.000Z');
  assert.match(bounds.label, /September 2026/);
});

test('last 6 months answer sounds like a person', () => {
  const answer = formatStoreHelpAnswer({
    periodSales: {
      rangeKey: 'last_months_6',
      orderCount: 184,
      revenue: 22150,
      currency: 'AED',
    },
  }, 'in last 6 months how many order we got');
  assert.equal(answer, "In the last 6 months you've had 184 orders, totaling AED 22,150.");
});

test('order answers link to that order on the orders page', () => {
  const reply = formatStoreHelpReply({
    order: {
      orderNumber: '619436',
      status: 'OUT_FOR_DELIVERY',
      total: 99,
      items: [{ name: 'VoltMate' }],
    },
  }, '619436 order details');
  assert.equal(reply.links[0].label, 'Order 619436');
  assert.equal(reply.links[0].href, '/store/orders?q=619436');
});

test('period sales answer sounds like a person', () => {
  const answer = formatStoreHelpAnswer({
    periodSales: {
      rangeKey: 'today',
      orderCount: 2,
      revenue: 219.8,
      currency: 'AED',
    },
  }, 'how many sales today');
  assert.equal(answer, "Today you've had 2 orders, totaling AED 219.80.");
});

test('empty product day is a simple sentence', () => {
  const answer = formatStoreHelpAnswer({
    productSales: {
      rangeKey: 'today',
      searched: 'porodo',
      notFound: false,
      matchedCatalogProducts: [{ name: 'Porodo Lifestyle Portable Shoe Dryer' }],
      totals: { orderCount: 0, unitsSold: 0, revenue: 0 },
      byProduct: [],
    },
  }, 'how many orders for porodo today');
  assert.equal(answer, "Porodo Lifestyle Portable Shoe Dryer hasn't had any orders today.");
});

test('banner slider how-to points to carousel settings', () => {
  const match = matchHelpHowTo('how can i change this banner slider images');
  assert.equal(match.href, '/store/storefront/carousel-slider');
  assert.equal(match.label, 'Carousel Settings');
  assert.equal(isHelpHowToQuestion('how can i change this banner slider images'), true);
});

test('parses help page link tokens', () => {
  const parts = parseHelpLinkTokens('Open [[Carousel Settings|/store/storefront/carousel-slider]] now.');
  assert.deepEqual(parts, [
    { type: 'text', value: 'Open ' },
    { type: 'link', label: 'Carousel Settings', href: '/store/storefront/carousel-slider' },
    { type: 'text', value: ' now.' },
  ]);
});

test('category banner questions open Categories', () => {
  const match = matchHelpHowTo('where do I add category banners');
  assert.equal(match.href, '/store/categories');
  assert.match(match.answer, /desktop/);
});

test('website navbar questions stay on menu management', () => {
  const match = matchHelpHowTo('where do I change the navbar');
  assert.equal(match.href, '/store/menu-management');
});

test('app navbar questions open the mobile navbar', () => {
  const match = matchHelpHowTo('where is the app navbar');
  assert.equal(match.href, '/store/mobile-features/navbar');
});

test('app icon questions open the app icon page', () => {
  const match = matchHelpHowTo('where do I upload the app icon');
  assert.equal(match.href, '/store/mobile-features/app-icon');
});

test('parent categories open menu management', () => {
  const match = matchHelpHowTo('where are parent categories');
  assert.equal(match.href, '/store/menu-management');
});

test('storefront offers do not open the app offers page', () => {
  const match = matchHelpHowTo('where are offers');
  assert.equal(match.href, '/store/customize/offers');
});

test('app only discount opens app discount', () => {
  const match = matchHelpHowTo('how do I give a discount in the app');
  assert.equal(match.href, '/store/app-discount');
});

test('author questions always name Rohith Sagar M', () => {
  const reply = formatStoreHelpReply({}, 'who is the author of Store1920');
  assert.equal(reply.answer, 'The author of Store1920 is Rohith Sagar M.');
});

test('customer name questions extract rohith and skip how-to', () => {
  const question = 'any one name rohith as customer we have';
  assert.deepEqual(extractCustomerNameQuery(question), ['rohith']);
  assert.equal(wantsCustomerLookup(question), true);
  assert.equal(matchHelpHowTo(question), null);
  const answer = formatStoreHelpAnswer({
    customerSearch: {
      searched: 'rohith',
      notFound: false,
      customers: [{ name: 'Rohith Kumar' }],
      orderCount: 2,
    },
  }, question);
  assert.match(answer, /Rohith Kumar/);
  assert.match(answer, /2 orders/);
});

test('where are customers is a page, not a name search', () => {
  assert.equal(wantsCustomerLookup('where are customers'), false);
  assert.deepEqual(extractCustomerNameQuery('where are customers'), []);
});

test('download rohith sagar orders list is a customer order lookup, not the orders page', () => {
  const question = 'i need to downalood rohith sagar ordersl sit';
  assert.match(normalizeHelpQuestion(question), /download/);
  assert.match(normalizeHelpQuestion(question), /orders/);
  assert.deepEqual(extractCustomerNameQuery(question), ['rohith', 'sagar']);
  assert.equal(wantsCustomerLookup(question), true);
  assert.equal(wantsCustomerListExport(question), false);
  assert.equal(matchHelpHowTo(question), null);
  const answer = formatStoreHelpAnswer({
    customerSearch: {
      searched: 'rohith sagar',
      notFound: false,
      customers: [{ name: 'Rohith Sagar M' }],
      orderCount: 32,
    },
  }, question);
  assert.match(answer, /Rohith Sagar/);
  assert.match(answer, /32 orders/);
  assert.match(answer, /Excel/);
});

test('downaldo customer names in excel is a list download, not a name search', () => {
  const question = 'i need to downaldo the customer names in excel';
  assert.match(normalizeHelpQuestion(question), /download/);
  assert.equal(wantsHelpDownload(question), true);
  assert.equal(wantsCustomerListExport(question), true);
  assert.equal(wantsCustomerLookup(question), false);
  assert.deepEqual(extractCustomerNameQuery(question), []);
  assert.equal(wantsPeriodSalesLookup(question, []), false);
  const answer = formatStoreHelpAnswer({
    customerList: { customerCount: 42, customers: [{ name: 'Sara' }] },
  }, question);
  assert.match(answer, /42 customers/);
  assert.match(answer, /Excel/);
});
