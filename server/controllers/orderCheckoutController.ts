import { Response } from 'express';
import { dbStore } from '../models/store';
import { OrderDoc, PaymentMethodType, PaymentDoc } from '../models/types';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { calculateOrderPricing, CheckoutLineRequest } from '../services/pricingService';
import { PaymentGatewayService } from '../services/paymentService';

/**
 * Preview & Recalculate Checkout Totals on the Backend.
 * Supports both standard Cart checkout and isolated "Buy Now" single-item checkout.
 */
export const calculateCheckoutPreview = (req: AuthRequest, res: Response) => {
  const {
    buyNowItem,
    couponCode,
    deliveryMethod = 'Standard',
  }: {
    buyNowItem?: CheckoutLineRequest;
    couponCode?: string | null;
    deliveryMethod?: 'Standard' | 'Express' | 'WhiteGlove';
  } = req.body;

  let lines: CheckoutLineRequest[] = [];
  let effectiveCoupon = couponCode;

  if (buyNowItem && buyNowItem.productId) {
    // Direct Buy Now flow — does not mutate or duplicate cart items
    lines = [
      {
        productId: buyNowItem.productId,
        variantId: buyNowItem.variantId,
        quantity: Number(buyNowItem.quantity) || 1,
      },
    ];
  } else {
    const cart = dbStore.carts.find((c) => c.userId === req.user!.id);
    const activeCartItems = cart?.items.filter((i) => !i.savedForLater) || [];
    if (activeCartItems.length === 0) {
      return sendError(res, 'Your shopping bag is empty.', [], 400);
    }
    lines = activeCartItems.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
    }));
    if (effectiveCoupon === undefined) {
      effectiveCoupon = cart?.appliedCouponCode || null;
    }
  }

  const calculation = calculateOrderPricing(
    lines,
    effectiveCoupon,
    deliveryMethod,
    Boolean(couponCode)
  );

  return sendSuccess(res, 'Checkout summary calculated on server.', {
    calculation,
  });
};

/**
 * Create Order + Initialize Payment Session (or confirm COD).
 * Enforces idempotency, stock deduction, coupon usage increment, and historical price snapshots.
 */
export const createOrder = (req: AuthRequest, res: Response) => {
  const {
    addressId,
    deliveryMethod = 'Standard',
    paymentMethod,
    couponCode,
    buyNowItem,
    idempotencyKey = '',
  } = req.body;

  const user = dbStore.users.find((u) => u.id === req.user!.id);
  if (!user) return sendError(res, 'User not found.', [], 404);

  // Prevent duplicate order creation via idempotency key
  if (idempotencyKey) {
    const existingOrder = dbStore.orders.find(
      (o) => o.userId === user.id && o.idempotencyKey === idempotencyKey
    );
    if (existingOrder) {
      return sendSuccess(res, 'Order already created.', { order: existingOrder });
    }
  }

  const address = user.addresses.find((a) => a.id === addressId);
  if (!address) {
    return sendError(res, 'Please select a valid delivery address.', [], 400);
  }

  const validPaymentMethods: PaymentMethodType[] = [
    'UPI',
    'Card',
    'NetBanking',
    'Wallet',
    'COD',
  ];
  if (!validPaymentMethods.includes(paymentMethod)) {
    return sendError(res, 'Please select a valid payment method.', [], 400);
  }

  let lines: CheckoutLineRequest[] = [];
  const isBuyNow = Boolean(buyNowItem && buyNowItem.productId);
  const cart = dbStore.carts.find((c) => c.userId === user.id);

  if (isBuyNow) {
    lines = [
      {
        productId: buyNowItem.productId,
        variantId: buyNowItem.variantId,
        quantity: Number(buyNowItem.quantity) || 1,
      },
    ];
  } else {
    const activeCartItems = cart?.items.filter((i) => !i.savedForLater) || [];
    if (activeCartItems.length === 0) {
      return sendError(res, 'Cannot place an order with an empty cart.', [], 400);
    }
    lines = activeCartItems.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
    }));
  }

  const effectiveCoupon =
    couponCode !== undefined ? couponCode : cart?.appliedCouponCode || null;

  // Authoritative server recalculation & stock check
  const pricingSummary = calculateOrderPricing(
    lines,
    effectiveCoupon,
    deliveryMethod,
    false
  );

  // Deduct stock atomically
  for (const item of pricingSummary.items) {
    const product = dbStore.products.find((p) => p.id === item.productId)!;
    const variant = product.variants.find((v) => v.id === item.variantId)!;
    variant.stock = Math.max(0, variant.stock - item.quantity);
    if (variant.stock === 0) {
      variant.isAvailable = false;
    }
    product.stock = product.variants.reduce((acc, v) => acc + v.stock, 0);

    if (product.stock <= 5) {
      dbStore.notifications.unshift({
        id: `notif_low_${Date.now()}`,
        userId: 'admin',
        type: 'Operational',
        title: `Low Stock Alert: ${product.name}`,
        message: `Inventory for SKU ${variant.sku} is down to ${variant.stock} units.`,
        isRead: false,
        link: '/admin/products',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Increment coupon used count if applied
  if (pricingSummary.couponCode) {
    const couponDoc = dbStore.coupons.find(
      (c) => c.code === pricingSummary.couponCode
    );
    if (couponDoc) {
      couponDoc.usedCount += 1;
    }
  }

  const sequenceNum = 1100 + dbStore.orders.length + 1;
  const orderNumber = `KRN-2026-${sequenceNum}`;
  const invoiceNumber = `INV-KRN-2026-${sequenceNum}`;
  const nowIso = new Date().toISOString();

  const isCod = paymentMethod === 'COD';
  const gatewaySession = !isCod
    ? PaymentGatewayService.createPaymentOrder(
        orderNumber,
        pricingSummary.finalTotal,
        paymentMethod
      )
    : null;

  const newOrder: OrderDoc = {
    id: `ord_${Date.now()}`,
    orderNumber,
    userId: user.id,
    customerName: user.name,
    customerEmail: user.email,
    customerPhone: user.phone,
    items: pricingSummary.items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      productSlug: i.productSlug,
      productImage: i.productImage,
      brand: i.brand,
      variantId: i.variantId,
      variantLabel: i.variantLabel,
      sku: i.sku,
      quantity: i.quantity,
      unitPriceAtPurchase: i.unitPriceAtPurchase,
      originalUnitPriceAtPurchase: i.originalUnitPriceAtPurchase,
      itemSubtotal: i.itemSubtotal,
    })),
    pricing: {
      subtotal: pricingSummary.subtotal,
      productDiscount: pricingSummary.productDiscount,
      couponCode: pricingSummary.couponCode,
      couponDiscount: pricingSummary.couponDiscount,
      deliveryMethod: pricingSummary.deliveryMethod,
      deliveryFee: pricingSummary.deliveryFee,
      taxableAmount: pricingSummary.taxableAmount,
      gstTaxAmount: pricingSummary.gstTaxAmount,
      gstRatePercent: pricingSummary.gstRatePercent,
      finalTotal: pricingSummary.finalTotal,
    },
    addressSnapshot: {
      name: address.name,
      phone: address.phone,
      houseFlat: address.houseFlat,
      street: address.street,
      area: address.area,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      addressType: address.addressType,
    },
    paymentMethod,
    paymentStatus: isCod ? 'Pending' : 'Pending',
    paymentDetails: {
      gatewayOrderId: gatewaySession?.gatewayOrderId || `cod_${orderNumber}`,
      gatewayPaymentId: '',
      gatewaySignature: '',
      paidAt: null,
    },
    orderStatus: isCod ? 'Confirmed' : 'Pending',
    statusHistory: isCod
      ? [
          {
            status: 'Pending',
            note: 'Order submitted by customer.',
            timestamp: nowIso,
            actor: 'Customer',
          },
          {
            status: 'Confirmed',
            note: 'Cash on Delivery (COD) order confirmed and queued for fulfillment.',
            timestamp: nowIso,
            actor: 'System',
          },
        ]
      : [
          {
            status: 'Pending',
            note: 'Order created; awaiting online payment authorization.',
            timestamp: nowIso,
            actor: 'Customer',
          },
        ],
    cancellation: {
      isCancelled: false,
      reason: '',
      cancelledAt: null,
      cancelledBy: '',
    },
    returnRequest: {
      isRequested: false,
      type: 'None',
      reason: '',
      description: '',
      images: [],
      status: 'None',
      requestedAt: null,
    },
    refundInfo: {
      status: 'None',
      amount: 0,
      reason: '',
      providerReference: '',
      refundedAt: null,
    },
    invoiceNumber,
    idempotencyKey: idempotencyKey || `idem_${Date.now()}`,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  dbStore.orders.unshift(newOrder);

  // Create payment ledger record
  const paymentRecord: PaymentDoc = {
    id: `pay_${Date.now()}`,
    orderId: newOrder.id,
    orderNumber: newOrder.orderNumber,
    userId: user.id,
    method: paymentMethod,
    amount: pricingSummary.finalTotal,
    currency: 'INR',
    gatewayOrderId: newOrder.paymentDetails.gatewayOrderId,
    gatewayPaymentId: '',
    gatewaySignature: '',
    status: 'Created',
    failureReason: '',
    refundReference: '',
    createdAt: nowIso,
  };
  dbStore.payments.unshift(paymentRecord);

  // If standard cart checkout and COD, clear active cart items immediately
  if (!isBuyNow && isCod && cart) {
    cart.items = cart.items.filter((i) => i.savedForLater);
    cart.appliedCouponCode = null;
  }

  dbStore.notifications.unshift({
    id: `notif_ord_${Date.now()}`,
    userId: user.id,
    type: 'Order',
    title: `Order ${newOrder.orderNumber} ${isCod ? 'Confirmed' : 'Initiated'}`,
    message: `Total: ₹${newOrder.pricing.finalTotal.toLocaleString('en-IN')} via ${paymentMethod}.`,
    isRead: false,
    link: `/orders/${newOrder.id}`,
    createdAt: nowIso,
  });

  return sendSuccess(
    res,
    isCod
      ? 'Order confirmed with Cash on Delivery.'
      : 'Order initialized. Complete sandbox payment verification to confirm.',
    {
      order: newOrder,
      paymentSession: gatewaySession,
    },
    201
  );
};

/**
 * Verify Online Payment Signature on the Backend.
 * Never trusts client-only boolean; validates cryptographic HMAC signature.
 */
export const verifyOrderPayment = (req: AuthRequest, res: Response) => {
  const {
    orderId,
    gatewayOrderId,
    gatewayPaymentId,
    gatewaySignature,
    simulateFailure = false,
  } = req.body;

  const order = dbStore.orders.find((o) => o.id === orderId);
  if (!order) {
    return sendError(res, 'Order not found.', [], 404);
  }

  if (order.userId !== req.user!.id && req.user!.role !== 'admin') {
    return sendError(res, 'Forbidden: You do not own this order.', [], 403);
  }

  const paymentDoc = dbStore.payments.find((p) => p.orderId === order.id);
  const nowIso = new Date().toISOString();

  if (simulateFailure) {
    order.paymentStatus = 'Failed';
    order.updatedAt = nowIso;
    order.statusHistory.push({
      status: 'Pending',
      note: 'Online payment attempt failed or was declined by issuing bank.',
      timestamp: nowIso,
      actor: 'Payment Gateway',
    });
    if (paymentDoc) {
      paymentDoc.status = 'Failed';
      paymentDoc.failureReason = 'Customer or bank declined sandbox transaction.';
    }
    return sendError(
      res,
      'Payment authorization failed. Your order remains saved so you can retry payment.',
      ['Payment declined'],
      400
    );
  }

  const isValid = PaymentGatewayService.verifyPaymentSignature(
    gatewayOrderId,
    order.orderNumber,
    gatewaySignature
  );

  if (!isValid) {
    return sendError(
      res,
      'Cryptographic payment signature verification failed.',
      ['Invalid HMAC signature'],
      400
    );
  }

  order.paymentStatus = 'Paid';
  order.orderStatus = 'Confirmed';
  order.paymentDetails = {
    gatewayOrderId,
    gatewayPaymentId: gatewayPaymentId || `pay_krn_${Date.now()}`,
    gatewaySignature,
    paidAt: nowIso,
  };
  order.statusHistory.push({
    status: 'Confirmed',
    note: `Online ${order.paymentMethod} payment verified (${order.paymentDetails.gatewayPaymentId}).`,
    timestamp: nowIso,
    actor: 'Payment Gateway',
  });
  order.updatedAt = nowIso;

  if (paymentDoc) {
    paymentDoc.gatewayPaymentId = order.paymentDetails.gatewayPaymentId;
    paymentDoc.gatewaySignature = gatewaySignature;
    paymentDoc.status = 'Captured';
  }

  // Clear active items from customer cart upon confirmed payment
  const cart = dbStore.carts.find((c) => c.userId === order.userId);
  if (cart) {
    cart.items = cart.items.filter((i) => i.savedForLater);
    cart.appliedCouponCode = null;
  }

  return sendSuccess(res, 'Payment verified and order confirmed.', { order });
};

/**
 * Customer Orders List & Detail (Strict Ownership Check)
 */
export const getMyOrders = (req: AuthRequest, res: Response) => {
  const orders = dbStore.orders
    .filter((o) => o.userId === req.user!.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return sendSuccess(res, 'Customer orders retrieved.', { orders });
};

export const getOrderById = (req: AuthRequest, res: Response) => {
  const order = dbStore.orders.find(
    (o) => o.id === req.params.id || o.orderNumber === req.params.id
  );
  if (!order) {
    return sendError(res, 'Order not found.', [], 404);
  }

  if (order.userId !== req.user!.id && req.user!.role !== 'admin') {
    return sendError(
      res,
      'Forbidden: You are not authorized to view another customer’s order.',
      [],
      403
    );
  }

  return sendSuccess(res, 'Order details retrieved.', { order });
};

/**
 * Cancel Order (Backend validates eligibility: Pending, Confirmed, Processing only)
 */
export const cancelOrder = (req: AuthRequest, res: Response) => {
  const order = dbStore.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 'Order not found.', [], 404);

  if (order.userId !== req.user!.id && req.user!.role !== 'admin') {
    return sendError(res, 'Forbidden: Cannot modify another customer’s order.', [], 403);
  }

  const cancellableStatuses = ['Pending', 'Confirmed', 'Processing'];
  if (!cancellableStatuses.includes(order.orderStatus)) {
    return sendError(
      res,
      `Order cannot be cancelled once it is in "${order.orderStatus}" status.`,
      [],
      400
    );
  }

  const reason = String(req.body.reason || 'Customer requested cancellation').trim();
  const nowIso = new Date().toISOString();

  // Restore stock
  for (const item of order.items) {
    const product = dbStore.products.find((p) => p.id === item.productId);
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (product && variant) {
      variant.stock += item.quantity;
      variant.isAvailable = true;
      product.stock = product.variants.reduce((acc, v) => acc + v.stock, 0);
    }
  }

  order.orderStatus = 'Cancelled';
  order.cancellation = {
    isCancelled: true,
    reason,
    cancelledAt: nowIso,
    cancelledBy: req.user!.role === 'admin' ? 'Admin' : 'Customer',
  };

  order.statusHistory.push({
    status: 'Cancelled',
    note: `Order cancelled (${reason}). Inventory restored.`,
    timestamp: nowIso,
    actor: req.user!.role === 'admin' ? 'Administrator' : 'Customer',
  });

  // If already paid online, initiate automatic refund via payment service
  if (order.paymentStatus === 'Paid') {
    const refundResult = PaymentGatewayService.initiateGatewayRefund(
      order.paymentDetails.gatewayPaymentId,
      order.pricing.finalTotal
    );
    order.paymentStatus = 'Refunded';
    order.refundInfo = {
      status: 'Processed',
      amount: order.pricing.finalTotal,
      reason: `Cancellation refund: ${reason}`,
      providerReference: refundResult.refundReference,
      refundedAt: refundResult.timestamp,
    };
    order.statusHistory.push({
      status: 'Refunded',
      note: `Full refund of ₹${order.pricing.finalTotal.toLocaleString('en-IN')} processed (Ref: ${refundResult.refundReference}).`,
      timestamp: nowIso,
      actor: 'Payment Gateway',
    });
  }

  order.updatedAt = nowIso;
  return sendSuccess(res, 'Order has been cancelled.', { order });
};

/**
 * Request Return or Replacement (Only allowed for Delivered orders)
 */
export const requestReturnOrReplacement = (req: AuthRequest, res: Response) => {
  const order = dbStore.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 'Order not found.', [], 404);

  if (order.userId !== req.user!.id) {
    return sendError(res, 'Forbidden: Cannot modify another customer’s order.', [], 403);
  }

  if (order.orderStatus !== 'Delivered') {
    return sendError(
      res,
      'Return or replacement can only be requested for delivered orders.',
      [],
      400
    );
  }

  const type = req.body.type === 'Replacement' ? 'Replacement' : 'Return';
  const reason = String(req.body.reason || '').trim();
  const description = String(req.body.description || '').trim();
  const images = Array.isArray(req.body.images) ? req.body.images : [];

  if (!reason) {
    return sendError(res, 'Please select a reason for your request.', [], 400);
  }

  const nowIso = new Date().toISOString();
  order.orderStatus = 'Return Requested';
  order.returnRequest = {
    isRequested: true,
    type,
    reason,
    description,
    images,
    status: 'Pending',
    requestedAt: nowIso,
  };

  order.statusHistory.push({
    status: 'Return Requested',
    note: `${type} requested by customer: ${reason}`,
    timestamp: nowIso,
    actor: 'Customer',
  });
  order.updatedAt = nowIso;

  dbStore.notifications.unshift({
    id: `notif_ret_${Date.now()}`,
    userId: 'admin',
    type: 'Order',
    title: `${type} Request on ${order.orderNumber}`,
    message: `Customer ${order.customerName} requested a ${type.toLowerCase()} (${reason}).`,
    isRead: false,
    link: `/admin/orders/${order.id}`,
    createdAt: nowIso,
  });

  return sendSuccess(res, `${type} request submitted for review.`, { order });
};

/**
 * Reorder: Adds historical order items into customer's active cart while revalidating current live stock & price
 */
export const reorderPreviousOrder = (req: AuthRequest, res: Response) => {
  const order = dbStore.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 'Order not found.', [], 404);

  if (order.userId !== req.user!.id) {
    return sendError(res, 'Forbidden.', [], 403);
  }

  let cart = dbStore.carts.find((c) => c.userId === req.user!.id);
  if (!cart) {
    cart = {
      userId: req.user!.id,
      items: [],
      appliedCouponCode: null,
      updatedAt: new Date().toISOString(),
    };
    dbStore.carts.push(cart);
  }

  const addedItems: string[] = [];
  const unavailableItems: string[] = [];

  for (const oldItem of order.items) {
    const product = dbStore.products.find((p) => p.id === oldItem.productId && p.isActive);
    const variant = product?.variants.find((v) => v.id === oldItem.variantId);

    if (!product || !variant || !variant.isAvailable || variant.stock < 1) {
      unavailableItems.push(oldItem.productName);
      continue;
    }

    const qtyToAdd = Math.min(oldItem.quantity, variant.stock);
    const existing = cart.items.find(
      (i) => i.productId === product.id && i.variantId === variant.id
    );

    if (existing) {
      existing.quantity = Math.min(variant.stock, existing.quantity + qtyToAdd);
      existing.savedForLater = false;
    } else {
      cart.items.push({
        id: `ci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku,
        quantity: qtyToAdd,
        savedForLater: false,
      });
    }
    addedItems.push(product.name);
  }

  cart.updatedAt = new Date().toISOString();

  if (addedItems.length === 0) {
    return sendError(
      res,
      'None of the items from this order are currently in stock.',
      unavailableItems,
      400
    );
  }

  return sendSuccess(
    res,
    `Added ${addedItems.length} item(s) to your bag at current live pricing.`,
    {
      addedItems,
      unavailableItems,
    }
  );
};
