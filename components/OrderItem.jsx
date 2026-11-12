'use client'
import Image from "@/components/SafeNextImage";
import { DotIcon, Download, Printer, RefreshCw, Undo2, ChevronDown, ChevronUp } from "lucide-react";
import { useSelector } from "react-redux";
import Rating from "./Rating";
import { useState, useEffect } from "react";
import RatingModal from "./RatingModal";
import { downloadInvoice, printInvoice } from "@/lib/generateInvoice";
import Link from "next/link";
import axios from "axios";
import { useStorefrontMarket } from '@/lib/useStorefrontMarket';
import { AedText } from '@/components/CurrencySymbol';
import { getProductThumbnailUrl } from '@/lib/productMedia';
import { getDisplayOrderNumber, getOrderLineProduct, getOrderMongoId, getPublicTrackingDisplayId } from '@/lib/orderDisplay';

const OrderItem = ({ order: initialOrder }) => {

    const { market, formatAmount } = useStorefrontMarket();
    const currency = market.currency;
    const money = (amount) => (
      <AedText currency={currency}>{`${currency}${formatAmount(amount)}`}</AedText>
    );
    const [ratingModal, setRatingModal] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const [order, setOrder] = useState(initialOrder);
    const [refreshing, setRefreshing] = useState(false);

    const { ratings } = useSelector(state => state.rating);
    
    // Helper function to compute correct payment status
    const getPaymentStatus = () => {
        // Auto-mark COD orders as PAID if delivered
        const paymentMethod = (order.paymentMethod || '').toLowerCase();
        const status = (order.status || '').toUpperCase();
        
        if (paymentMethod === 'cod' && status === 'DELIVERED') {
            return true;
        }
        
        if (order.delhivery?.payment?.is_cod_recovered) {
            return true;
        }
        
        return order.isPaid || false;
    }
    
    // Auto-refresh tracking data every 30 seconds when expanded
    useEffect(() => {
        const trackingRef = getPublicTrackingDisplayId(order) || order.trackingId;
        if (!expanded || !trackingRef) return;

        const fetchTrackingData = async () => {
            try {
                setRefreshing(true);
                const response = await axios.get(`/api/track-order?awb=${encodeURIComponent(trackingRef)}`);
                if (response.data.success && response.data.order) {
                    // Update order with fresh tracking data
                    const updatedOrder = {
                        ...order,
                        waslah: response.data.order.waslah || order.waslah,
                        status: response.data.order.status || order.status,
                        trackingId: response.data.order.trackingId || order.trackingId,
                        trackingUrl: response.data.order.trackingUrl || order.trackingUrl,
                        courier: response.data.order.courier || order.courier,
                    };
                    
                    // Auto-mark COD orders as PAID if they're DELIVERED
                    if ((updatedOrder.paymentMethod === 'cod' || updatedOrder.paymentMethod === 'COD') && updatedOrder.status === 'DELIVERED') {
                        updatedOrder.isPaid = true;
                    }
                    
                    setOrder(updatedOrder);
                }
            } catch (error) {
                console.error('Auto-refresh tracking error:', error);
            } finally {
                setRefreshing(false);
            }
        };

        // Fetch immediately when expanded
        fetchTrackingData();

        // Set up 30-second interval
        const interval = setInterval(fetchTrackingData, 30000);

        // Cleanup interval on unmount or when collapsed
        return () => clearInterval(interval);
    }, [expanded, order.trackingId, order?.waslah?.trackingNumber]);
    
    const isDelivered = order.status === 'DELIVERED';
    const deliveredDate = order.orderDelivered || order.whatsappSentAt?.orderDelivered || order.updatedAt
      ? new Date(order.orderDelivered || order.whatsappSentAt?.orderDelivered || order.updatedAt)
      : null;
    const daysSinceDelivery = deliveredDate ? Math.floor((new Date() - deliveredDate) / (1000 * 60 * 60 * 24)) : 999;
    const orderMongoId = getOrderMongoId(order);
    const hasReturnableProduct = order.orderItems?.some((item) => getOrderLineProduct(item).allowReturn !== false);
    const hasReplaceableProduct = order.orderItems?.some((item) => getOrderLineProduct(item).allowReplacement !== false);
    const returnRequests = Array.isArray(order.returnRequests) && order.returnRequests.length
      ? order.returnRequests
      : (order.returns || []).map((row) => ({
          returnNumber: row.returnNumber,
          type: row.type,
          status: row.workflowStatus || row.status,
          statusLabel: row.workflowStatus || row.status,
          eligibilityReason: row.eligibilityReason || row.rejectionReason || '',
        }));
    const canReturnReplace = isDelivered && (
      (hasReturnableProduct && daysSinceDelivery <= 7)
      || (hasReplaceableProduct && daysSinceDelivery <= 15)
      || returnRequests.some((req) => String(req.status || '').toUpperCase() === 'INFO_REQUIRED')
    );

    return (
        <>
            {/* Card Layout instead of Table Row */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <p className="text-sm text-slate-500">Order No</p>
                            <p className="font-semibold text-slate-800">{getDisplayOrderNumber(order) || 'Pending'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Date</p>
                            <p className="font-medium text-slate-700">{new Date(order.createdAt).toDateString()}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Total</p>
                            <p className="font-bold text-slate-800 text-lg">{money(order.total)}</p>
                        </div>
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-2"
                        >
                            {expanded ? (
                                <>
                                    Hide Details <ChevronUp size={16} />
                                </>
                            ) : (
                                <>
                                    View Details <ChevronDown size={16} />
                                </>
                            )}
                        </button>
                    </div>

                    {/* Product Preview Thumbnails */}
                    {order.orderItems.length > 0 && (
                        <div className="flex gap-3 items-center mt-4">
                            <p className="text-xs text-slate-500 font-medium">Products:</p>
                            <div className="flex gap-2 flex-wrap">
                                {order.orderItems.slice(0, 4).map((item, idx) => {
                                    const product = getOrderLineProduct(item)
                                    return (
                                        <div key={idx} className="relative">
                                            <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                                {getProductThumbnailUrl(product, { fallback: '' }) ? (
                                                    <Image
                                                        src={getProductThumbnailUrl(product)}
                                                        alt={product.name}
                                                        width={64}
                                                        height={64}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No image</div>
                                                )}
                                            </div>
                                            {item.quantity > 1 && (
                                                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                                                    {item.quantity}
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                                {order.orderItems.length > 4 && (
                                    <div className="w-16 h-16 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">
                                        +{order.orderItems.length - 4}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Expanded Details */}
                {expanded && (
                    <div className="p-6 space-y-6">
                        {/* Products */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-800 mb-3">Order Items ({order.orderItems.length})</h3>
                            <div className="space-y-3">
                                {order.orderItems.map((item, idx) => {
                                    const product = getOrderLineProduct(item)
                                    return (
                                        <div key={idx} className="flex items-start gap-4 pb-4 border-b border-slate-100 last:border-0">
                                            <div className="w-24 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                                                {getProductThumbnailUrl(product, { fallback: '' }) ? (
                                                    <Image
                                                        src={getProductThumbnailUrl(product)}
                                                        alt={product.name}
                                                        width={96}
                                                        height={96}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">No image</div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-slate-800 text-sm mb-1">{product.name || 'Product'}</h4>
                                                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                                                    <div>
                                                        <p className="text-xs text-slate-500">Quantity</p>
                                                        <p className="font-medium text-slate-800">{item.quantity}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500">Unit Price</p>
                                                        <p className="font-medium text-slate-800">{money(item.price || 0)}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    {ratings.find(rating => orderMongoId === rating.orderId && product._id === rating.productId)
                                                        ? <Rating value={ratings.find(rating => orderMongoId === rating.orderId && product.id === rating.productId).rating} />
                                                        : order.status === "DELIVERED" && (
                                                            <button 
                                                                onClick={() => setRatingModal({ orderId: orderMongoId, productId: product._id })} 
                                                                className="text-green-600 hover:bg-green-50 px-2 py-1 rounded text-xs transition"
                                                            >
                                                                Rate Product
                                                            </button>
                                                        )
                                                    }
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-500 mb-1">Line Total</p>
                                                <p className="font-bold text-slate-800 text-lg">{money((item.price || 0) * (item.quantity || 0))}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-5">
                          <h3 className="text-sm font-semibold text-slate-800 mb-4">Payment Summary</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Subtotal:</span>
                              <span className="font-medium text-slate-800">{money((order.total || 0) - (order.shippingFee || 0))}</span>
                            </div>
                            {order.shippingFee > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Shipping:</span>
                                <span className="font-medium text-slate-800">{money(order.shippingFee || 0)}</span>
                              </div>
                            )}
                            {order.isCouponUsed && (
                              <div className="flex justify-between text-sm">
                                <span className="text-green-600">Discount Applied:</span>
                                <span className="font-medium text-green-600">-{money(order.coupon?.discount || 0)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-bold text-slate-800 pt-3 border-t border-slate-300">
                              <span>Total Amount:</span>
                              <span className="text-lg">{money(order.total || 0)}</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-300">
                              <p className="text-xs text-slate-600 mb-3">Payment Method & Status</p>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                                  <div>
                                    <p className="text-xs text-slate-500 mb-1">Payment Method</p>
                                    <p className="text-sm font-semibold text-slate-800">
                                      {order.paymentMethod === 'cod' || order.paymentMethod === 'COD'
                                        ? (order.customerPickup ? '💵 Cash on Pickup' : '💵 Cash on Delivery')
                                        : order.paymentMethod || 'Not specified'}
                                    </p>
                                  </div>
                                  <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap ${
                                    getPaymentStatus() ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {getPaymentStatus() ? '✓ PAID' : '⏳ PENDING'}
                                  </span>
                                </div>
                                
                                {/* COD Status Details */}
                                {(order.paymentMethod === 'cod' || order.paymentMethod === 'COD') && (
                                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <p className="text-xs text-amber-700 font-medium">
                                      {getPaymentStatus() ? '✓ Payment collected from customer' : '⏳ Awaiting payment at delivery'}
                                    </p>
                                    {!getPaymentStatus() && (
                                      <p className="text-xs text-amber-600 mt-1">
                                                                                Rider will collect {money(order.total || 0)} during delivery
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Live Delivery Tracking - EXACT SAME AS DASHBOARD */}
                        {(getPublicTrackingDisplayId(order) || order.trackingId || order.trackingUrl || order.courier || order.waslah) && (
                            <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-blue-200 rounded-xl p-6 space-y-5">
                                {/* Header with Auto-Refresh Indicator */}
                                <div className="flex items-center justify-between pb-4 border-b-2 border-blue-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800">Live Delivery Tracking</h3>
                                    </div>

                                </div>

                                {/* Current Location - Prominent Green Box */}
                                

                                {/* Status Section */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                    <p className="text-xs font-semibold text-slate-500 mb-2">Status</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {order.status || 'Processing'}
                                    </p>
                                    
                                </div>

                                {/* Expected Delivery Section */}
                                

                                {/* Tracking Details */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                                    <div className="space-y-3 text-sm">
                                        {order.courier && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-600 font-medium">Courier</span>
                                                <span className="font-semibold text-slate-800 capitalize">{order.courier}</span>
                                            </div>
                                        )}
                                        {getPublicTrackingDisplayId(order) ? (
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-600 font-medium">Tracking number</span>
                                                <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-3 py-1 rounded">{getPublicTrackingDisplayId(order)}</span>
                                            </div>
                                        ) : null}
                                    </div>
                                    
                                    {order.trackingUrl && (
                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <a 
                                                href={order.trackingUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="w-full inline-block text-center px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition"
                                            >
                                                ⚡ Track Your Order
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Tracking History Timeline */}
                                

                                
                            </div>
                        )}

                        {/* Shipping Address */}
                        {order.address && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 mb-3">Shipping Address</h3>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600 space-y-1">
                                    <p className="font-bold text-slate-800">{order.address.name}</p>
                                    <p>{order.address.street}</p>
                                    <p>{order.address.city}, {order.address.state} {order.address.zip}</p>
                                    <p>{order.address.country}</p>
                                    {order.address.phone && <p className="font-medium text-slate-800 mt-2">📞 {order.address.phone}</p>}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
                            <button
                                onClick={() => downloadInvoice(order)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                            >
                                <Download size={16} />
                                Download Invoice
                            </button>
                            <button
                                onClick={() => printInvoice(order)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition text-sm font-medium"
                            >
                                <Printer size={16} />
                                Print Invoice
                            </button>
                            {canReturnReplace && (
                                <Link 
                                    href={`/return-request?orderId=${orderMongoId}`}
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm font-medium"
                                >
                                    <RefreshCw size={16} />
                                    Return / Replace
                                </Link>
                            )}
                            {returnRequests.length > 0 && (
                                <div className="w-full text-sm text-slate-700 space-y-1">
                                    {returnRequests.map((req, idx) => (
                                        <p key={req.id || req.returnNumber || idx}>
                                            {req.returnNumber || 'Return'} · {req.statusLabel || req.status}
                                            {req.pickup?.scheduledFor ? ` · Pickup ${req.pickup.scheduledFor}` : ''}
                                            {req.pickup?.riderName ? ` · Rider: ${req.pickup.riderName}` : ''}
                                            {req.refund?.customerMessage ? ` · ${req.refund.customerMessage}` : ''}
                                            {req.eligibilityReason ? ` — ${req.eligibilityReason}` : ''}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {ratingModal && <RatingModal ratingModal={ratingModal} setRatingModal={setRatingModal} />}
        </>
    )
}

export default OrderItem