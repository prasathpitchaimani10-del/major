import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  RotateCcw,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Clock,
  Printer,
  ArrowRight,
} from 'lucide-react';
import { apiRequest, formatINR } from '../services/api';
import { Order } from '../types';
import { useStore } from '../context/StoreContext';
import {
  EmptyState,
  ErrorState,
  ResilientImage,
  ConfirmationDialog,
} from '../components/CommonUI';

// 1. Customer Orders List Page
export const OrdersListPage: React.FC = () => {
  const { user, refreshCart, showToast } = useStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await apiRequest('/orders');
      setOrders(res.data.orders || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  if (!user) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12">
        <EmptyState
          title="Sign In to View Your Order History"
          description="Track active shipments, download GST tax invoices, and manage returns."
          actionLabel="Sign In"
          actionTo="/login"
        />
      </div>
    );
  }

  const handleReorder = async (orderId: string) => {
    try {
      const res = await apiRequest(`/orders/${orderId}/reorder`, { method: 'POST' });
      await refreshCart();
      showToast(res.message, 'success');
      navigate('/cart');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10 space-y-8">
      <div className="border-b border-zinc-200 pb-5">
        <h1 className="font-display text-3xl font-bold text-zinc-900">
          My Orders ({orders.length})
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Historical purchase pricing, tax invoices, and real-time shipment timelines.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-zinc-500">
          Loading order history...
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadOrders} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No Orders Placed Yet"
          description="Once you place an order, its full tracking timeline and GST invoice will appear here."
          actionLabel="Explore Catalog"
          actionTo="/products"
        />
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden"
            >
              {/* Order Header Bar */}
              <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <p className="text-zinc-500">Order Number</p>
                    <p className="font-mono font-bold text-zinc-900">
                      {order.orderNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Placed On</p>
                    <p className="font-medium text-zinc-800">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Total Amount</p>
                    <p className="font-mono font-bold text-zinc-900">
                      {formatINR(order.pricing.finalTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Status</p>
                    <p className="font-semibold text-zinc-900">
                      {order.orderStatus} · {order.paymentMethod} ({order.paymentStatus})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReorder(order.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reorder</span>
                  </button>
                  <Link
                    to={`/orders/${order.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
                  >
                    <span>Order Details &amp; Invoice</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Order Line Items */}
              <div className="p-6 divide-y divide-zinc-100">
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-14 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                        <ResilientImage
                          src={item.productImage}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <Link
                          to={`/products/${item.productSlug}`}
                          className="text-sm font-semibold text-zinc-900 hover:text-amber-800"
                        >
                          {item.productName}
                        </Link>
                        <p className="text-xs text-zinc-500">
                          {item.variantLabel} · SKU: {item.sku} · Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs font-mono">
                      <p className="font-semibold text-zinc-900">
                        {formatINR(item.itemSubtotal)}
                      </p>
                      <p className="text-zinc-400">
                        {formatINR(item.unitPriceAtPurchase)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 2. Order Details, Timeline Tracking, Cancellation, Return/Replacement & Printable GST Invoice Page
export const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshCart, showToast } = useStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancel Dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(
    'Ordered by mistake / Changing configuration'
  );

  // Return / Replacement Form
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnType, setReturnType] = useState<'Return' | 'Replacement'>('Return');
  const [returnReason, setReturnReason] = useState('Defective / Transit Damage');
  const [returnDesc, setReturnDesc] = useState('');
  const [returnImageUrl, setReturnImageUrl] = useState('');

  // Printable Invoice Mode
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/orders/${id}`);
      setOrder(res.data.order);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleConfirmCancel = async () => {
    if (!order) return;
    try {
      const res = await apiRequest(`/orders/${order.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason }),
      });
      setOrder(res.data.order);
      setCancelDialogOpen(false);
      showToast('Order cancelled and stock restored.', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    try {
      const res = await apiRequest(`/orders/${order.id}/return`, {
        method: 'POST',
        body: JSON.stringify({
          type: returnType,
          reason: returnReason,
          description: returnDesc,
          images: returnImageUrl.trim() ? [returnImageUrl.trim()] : [],
        }),
      });
      setOrder(res.data.order);
      setShowReturnForm(false);
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleReorder = async () => {
    if (!order) return;
    try {
      const res = await apiRequest(`/orders/${order.id}/reorder`, { method: 'POST' });
      await refreshCart();
      showToast(res.message, 'success');
      navigate('/cart');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12 text-center text-xs text-zinc-500">
        Loading order details...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12">
        <ErrorState message={error || 'Order not found.'} onRetry={loadOrder} />
      </div>
    );
  }

  const canCancel = ['Pending', 'Confirmed', 'Processing'].includes(order.orderStatus);
  const canReturn =
    order.orderStatus === 'Delivered' && !order.returnRequest.isRequested;

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 pb-6 no-print">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <Link to="/orders" className="hover:text-zinc-900">
              My Orders
            </Link>
            <span aria-hidden="true">/</span>
            <span className="font-mono text-zinc-900">{order.orderNumber}</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-zinc-900">
            Order #{order.orderNumber}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Invoice: <span className="font-mono">{order.invoiceNumber}</span> · Placed on{' '}
            {new Date(order.createdAt).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowInvoiceModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tax Invoice</span>
          </button>

          <button
            type="button"
            onClick={handleReorder}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reorder Items</span>
          </button>

          {canCancel && (
            <button
              type="button"
              onClick={() => setCancelDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Order</span>
            </button>
          )}

          {canReturn && (
            <button
              type="button"
              onClick={() => setShowReturnForm((p) => !p)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-900 bg-amber-100/80 border border-amber-300 rounded-lg hover:bg-amber-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Request Return / Replacement</span>
            </button>
          )}
        </div>
      </div>

      {/* Return / Replacement Request Form */}
      {showReturnForm && (
        <form
          onSubmit={handleReturnSubmit}
          className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 no-print"
        >
          <h3 className="text-base font-semibold text-zinc-900">
            Submit Return or Replacement Request
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Request Type
              </label>
              <select
                value={returnType}
                onChange={(e) => setReturnType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
              >
                <option value="Return">Return for Full Refund</option>
                <option value="Replacement">Unit Replacement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Primary Reason
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
              >
                <option value="Defective / Transit Damage">
                  Defective / Transit Damage
                </option>
                <option value="Missing Accessories">Missing Accessories</option>
                <option value="Specification Mismatch">Specification Mismatch</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Detailed Description
            </label>
            <textarea
              rows={2}
              required
              value={returnDesc}
              onChange={(e) => setReturnDesc(e.target.value)}
              placeholder="Describe the issue observed..."
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Optional Inspection Photo URL
            </label>
            <input
              type="text"
              value={returnImageUrl}
              onChange={(e) => setReturnImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowReturnForm(false)}
              className="px-4 py-2 text-xs text-zinc-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-lg"
            >
              Submit Request
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 no-print">
        {/* Left Column: Items & Timeline */}
        <div className="lg:col-span-8 space-y-6">
          {/* Purchased Items Snapshot */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-3">
              Purchased Instruments (Historical Price Snapshot)
            </h2>
            <div className="divide-y divide-zinc-100">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="py-3.5 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-14 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                      <ResilientImage
                        src={item.productImage}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <Link
                        to={`/products/${item.productSlug}`}
                        className="text-sm font-semibold text-zinc-900 hover:underline"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-zinc-500">
                        {item.variantLabel} · SKU: <span className="font-mono">{item.sku}</span>
                      </p>
                      <p className="text-zinc-500">
                        Qty: {item.quantity} × {formatINR(item.unitPriceAtPurchase)}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-sm text-zinc-900">
                    {formatINR(item.itemSubtotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Status History & Tracking Timeline */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-sm font-semibold text-zinc-900">
                Fulfillment &amp; Tracking Timeline
              </h2>
              <span className="text-xs font-semibold text-zinc-900">
                Current Status: {order.orderStatus}
              </span>
            </div>

            <div className="space-y-4 relative pl-5 border-l-2 border-zinc-200 ml-2">
              {order.statusHistory.map((ev, idx) => (
                <div key={idx} className="relative space-y-0.5">
                  <div className="w-3 h-3 rounded-full bg-zinc-900 absolute -left-[27px] top-1 ring-4 ring-white" />
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-zinc-900">{ev.status}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[11px] text-zinc-500">
                      {new Date(ev.timestamp).toLocaleString('en-IN')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[11px] text-zinc-500">{ev.actor}</span>
                  </div>
                  <p className="text-xs text-zinc-600">{ev.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing, Address & Refund Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-3">
              Financial Summary
            </h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between text-zinc-600">
                <dt>Original MRP Subtotal</dt>
                <dd className="font-mono">{formatINR(order.pricing.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-emerald-700">
                <dt>Product Discount</dt>
                <dd className="font-mono">−{formatINR(order.pricing.productDiscount)}</dd>
              </div>
              {order.pricing.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Coupon ({order.pricing.couponCode})</dt>
                  <dd className="font-mono">
                    −{formatINR(order.pricing.couponDiscount)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between text-zinc-600">
                <dt>Taxable Value</dt>
                <dd className="font-mono">{formatINR(order.pricing.taxableAmount)}</dd>
              </div>
              <div className="flex justify-between text-zinc-600">
                <dt>GST ({order.pricing.gstRatePercent}%)</dt>
                <dd className="font-mono">+{formatINR(order.pricing.gstTaxAmount)}</dd>
              </div>
              <div className="flex justify-between text-zinc-600">
                <dt>Delivery ({order.pricing.deliveryMethod})</dt>
                <dd className="font-mono">
                  {order.pricing.deliveryFee === 0
                    ? 'Free'
                    : formatINR(order.pricing.deliveryFee)}
                </dd>
              </div>
              <div className="flex justify-between text-base font-bold text-zinc-900 border-t border-zinc-200 pt-2.5">
                <dt>Grand Total</dt>
                <dd className="font-mono">{formatINR(order.pricing.finalTotal)}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-2 text-xs">
            <h3 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2.5 mb-2">
              Delivery Address Snapshot
            </h3>
            <p className="font-semibold text-zinc-900">{order.addressSnapshot.name}</p>
            <p className="text-zinc-600">
              {order.addressSnapshot.houseFlat}, {order.addressSnapshot.street}
            </p>
            <p className="text-zinc-600">
              {order.addressSnapshot.area}, {order.addressSnapshot.city},{' '}
              {order.addressSnapshot.state} — {order.addressSnapshot.pincode}
            </p>
            <p className="text-zinc-500 pt-1">Phone: {order.addressSnapshot.phone}</p>
          </div>

          {/* Refund & Return Ledger Box */}
          {(order.refundInfo.status !== 'None' || order.returnRequest.isRequested) && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-2 text-xs">
              <h3 className="text-sm font-semibold text-amber-950">
                Return &amp; Refund Ledger
              </h3>
              {order.returnRequest.isRequested && (
                <p className="text-amber-900">
                  {order.returnRequest.type} Status:{' '}
                  <span className="font-semibold">{order.returnRequest.status}</span> (
                  {order.returnRequest.reason})
                </p>
              )}
              {order.refundInfo.status !== 'None' && (
                <div className="space-y-1 pt-1">
                  <p className="text-emerald-900 font-semibold">
                    Refund Status: {order.refundInfo.status} (
                    {formatINR(order.refundInfo.amount)})
                  </p>
                  <p className="font-mono text-[11px] text-zinc-600">
                    Gateway Ref: {order.refundInfo.providerReference}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Printable Professional GST Tax Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-3xl w-full p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-start justify-between border-b border-zinc-200 pb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-zinc-900">
                  Krono &amp; Co. Retail Pvt. Ltd.
                </h2>
                <p className="text-xs text-zinc-500">
                  Maker Chambers VI, Nariman Point, Mumbai 400021 · GSTIN: 27AAFCK4021L1Z8
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-mono font-bold text-sm text-zinc-900">TAX INVOICE</p>
                <p className="font-mono text-zinc-600">{order.invoiceNumber}</p>
                <p className="text-zinc-500">
                  Date: {new Date(order.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <p className="font-semibold text-zinc-900 mb-1">Billed &amp; Shipped To:</p>
                <p className="font-medium text-zinc-800">{order.addressSnapshot.name}</p>
                <p className="text-zinc-600">
                  {order.addressSnapshot.houseFlat}, {order.addressSnapshot.street}
                </p>
                <p className="text-zinc-600">
                  {order.addressSnapshot.city}, {order.addressSnapshot.state} —{' '}
                  {order.addressSnapshot.pincode}
                </p>
                <p className="text-zinc-600">Phone: {order.addressSnapshot.phone}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-zinc-900 mb-1">Order &amp; Payment Info:</p>
                <p className="font-mono text-zinc-700">Order: {order.orderNumber}</p>
                <p className="text-zinc-700">
                  Payment Method: {order.paymentMethod} ({order.paymentStatus})
                </p>
                {order.paymentDetails.gatewayPaymentId && (
                  <p className="font-mono text-zinc-500">
                    Txn ID: {order.paymentDetails.gatewayPaymentId}
                  </p>
                )}
              </div>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-y border-zinc-200 bg-zinc-50">
                  <th className="py-2.5 px-3">Item &amp; SKU</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-zinc-900">{item.productName}</p>
                      <p className="text-zinc-500 font-mono">
                        {item.sku} · {item.variantLabel}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono">
                      {formatINR(item.unitPriceAtPurchase)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold">
                      {formatINR(item.itemSubtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end border-t border-zinc-200 pt-4">
              <dl className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Taxable Net Amount:</dt>
                  <dd className="font-mono">{formatINR(order.pricing.taxableAmount)}</dd>
                </div>
                {order.pricing.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>Coupon Discount:</dt>
                    <dd className="font-mono">
                      −{formatINR(order.pricing.couponDiscount)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-zinc-500">IGST (18%):</dt>
                  <dd className="font-mono">{formatINR(order.pricing.gstTaxAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Shipping &amp; Handling:</dt>
                  <dd className="font-mono">{formatINR(order.pricing.deliveryFee)}</dd>
                </div>
                <div className="flex justify-between text-sm font-bold text-zinc-900 border-t border-zinc-200 pt-2">
                  <dt>Invoice Total:</dt>
                  <dd className="font-mono">{formatINR(order.pricing.finalTotal)}</dd>
                </div>
              </dl>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 text-xs font-medium bg-zinc-100 text-zinc-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={cancelDialogOpen}
        title={`Cancel Order #${order.orderNumber}?`}
        description="Cancelling this order will immediately release reserved inventory back to stock. If you paid online, a full refund will be automatically initiated to your original payment method."
        confirmLabel="Confirm Cancellation"
        variant="danger"
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelDialogOpen(false)}
      />
    </div>
  );
};
