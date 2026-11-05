import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import CustomerBehaviorEvent from '@/models/CustomerBehaviorEvent';
import MarketingExpense from '@/models/MarketingExpense';
import Product from '@/models/Product';
import Category from '@/models/Category';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { ACTIVE_RECORD_FILTER } from '@/lib/storeTrash';
import {
  WOOCOMMERCE_ORDER_EXPORT_HEADERS,
  buildWooCommerceOrderExportRows,
  resolveExportPaymentResult,
} from '@/lib/storeOrderWooExport';
import { normalizeStoreOrderPaymentMethod } from '@/lib/storeOrderInsights';
import { buildOrderExcelWorkbook } from '@/lib/storeOrderExcelExport';
import {
  buildCategoryLookup,
  getProductCategoryLabels,
} from '@/lib/categoryLookup';
import { buildProductDetailsCsv } from '@/lib/storeProductDetailsExport';
import { buildCustomerRegistrationWorkbook } from '@/lib/storeCustomerExport';
import {
  STORE_EXPORT_TYPES,
  buildStoreExportDateFilter,
  buildCategoryExportCsv,
  buildExportFilename,
  buildOrderExcelFilename,
  buildCustomerExcelFilename,
} from '@/lib/storeHubExports';

export const dynamic = 'force-dynamic';

function parseAuthHeader(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const parts = auth.split(' ');
  return parts.length === 2 ? parts[1] : null;
}

function csvResponse(csv, filename, count) {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Export-Count': String(count),
    },
  });
}

function excelResponse(buffer, filename, count) {
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Export-Count': String(count),
    },
  });
}

export async function GET(request) {
  try {
    const token = parseAuthHeader(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storeId = await authSeller(decoded.uid);
    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized as seller' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = String(searchParams.get('type') || '').trim().toLowerCase();
    const range = String(searchParams.get('range') || 'full').trim().toLowerCase() === 'custom'
      ? 'custom'
      : 'full';
    const fromDate = String(searchParams.get('fromDate') || '').trim();
    const toDate = String(searchParams.get('toDate') || '').trim();
    const supportsTimeRange = type === 'orders' || type === 'customers';
    const fromTime = supportsTimeRange ? String(searchParams.get('fromTime') || '').trim() : '';
    const toTime = supportsTimeRange ? String(searchParams.get('toTime') || '').trim() : '';

    if (!STORE_EXPORT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${STORE_EXPORT_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    if (type === 'customers' && range === 'custom' && (!fromTime || !toTime)) {
      return NextResponse.json(
        { error: 'Both registration start and end times are required' },
        { status: 400 },
      );
    }

    let dateFilter = {};
    try {
      dateFilter = buildStoreExportDateFilter(range, fromDate, toDate, fromTime, toTime);
    } catch (filterError) {
      return NextResponse.json(
        { error: filterError?.message || 'Invalid date range' },
        { status: filterError?.status || 400 },
      );
    }

    await dbConnect();
    if (type === 'orders') {
      const orders = await Order.find({
        storeId: String(storeId),
        ...ACTIVE_RECORD_FILTER,
        ...dateFilter,
      })
        .populate({ path: 'orderItems.productId', model: 'Product' })
        .sort({ createdAt: -1 })
        .lean();

      const workbook = await buildOrderExcelWorkbook({
        orders,
        detailRows: buildWooCommerceOrderExportRows(orders),
        detailHeaders: WOOCOMMERCE_ORDER_EXPORT_HEADERS,
        resolvePaymentResult: resolveExportPaymentResult,
        resolvePaymentMethod: normalizeStoreOrderPaymentMethod,
        periodLabel: range === 'custom'
          ? `Export range: ${fromDate} ${fromTime || '00:00'} – ${toDate} ${toTime || '23:59'} (Dubai time). Daily rows group orders from 10:00 AM to 10:00 AM next day.`
          : 'All available orders. Daily rows group orders from 10:00 AM to 10:00 AM next day (Dubai time).',
        fromDate: range === 'custom' ? fromDate : '',
        toDate: range === 'custom' ? toDate : '',
        fromTime: range === 'custom' ? fromTime : '',
        toTime: range === 'custom' ? toTime : '',
      });
      return excelResponse(
        workbook,
        buildOrderExcelFilename(range, fromDate, toDate, fromTime, toTime),
        orders.length,
      );
    }

    if (type === 'customers') {
      const [orderedUserIds, trackedFirebaseUids, trackedUserIds] = await Promise.all([
        Order.distinct('userId', {
          storeId: String(storeId),
          isGuest: { $ne: true },
          userId: { $nin: [null, ''] },
        }),
        CustomerBehaviorEvent.distinct('identifier.firebaseUid', {
          storeId: String(storeId),
          'identifier.firebaseUid': { $nin: [null, ''] },
        }),
        CustomerBehaviorEvent.distinct('identifier.userId', {
          storeId: String(storeId),
          'identifier.userId': { $nin: [null, ''] },
        }),
      ]);
      const userIds = [...new Set(
        [...orderedUserIds, ...trackedFirebaseUids, ...trackedUserIds]
          .map((id) => String(id || '').trim())
          .filter(Boolean),
      )];
      const countableOrderFilter = {
        storeId: String(storeId),
        ...ACTIVE_RECORD_FILTER,
        status: { $nin: ['CANCELLED', 'cancelled', 'PAYMENT_FAILED', 'payment_failed'] },
      };
      const historyEmail = {
        $toLower: {
          $trim: {
            input: {
              $ifNull: [
                '$guestEmail',
                { $ifNull: ['$shippingAddress.email', '$shippingAddress.Email'] },
              ],
            },
          },
        },
      };
      const [customers, orders, lifetimeOrderStats, purchaseHistoryStats, marketingExpenses, trafficEvents] = await Promise.all([
        userIds.length
          ? User.find({
              _id: { $in: userIds },
              ...dateFilter,
            })
              .select('_id name email phone referralCode referredByUserId firstVisitLocation createdAt')
              .sort({ createdAt: -1 })
              .lean()
          : [],
        Order.find({
          ...countableOrderFilter,
          ...dateFilter,
        })
          .select('_id userId isGuest guestName guestEmail guestPhone shippingAddress status paymentMethod attribution total createdAt')
          .sort({ createdAt: -1 })
          .lean(),
        userIds.length
          ? Order.aggregate([
              {
                $match: {
                  ...countableOrderFilter,
                  isGuest: { $ne: true },
                  userId: { $in: userIds },
                },
              },
              {
                $group: {
                  _id: '$userId',
                  totalOrders: { $sum: 1 },
                  totalSpent: { $sum: { $ifNull: ['$total', 0] } },
                },
              },
            ])
          : [],
        Order.aggregate([
          { $match: countableOrderFilter },
          {
            $addFields: {
              exportCustomerKey: {
                $switch: {
                  branches: [
                    {
                      case: { $ne: [{ $ifNull: ['$userId', ''] }, ''] },
                      then: { $concat: ['user:', { $toString: '$userId' }] },
                    },
                    {
                      case: { $ne: [historyEmail, ''] },
                      then: { $concat: ['email:', historyEmail] },
                    },
                  ],
                  default: { $concat: ['order:', { $toString: '$_id' }] },
                },
              },
            },
          },
          {
            $group: {
              _id: '$exportCustomerKey',
              totalOrders: { $sum: 1 },
              firstOrderAt: { $min: '$createdAt' },
            },
          },
        ]),
        (() => {
          const expenseFilter = { storeId: String(storeId) };
          if (range === 'custom' && dateFilter.createdAt?.$gte && dateFilter.createdAt?.$lt) {
            expenseFilter.startDate = { $lt: dateFilter.createdAt.$lt };
            expenseFilter.endDate = { $gte: dateFilter.createdAt.$gte };
          } else if (range === 'custom' && dateFilter.createdAt?.$gte && dateFilter.createdAt?.$lte) {
            expenseFilter.startDate = { $lte: dateFilter.createdAt.$lte };
            expenseFilter.endDate = { $gte: dateFilter.createdAt.$gte };
          }
          return MarketingExpense.find(expenseFilter)
            .select('platform amount startDate endDate campaignName')
            .lean();
        })(),
        CustomerBehaviorEvent.find({
          storeId: String(storeId),
          eventType: 'page_view',
          ...dateFilter,
        })
          .select('eventType context.metadata context.sessionId createdAt')
          .lean(),
      ]);
      const periodLabel = range === 'custom'
        ? `Customer registrations and orders: ${fromDate} ${fromTime} to ${toDate} ${toTime} (Dubai time)`
        : 'All available customer registrations and orders (Dubai time)';
      return excelResponse(
        await buildCustomerRegistrationWorkbook({
          customers,
          orders,
          lifetimeOrderStats,
          purchaseHistoryStats,
          marketingExpenses,
          trafficEvents,
          periodLabel,
          currency: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'AED',
          dateRange: range === 'custom' ? { fromDate, fromTime, toDate, toTime } : {},
        }),
        buildCustomerExcelFilename(range, fromDate, toDate, fromTime, toTime),
        customers.length,
      );
    }

    const filename = buildExportFilename(type, range, fromDate, toDate);

    if (type === 'products') {
      const [products, categories] = await Promise.all([
        Product.find({
          storeId: String(storeId),
          ...dateFilter,
        })
          .select([
            'name', 'nameAr', 'slug', 'sku', 'brand', 'brandAr',
            'description', 'descriptionAr', 'shortDescription', 'shortDescriptionAr', 'shortDescription2',
            'AED', 'price', 'costPrice', 'images', 'externalImages',
            'category', 'categories', 'tags',
            'published', 'inStock', 'stockQuantity', 'soldCount',
            'hasVariants', 'variants',
            'fastDelivery', 'freeShippingEligible',
            'hsCode', 'originCountry', 'shippingWeightKg',
            'useProductsPath', 'allowReturn', 'allowReplacement',
            'imageAspectRatio',
            'seoTitle', 'seoDescription', 'seoKeywords',
            'createdAt', 'updatedAt',
          ].join(' '))
          .sort({ createdAt: -1 })
          .lean(),
        Category.find({})
          .select('_id name nameAr slug legacySourceId parentId')
          .lean(),
      ]);

      const categoryLookup = buildCategoryLookup(categories);
      const enriched = products.map((product) => ({
        ...product,
        categoryNames: getProductCategoryLabels(product, categoryLookup),
      }));
      const csv = buildProductDetailsCsv(enriched);
      return csvResponse(csv, filename, enriched.length);
    }

    // categories — global catalog; date filter applies to category createdAt when custom
    const categories = await Category.find({ ...dateFilter })
      .select([
        '_id', 'name', 'nameAr', 'slug', 'parentId', 'level', 'sortOrder',
        'isActive', 'url', 'metaTitle', 'metaDescription', 'createdAt', 'updatedAt',
      ].join(' '))
      .sort({ level: 1, sortOrder: 1, name: 1 })
      .lean();

    const csv = buildCategoryExportCsv(categories);
    return csvResponse(csv, filename, categories.length);
  } catch (error) {
    console.error('[GET /api/store/exports]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to export' },
      { status: 500 },
    );
  }
}
