import mongoose from 'mongoose';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { ACTIVE_RECORD_FILTER } from '@/lib/storeTrash';
import { getDisplayOrderNumber, getOrderCustomerDisplayName } from '@/lib/orderDisplay';
import { resolveLineSku } from '@/lib/storePickupExcelSku';
import { formatDubaiDateKey, isPickupAwaitingCourier } from '@/lib/storePickupQueue';
import { STOREFRONT_PUBLISHED_FILTER } from '@/lib/productVisibility';
import { escapeRegex } from '@/lib/productSearch';
import { isFailedSalesReportOrder } from '@/lib/storeSalesReport';
import {
  aggregateOrdersByProduct,
  applyCatalogNamesToOrders,
} from '@/lib/storeOrdersByProduct';
import {
  cleanHelpProductName,
  extractHelpDateRange,
  extractHelpStatusFilter,
  extractProductQuery,
  getHelpDateBounds,
  orderHasProductMatch,
  extractCustomerNameQuery,
  wantsCustomerLookup,
  wantsCustomerListExport,
  wantsPeriodSalesLookup,
  wantsProductSalesLookup,
  wantsHelpDownload,
  isWebsiteHelpQuestion,
} from '@/lib/storeHelpAgentFacts';
import { listStoreHelpExportPages, matchHelpHowTo } from '@/lib/storeHelpPages';
import { isWebsitePageCountQuestion, matchStoreHelpKnowledge } from '@/lib/storeHelpKnowledge';
import User from '@/models/User';
import { aggregateAllStoreCustomers, aggregateStoreCustomers, enrichCustomersWithUsers } from '@/lib/storeCustomersApi';

const MAX_FACTS = 8;

function orderContact(order = {}) {
  const shipping = order.shippingAddress || {};
  return {
    email: String(order.guestEmail || shipping.email || '').trim(),
    phone: String(order.guestPhone || shipping.phone || '').trim(),
    city: String(shipping.city || shipping.emirate || shipping.state || '').trim(),
  };
}

function compactOrder(order, { detailed = false } = {}) {
  if (!order) return null;
  const lines = Array.isArray(order.orderItems) && order.orderItems.length
    ? order.orderItems
    : (Array.isArray(order.items) ? order.items : []);
  const items = (detailed ? lines : lines.slice(0, 8)).map((item) => ({
    name: cleanHelpProductName(item.name || item.productName || ''),
    sku: resolveLineSku(item) || item.sku || '',
    quantity: item.quantity || item.packQuantity || 0,
  }));
  const contact = orderContact(order);
  return {
    orderNumber: getDisplayOrderNumber(order) || order.shortOrderNumber || '',
    status: order.status || '',
    total: Number(order.total || 0),
    paymentMethod: order.paymentMethod || '',
    paymentStatus: order.paymentStatus || '',
    createdAt: order.createdAt || null,
    customer: getOrderCustomerDisplayName(order),
    email: contact.email,
    phone: contact.phone,
    city: contact.city,
    units: countOrderUnits(order),
    items,
  };
}

function summarizeOrderStatuses(orders = []) {
  const map = new Map();
  orders.forEach((order) => {
    const status = String(order.status || 'UNKNOWN');
    const row = map.get(status) || { status, orderCount: 0, revenue: 0 };
    row.orderCount += 1;
    row.revenue += Number(order.total || 0);
    map.set(status, row);
  });
  return [...map.values()]
    .map((row) => ({ ...row, revenue: Number(row.revenue.toFixed(2)) }))
    .sort((a, b) => b.orderCount - a.orderCount);
}

function compactProduct(product) {
  if (!product) return null;
  const variants = (Array.isArray(product.variants) ? product.variants : [])
    .slice(0, 8)
    .map((variant) => ({
      sku: variant?.sku || '',
      stock: Number(variant?.stock ?? 0),
      title: variant?.options?.title || variant?.options?.color || variant?.options?.size || '',
    }));
  return {
    name: cleanHelpProductName(product.name || ''),
    sku: product.sku || '',
    stockQuantity: Number(product.stockQuantity ?? 0),
    inStock: Boolean(product.inStock),
    variants,
  };
}

function productIdMatchers(ids = []) {
  const values = [];
  ids.forEach((id) => {
    const text = String(id || '').trim();
    if (!text) return;
    values.push(text);
    if (mongoose.Types.ObjectId.isValid(text)) {
      values.push(new mongoose.Types.ObjectId(text));
    }
  });
  return values;
}

function isSuccessfulSalesOrder(order) {
  return !isFailedSalesReportOrder(order) && String(order?.status || '').toUpperCase() !== 'CANCELLED';
}

function countOrderUnits(order) {
  const lines = Array.isArray(order?.orderItems) && order.orderItems.length
    ? order.orderItems
    : (Array.isArray(order?.items) ? order.items : []);
  return lines.reduce((sum, item) => sum + Number(item?.quantity || item?.packQuantity || 0), 0);
}

async function lookupPeriodSales(storeId, rangeKey = 'this_month', { includeOrders = false, statusFilter = null } = {}) {
  const bounds = getHelpDateBounds(rangeKey);
  const match = {
    storeId: String(storeId),
    ...ACTIVE_RECORD_FILTER,
    status: statusFilter?.statuses?.length
      ? { $in: statusFilter.statuses }
      : { $nin: ['CANCELLED', 'PAYMENT_FAILED', 'TRASH', 'DELETED'] },
  };
  if (bounds.start && bounds.end) {
    match.createdAt = { $gte: bounds.start, $lte: bounds.end };
  }

  const orders = await Order.find(match)
    .select('shortOrderNumber displayOrderNumber total status paymentStatus isPaid paymentMethod createdAt guestName guestEmail guestPhone shippingAddress orderItems items')
    .sort({ createdAt: 1 })
    .limit(8000)
    .lean();

  const successOrders = statusFilter?.statuses?.length
    ? orders
    : orders.filter(isSuccessfulSalesOrder);
  const revenue = successOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const unitsSold = successOrders.reduce((sum, order) => sum + countOrderUnits(order), 0);

  return {
    range: bounds.label,
    rangeKey: bounds.key,
    currency: 'AED',
    orderCount: successOrders.length,
    unitsSold,
    revenue: Number(revenue.toFixed(2)),
    statusKey: statusFilter?.key || '',
    statusLabel: statusFilter?.label || '',
    byStatus: summarizeOrderStatuses(successOrders),
    ...(includeOrders ? { orders: successOrders.map((order) => compactOrder(order, { detailed: true })).filter(Boolean) } : {}),
  };
}

async function lookupProductSales(storeId, terms = [], { rangeKey = 'all_time', includeOrders = false, statusFilter = null } = {}) {
  if (!terms.length) return null;

  const nameRegex = new RegExp(terms.map(escapeRegex).join('|'), 'i');
  const products = await Product.find({
    storeId: String(storeId),
    $or: [
      { name: nameRegex },
      { nameAr: nameRegex },
      { title: nameRegex },
      { brand: nameRegex },
      { brandAr: nameRegex },
      { sku: nameRegex },
      { slug: nameRegex },
      { 'variants.sku': nameRegex },
      { 'variants.name': nameRegex },
    ],
  })
    .select('name nameAr sku brand')
    .limit(12)
    .lean();

  const productIds = new Set(products.map((product) => String(product._id)));
  const idValues = productIdMatchers([...productIds]);
  const bounds = getHelpDateBounds(rangeKey);

  const match = {
    storeId: String(storeId),
    ...ACTIVE_RECORD_FILTER,
    status: statusFilter?.statuses?.length
      ? { $in: statusFilter.statuses }
      : { $nin: ['CANCELLED', 'PAYMENT_FAILED', 'TRASH', 'DELETED'] },
    $or: [
      ...(idValues.length ? [
        { 'orderItems.productId': { $in: idValues } },
        { 'items.productId': { $in: idValues } },
      ] : []),
      { 'orderItems.name': nameRegex },
      { 'orderItems.productName': nameRegex },
      { 'orderItems.sku': nameRegex },
      { 'items.name': nameRegex },
      { 'items.productName': nameRegex },
    ],
  };
  if (bounds.start && bounds.end) {
    match.createdAt = { $gte: bounds.start, $lte: bounds.end };
  }

  const rawOrders = await Order.find(match)
    .select('shortOrderNumber displayOrderNumber status total createdAt paymentMethod paymentStatus isPaid guestName guestEmail guestPhone shippingAddress orderItems items')
    .sort({ createdAt: -1 })
    .limit(4000)
    .lean();

  const successOrders = applyCatalogNamesToOrders(
    statusFilter?.statuses?.length ? rawOrders : rawOrders.filter(isSuccessfulSalesOrder),
    products,
  );
  const matchingOrders = successOrders.filter((order) => (
    orderHasProductMatch(order, { terms, productIds })
  ));
  const rows = aggregateOrdersByProduct(matchingOrders)
    .filter((row) => {
      const name = `${row.productName || ''} ${row.sku || ''}`.toLowerCase();
      return productIds.has(String(row.productId))
        || terms.some((term) => name.includes(term));
    })
    .slice(0, 8);

  const uniqueOrderIds = new Set(matchingOrders.map((order) => String(order._id)));
  const notFound = !products.length && !rows.length;

  return {
    searched: terms.join(' '),
    range: bounds.label,
    rangeKey: bounds.key,
    notFound,
    matchedCatalogProducts: products.map((product) => ({
      name: cleanHelpProductName(product.name || ''),
      sku: product.sku || '',
    })),
    totals: {
      orderCount: uniqueOrderIds.size,
      unitsSold: rows.reduce((sum, row) => sum + Number(row.unitsSold || 0), 0),
      revenue: Number(rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0).toFixed(2)),
    },
    byProduct: rows.map((row) => ({
      productName: cleanHelpProductName(row.productName),
      sku: products.find((product) => String(product._id) === String(row.productId))?.sku || '',
      orderCount: row.orderCount,
      unitsSold: row.unitsSold,
      revenue: row.revenue,
    })),
    statusKey: statusFilter?.key || '',
    statusLabel: statusFilter?.label || '',
    recentOrders: matchingOrders.slice(0, 6).map(compactOrder).filter(Boolean),
    ...(includeOrders ? { orders: matchingOrders.map((order) => compactOrder(order, { detailed: true })).filter(Boolean) } : {}),
  };
}

async function lookupOrdersForNamedCustomers(storeId, { terms = [], userIds = [], emails = [] } = {}) {
  const cleaned = terms.map((term) => String(term || '').trim()).filter(Boolean);
  const nameRegex = cleaned.length ? new RegExp(cleaned.map(escapeRegex).join('|'), 'i') : null;
  const emailList = emails.map((email) => String(email || '').trim().toLowerCase()).filter(Boolean);
  const or = [
    ...(userIds.length ? [{ userId: { $in: userIds } }] : []),
    ...(emailList.length ? [{ guestEmail: { $in: emailList } }, { 'shippingAddress.email': { $in: emailList } }] : []),
    ...(nameRegex ? [{ guestName: nameRegex }, { 'shippingAddress.name': nameRegex }] : []),
  ];
  if (!or.length) return [];

  const orders = await Order.find({
    storeId: String(storeId),
    ...ACTIVE_RECORD_FILTER,
    $or: or,
  })
    .select('shortOrderNumber displayOrderNumber status total createdAt guestName guestEmail guestPhone isGuest userId shippingAddress orderItems paymentMethod paymentStatus')
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return orders.map((order) => compactOrder(order, { detailed: true })).filter(Boolean);
}

async function lookupCustomersByName(storeId, terms = [], { includeOrders = false } = {}) {
  const cleaned = (Array.isArray(terms) ? terms : []).map((term) => String(term || '').trim()).filter(Boolean);
  if (!cleaned.length) return { searched: '', notFound: true, customers: [], orders: [] };

  const searched = cleaned.join(' ');
  const nameRegex = new RegExp(cleaned.map(escapeRegex).join('|'), 'i');
  const matchedUsers = await User.find({
    $or: [{ name: nameRegex }, { email: nameRegex }],
  })
    .select('_id name email')
    .limit(40)
    .lean();

  const { customers: aggregated } = await aggregateStoreCustomers(Order, storeId, {
    search: searched,
    view: 'all',
    page: 1,
    limit: 8,
    matchingUserIds: matchedUsers.map((user) => user._id),
  });

  const registeredIds = aggregated
    .filter((customer) => !customer.isGuest && customer.userId)
    .map((customer) => String(customer.userId));
  const profileUsers = registeredIds.length
    ? await User.find({ _id: { $in: registeredIds } }).select('_id name email').lean()
    : [];
  const customers = enrichCustomersWithUsers(aggregated, profileUsers)
    .map((customer) => ({
      name: String(customer.name || '').trim(),
      email: String(customer.email || '').trim(),
      isGuest: Boolean(customer.isGuest),
      orderCount: Number(customer.totalOrders || 0),
    }))
    .filter((customer) => customer.name || customer.email);

  const orders = includeOrders
    ? await lookupOrdersForNamedCustomers(storeId, {
      terms: cleaned,
      userIds: matchedUsers.map((user) => user._id),
      emails: customers.map((customer) => customer.email),
    })
    : [];

  return {
    searched,
    notFound: customers.length === 0,
    customers,
    orderCount: orders.length || customers.reduce((sum, customer) => sum + Number(customer.orderCount || 0), 0),
    orders,
  };
}

function compactHelpCustomer(customer) {
  return {
    name: String(customer?.name || '').trim(),
    email: String(customer?.email || '').trim(),
    isGuest: Boolean(customer?.isGuest),
    orderCount: Number(customer?.totalOrders || customer?.orderCount || 0),
    totalSpent: Number(customer?.totalSpent || 0),
  };
}

async function lookupCustomerDirectory(storeId, { includeAll = false } = {}) {
  if (includeAll) {
    const aggregated = await aggregateAllStoreCustomers(Order, storeId, { view: 'all' });
    const registeredIds = aggregated
      .filter((customer) => !customer.isGuest && customer.userId)
      .map((customer) => String(customer.userId));
    const profileUsers = registeredIds.length
      ? await User.find({ _id: { $in: registeredIds } }).select('_id name email').lean()
      : [];
    const customers = enrichCustomersWithUsers(aggregated, profileUsers);
    return {
      customerCount: customers.length,
      customers: customers.slice(0, 8).map(compactHelpCustomer),
      allCustomers: customers,
    };
  }

  const { customers: page, stats } = await aggregateStoreCustomers(Order, storeId, {
    view: 'all',
    page: 1,
    limit: 8,
  });
  const registeredIds = page
    .filter((customer) => !customer.isGuest && customer.userId)
    .map((customer) => String(customer.userId));
  const profileUsers = registeredIds.length
    ? await User.find({ _id: { $in: registeredIds } }).select('_id name email').lean()
    : [];
  const customers = enrichCustomersWithUsers(page, profileUsers).map(compactHelpCustomer);

  return {
    customerCount: Number(stats?.filteredTotal || stats?.totalCustomers || customers.length),
    customers,
  };
}

export function canExportHelpFacts(facts = {}) {
  if (Number(facts.periodSales?.orderCount || 0) > 0) return true;
  if (Number(facts.productSales?.totals?.orderCount || 0) > 0) return true;
  if (facts.order && !facts.order.notFound) return true;
  if (Array.isArray(facts.customerOrders) && facts.customerOrders.length) return true;
  if (Number(facts.customerSearch?.orderCount || 0) > 0) return true;
  if (Number(facts.customerList?.customerCount || 0) > 0) return true;
  return false;
}

function buildHelpPagesExportPayload(question = '') {
  const pages = listStoreHelpExportPages();
  return {
    kind: 'pages',
    title: 'Website and dashboard pages',
    range: 'All pages',
    rangeKey: 'pages',
    pages,
    totals: {
      pageCount: pages.length,
      publicCount: pages.filter((page) => page.section === 'Public').length,
      dashboardCount: pages.filter((page) => page.section === 'Dashboard').length,
    },
    question,
    orders: [],
    customers: [],
  };
}

function buildHelpNotesExportPayload(question = '', { title = 'Store Help details', answer = '', links = [] } = {}) {
  return {
    kind: 'notes',
    title,
    range: title,
    rangeKey: 'notes',
    answer,
    links: (links || []).filter((link) => link?.href && link?.label),
    question,
    orders: [],
    customers: [],
  };
}

export function shouldOfferHelpExport(facts = {}, question = '') {
  if (isWebsiteHelpQuestion(question) || isWebsitePageCountQuestion(question)) return true;
  if (canExportHelpFacts(facts)) {
    const terms = extractProductQuery(question);
    if (
      wantsPeriodSalesLookup(question, terms)
      || wantsProductSalesLookup(question, terms)
      || wantsCustomerLookup(question)
      || wantsCustomerListExport(question)
      || Boolean(facts.order && !facts.order.notFound)
      || Boolean(facts.customerSearch)
      || Boolean(facts.customerList)
    ) {
      return true;
    }
  }
  if (!wantsHelpDownload(question)) return false;
  return Boolean(matchStoreHelpKnowledge(question) || matchHelpHowTo(question));
}

export async function gatherStoreHelpExport(storeId, question = '') {
  if (isWebsiteHelpQuestion(question) || isWebsitePageCountQuestion(question)) {
    return buildHelpPagesExportPayload(question);
  }

  const facts = await gatherStoreHelpFacts(storeId, question, { includeOrders: true });
  if (facts.customerList?.allCustomers?.length) {
    return {
      kind: 'customers',
      title: 'Customer names',
      range: 'All customers',
      rangeKey: 'customers',
      currency: 'AED',
      totals: {
        orderCount: facts.customerList.allCustomers.reduce((sum, customer) => sum + Number(customer.totalOrders || 0), 0),
        unitsSold: 0,
        revenue: facts.customerList.allCustomers.reduce((sum, customer) => sum + Number(customer.totalSpent || 0), 0),
      },
      customers: facts.customerList.allCustomers,
      orders: [],
    };
  }
  const terms = extractProductQuery(question);
  const preferPeriod = wantsPeriodSalesLookup(question, terms) || !terms.length;
  if (!preferPeriod && facts.productSales?.orders?.length) {
    const statusBit = facts.productSales.statusLabel ? ` ${facts.productSales.statusLabel}` : '';
    return {
      kind: 'product',
      title: `${facts.productSales.searched || 'Product orders'}${statusBit}`,
      range: `${facts.productSales.range}${statusBit}`,
      rangeKey: [facts.productSales.rangeKey, facts.productSales.statusKey].filter(Boolean).join('-'),
      currency: 'AED',
      statusLabel: facts.productSales.statusLabel || '',
      totals: facts.productSales.totals,
      byProduct: facts.productSales.byProduct || [],
      orders: facts.productSales.orders,
    };
  }
  if (facts.periodSales?.orders?.length) {
    const statusBit = facts.periodSales.statusLabel ? ` ${facts.periodSales.statusLabel}` : '';
    return {
      kind: 'period',
      title: `${facts.periodSales.range}${statusBit}`,
      range: `${facts.periodSales.range}${statusBit}`,
      rangeKey: [facts.periodSales.rangeKey, facts.periodSales.statusKey].filter(Boolean).join('-'),
      currency: facts.periodSales.currency || 'AED',
      statusLabel: facts.periodSales.statusLabel || '',
      totals: {
        orderCount: facts.periodSales.orderCount,
        unitsSold: facts.periodSales.unitsSold,
        revenue: facts.periodSales.revenue,
      },
      orders: facts.periodSales.orders,
    };
  }
  if (facts.productSales?.orders?.length) {
    const statusBit = facts.productSales.statusLabel ? ` ${facts.productSales.statusLabel}` : '';
    return {
      kind: 'product',
      title: `${facts.productSales.searched || 'Product orders'}${statusBit}`,
      range: `${facts.productSales.range}${statusBit}`,
      rangeKey: [facts.productSales.rangeKey, facts.productSales.statusKey].filter(Boolean).join('-'),
      currency: 'AED',
      statusLabel: facts.productSales.statusLabel || '',
      totals: facts.productSales.totals,
      byProduct: facts.productSales.byProduct || [],
      orders: facts.productSales.orders,
    };
  }
  if (facts.order && !facts.order.notFound) {
    return {
      kind: 'order',
      title: `Order ${facts.order.orderNumber}`,
      range: 'Selected order',
      rangeKey: 'order',
      currency: 'AED',
      totals: { orderCount: 1, unitsSold: (facts.order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0), revenue: facts.order.total },
      orders: [facts.order],
    };
  }
  if (facts.customerSearch?.orders?.length) {
    return {
      kind: 'customer',
      title: `Orders for ${facts.customerSearch.searched}`,
      range: `Matching ${facts.customerSearch.searched}`,
      rangeKey: 'customer',
      currency: 'AED',
      totals: {
        orderCount: facts.customerSearch.orders.length,
        unitsSold: facts.customerSearch.orders.reduce((sum, order) => sum + (order.items || []).reduce((inner, item) => inner + Number(item.quantity || 0), 0), 0),
        revenue: facts.customerSearch.orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      },
      orders: facts.customerSearch.orders,
    };
  }
  if (facts.customerOrders?.length) {
    return {
      kind: 'customer',
      title: 'Customer orders',
      range: 'Matching customer',
      rangeKey: 'customer',
      currency: 'AED',
      totals: {
        orderCount: facts.customerOrders.length,
        unitsSold: facts.customerOrders.reduce((sum, order) => sum + (order.items || []).reduce((inner, item) => inner + Number(item.quantity || 0), 0), 0),
        revenue: facts.customerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      },
      orders: facts.customerOrders,
    };
  }

  const knowledge = matchStoreHelpKnowledge(question);
  if (knowledge?.answer) {
    return buildHelpNotesExportPayload(question, {
      title: 'Store Help details',
      answer: knowledge.answer,
      links: knowledge.links || [],
    });
  }
  const howTo = matchHelpHowTo(question);
  if (howTo) {
    return buildHelpNotesExportPayload(question, {
      title: howTo.label || 'Dashboard page',
      answer: howTo.answer,
      links: [{ label: howTo.label, href: howTo.href }],
    });
  }
  return null;
}

export async function gatherStoreHelpFacts(storeId, question = '', { includeOrders = false } = {}) {
  const text = String(question || '').trim();
  const facts = {
    readOnly: true,
    note: 'This assistant can only inspect store data. It cannot update orders, stock, products, or settings.',
  };

  const orderMatch = text.match(/\b(\d{4,8})\b/);
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const skuMatch = text.match(/\b([A-Z]{1,5}[-_]?\d{3,8}(?:-[A-Z0-9]+)?)\b/i);

  if (orderMatch) {
    const number = Number(orderMatch[1]);
    const order = await Order.findOne({
      storeId: String(storeId),
      ...ACTIVE_RECORD_FILTER,
      $or: [
        { shortOrderNumber: number },
        { displayOrderNumber: String(number) },
      ],
    })
      .select('shortOrderNumber displayOrderNumber status total paymentMethod paymentStatus createdAt guestName guestEmail guestPhone shippingAddress orderItems')
      .lean();
    facts.order = compactOrder(order, { detailed: true }) || { notFound: true, searched: orderMatch[1] };
  }

  if (wantsCustomerListExport(text)) {
    facts.customerList = await lookupCustomerDirectory(storeId, { includeAll: includeOrders });
  } else if (wantsCustomerLookup(text)) {
    const terms = extractCustomerNameQuery(text);
    if (terms.length) {
      facts.customerSearch = await lookupCustomersByName(storeId, terms, { includeOrders });
    }
  }

  if (emailMatch) {
    const email = emailMatch[0].toLowerCase();
    const orders = await Order.find({
      storeId: String(storeId),
      ...ACTIVE_RECORD_FILTER,
      $or: [
        { guestEmail: email },
        { 'shippingAddress.email': email },
      ],
    })
      .select('shortOrderNumber displayOrderNumber status total createdAt guestName guestEmail guestPhone shippingAddress orderItems paymentMethod paymentStatus')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    facts.customerOrders = orders.map((order) => compactOrder(order, { detailed: true })).filter(Boolean);
  }

  const searchTerms = extractProductQuery(text);

  if (skuMatch) {
    const sku = skuMatch[1].trim();
    const skuRegex = new RegExp(`^${escapeRegex(sku)}$`, 'i');
    const product = await Product.findOne({
      storeId: String(storeId),
      $or: [{ sku: skuRegex }, { 'variants.sku': skuRegex }],
    })
      .select('name sku stockQuantity inStock variants')
      .lean();
    facts.product = compactProduct(product) || { notFound: true, searched: sku };
    if (!searchTerms.includes(sku.toLowerCase())) searchTerms.push(sku.toLowerCase());
  }

  if (wantsPeriodSalesLookup(text, searchTerms)) {
    facts.periodSales = await lookupPeriodSales(storeId, extractHelpDateRange(text) || 'this_month', {
      includeOrders,
      statusFilter: extractHelpStatusFilter(text),
    });
  }

  if (wantsProductSalesLookup(text, searchTerms) && !wantsPeriodSalesLookup(text, searchTerms)) {
    facts.productSales = await lookupProductSales(storeId, searchTerms, {
      rangeKey: extractHelpDateRange(text) || 'all_time',
      includeOrders,
      statusFilter: extractHelpStatusFilter(text),
    });
  }

  const wantsSnapshot = /pickup|stock|inventory|sku|excel|export|why|missing/i.test(text)
    || (!facts.order && !facts.product && !facts.customerOrders && !facts.customerSearch && !facts.customerList && !facts.productSales && !facts.periodSales);

  if (wantsSnapshot) {
    const todayKey = formatDubaiDateKey(new Date());
    const start = new Date(`${todayKey}T00:00:00+04:00`);
    const end = new Date(`${todayKey}T23:59:59.999+04:00`);

    const [todayOrders, pickupOrders, missingSkuSample, outOfStock] = await Promise.all([
      Order.countDocuments({
        storeId: String(storeId),
        ...ACTIVE_RECORD_FILTER,
        createdAt: { $gte: start, $lte: end },
      }),
      Order.find({
        storeId: String(storeId),
        ...ACTIVE_RECORD_FILTER,
        status: { $in: ['PICKUP_REQUESTED', 'WAITING_FOR_PICKUP'] },
      })
        .select('status waslah warehousePacking')
        .limit(80)
        .lean(),
      Order.find({
        storeId: String(storeId),
        ...ACTIVE_RECORD_FILTER,
        createdAt: { $gte: start, $lte: end },
      })
        .select('shortOrderNumber orderItems')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Product.countDocuments({
        storeId: String(storeId),
        ...STOREFRONT_PUBLISHED_FILTER,
        $or: [{ inStock: false }, { stockQuantity: { $lte: 0 } }],
      }),
    ]);

    const awaitingPickup = pickupOrders.filter(isPickupAwaitingCourier).length;
    const linesWithoutSku = [];
    missingSkuSample.forEach((order) => {
      (order.orderItems || []).forEach((item) => {
        if (resolveLineSku(item)) return;
        if (linesWithoutSku.length >= MAX_FACTS) return;
        linesWithoutSku.push({
          orderNumber: order.shortOrderNumber || '',
          name: item.name || item.productName || '',
        });
      });
    });

    facts.snapshot = {
      dubaiDate: todayKey,
      todayOrderCount: todayOrders,
      awaitingPickupCount: awaitingPickup,
      publishedOutOfStockCount: outOfStock,
      recentLinesMissingSku: linesWithoutSku,
    };
  }

  return facts;
}
