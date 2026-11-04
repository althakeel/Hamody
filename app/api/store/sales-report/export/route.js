import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';
import MarketingExpense from '@/models/MarketingExpense';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@/lib/firebase-admin';
import { ACTIVE_RECORD_FILTER } from '@/lib/storeTrash';
import {
    buildProductCostMap,
    buildSalesReportDateFilter,
    calculateOrderProductCost,
    getSalesReportOrderBucket,
    getSalesReportPaymentBucketLabel,
    shouldCountSalesReportRevenue,
} from '@/lib/storeSalesReport';
import {
    getOrderNetRevenue,
    loadCompletedReturnRefundsByOrderId,
} from '@/lib/returnSalesAdjustments';
import {
    buildSalesReportWorkbook,
    getSalesReportExportFileName,
    getSalesReportPeriodParts,
    writeSalesReportWorkbook,
} from '@/lib/storeSalesReportExport';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        await connectDB();

        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        const decoded = await getAuth().verifyIdToken(token);
        if (!decoded?.uid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const storeId = await authSeller(decoded.uid);
        if (!storeId) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const dateRange = searchParams.get('dateRange') || 'THIS_MONTH';
        const fromDate = searchParams.get('fromDate');
        const toDate = searchParams.get('toDate');
        const dateFilter = buildSalesReportDateFilter(dateRange, fromDate, toDate);

        const [orders, marketingExpenses] = await Promise.all([
            Order.find({
                storeId,
                ...dateFilter,
                ...ACTIVE_RECORD_FILTER,
                status: { $ne: 'CANCELLED' },
            })
                .select('shortOrderNumber createdAt total shippingFee codFee status orderItems paymentMethod paymentStatus isPaid delhivery')
                .sort({ createdAt: 1 })
                .lean(),
            MarketingExpense.find({ storeId, ...dateFilter }).select('amount').lean(),
        ]);

        const revenueOrders = orders.filter((order) => shouldCountSalesReportRevenue(order));
        const productCostMap = await buildProductCostMap(revenueOrders, Product);
        const refundByOrderId = await loadCompletedReturnRefundsByOrderId(storeId, {
            orderIds: orders.map((order) => String(order._id)),
        });
        const marketingCosts = marketingExpenses.reduce(
            (sum, expense) => sum + Number(expense.amount || 0),
            0,
        );

        const orderRows = orders.map((order) => {
            const paymentBucket = getSalesReportOrderBucket(order);
            const countsTowardRevenue = shouldCountSalesReportRevenue(order);
            const refunded = refundByOrderId.get(String(order._id)) || 0;
            const productCost = countsTowardRevenue
                ? calculateOrderProductCost(order, productCostMap)
                : 0;
            const deliveryCost = countsTowardRevenue
                ? Math.max(0, Number(order.shippingFee || 0) - Number(order.codFee || 0))
                : 0;
            const grossRevenue = Number(order.total || 0);
            const netRevenue = countsTowardRevenue ? getOrderNetRevenue(order, refunded) : 0;
            const profit = countsTowardRevenue ? netRevenue - productCost - deliveryCost : 0;

            return {
                orderNumber: order.shortOrderNumber || '',
                status: order.status || '',
                paymentBucket,
                paymentLabel: getSalesReportPaymentBucketLabel(paymentBucket),
                countsTowardRevenue,
                period: getSalesReportPeriodParts(order.createdAt),
                grossRevenue,
                refunded: countsTowardRevenue ? refunded : 0,
                netRevenue,
                productCost,
                deliveryCost,
                profit,
            };
        });

        const workbook = buildSalesReportWorkbook({
            orderRows,
            dateRange,
            fromDate,
            toDate,
            marketingCosts,
            currency: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'AED',
        });
        const buffer = writeSalesReportWorkbook(workbook);
        const fileName = getSalesReportExportFileName(dateRange, fromDate, toDate);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        });
    } catch (error) {
        console.error('Sales report export error:', error);
        return NextResponse.json(
            { error: 'Failed to export report' },
            { status: 500 },
        );
    }
}
