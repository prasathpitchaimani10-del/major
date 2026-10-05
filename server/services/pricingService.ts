import { dbStore } from '../models/store';
import { CouponDoc } from '../models/types';
import { AppError } from '../utils/apiResponse';

export interface CheckoutLineRequest {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CalculatedLineItem {
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  brand: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  unitPriceAtPurchase: number;
  originalUnitPriceAtPurchase: number;
  itemSubtotal: number;
  itemOriginalSubtotal: number;
  availableStock: number;
}

export interface CalculatedCheckoutSummary {
  items: CalculatedLineItem[];
  subtotal: number; // Original MRP sum
  sellingSubtotal: number; // Sum of active variant selling prices
  productDiscount: number; // subtotal - sellingSubtotal
  couponCode: string | null;
  couponDiscount: number;
  deliveryMethod: 'Standard' | 'Express' | 'WhiteGlove';
  deliveryFee: number;
  taxableAmount: number;
  gstRatePercent: number;
  gstTaxAmount: number;
  finalTotal: number;
}

export const validateAndComputeCoupon = (
  code: string | null | undefined,
  sellingSubtotal: number
): { coupon: CouponDoc | null; discountAmount: number; error?: string } => {
  if (!code || !code.trim()) {
    return { coupon: null, discountAmount: 0 };
  }

  const normalized = code.trim().toUpperCase();
  const coupon = dbStore.coupons.find((c) => c.code.toUpperCase() === normalized);

  if (!coupon) {
    return { coupon: null, discountAmount: 0, error: `Coupon code "${normalized}" is invalid.` };
  }

  if (!coupon.isActive) {
    return { coupon: null, discountAmount: 0, error: `Coupon "${normalized}" is currently disabled.` };
  }

  if (new Date(coupon.expiresAt).getTime() < Date.now()) {
    return { coupon: null, discountAmount: 0, error: `Coupon "${normalized}" has expired.` };
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    return {
      coupon: null,
      discountAmount: 0,
      error: `Coupon "${normalized}" has reached its maximum usage limit.`,
    };
  }

  if (sellingSubtotal < coupon.minPurchaseAmount) {
    return {
      coupon: null,
      discountAmount: 0,
      error: `Coupon "${normalized}" requires a minimum order value of ₹${coupon.minPurchaseAmount.toLocaleString('en-IN')}.`,
    };
  }

  let discountAmount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discountAmount = Math.round((sellingSubtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }
  } else {
    discountAmount = coupon.discountValue;
  }

  discountAmount = Math.min(discountAmount, sellingSubtotal);
  return { coupon, discountAmount };
};

export const calculateOrderPricing = (
  lines: CheckoutLineRequest[],
  couponCode?: string | null,
  deliveryMethod: 'Standard' | 'Express' | 'WhiteGlove' = 'Standard',
  strictCoupon = false
): CalculatedCheckoutSummary => {
  if (!lines || lines.length === 0) {
    throw new AppError('No items provided for price calculation.', 400);
  }

  const calculatedItems: CalculatedLineItem[] = [];
  let originalSubtotal = 0;
  let sellingSubtotal = 0;

  for (const line of lines) {
    const qty = Math.floor(Number(line.quantity));
    if (!Number.isFinite(qty) || qty < 1) {
      throw new AppError('Item quantity must be at least 1.', 400);
    }

    const product = dbStore.products.find((p) => p.id === line.productId && p.isActive);
    if (!product) {
      throw new AppError(`Product (${line.productId}) is unavailable or no longer active.`, 404);
    }

    const variant = line.variantId
      ? product.variants.find((v) => v.id === line.variantId)
      : product.variants[0];

    if (!variant) {
      throw new AppError(`Selected variant for "${product.name}" does not exist.`, 400);
    }

    if (!variant.isAvailable || variant.stock < qty || product.stock < qty) {
      throw new AppError(
        `Insufficient stock for "${product.name}" (${variant.color || variant.sku}). Only ${variant.stock} left.`,
        400
      );
    }

    const unitPrice = variant.price;
    const originalUnitPrice = Math.max(variant.originalPrice, unitPrice);
    const itemSubtotal = unitPrice * qty;
    const itemOriginalSubtotal = originalUnitPrice * qty;

    originalSubtotal += itemOriginalSubtotal;
    sellingSubtotal += itemSubtotal;

    const variantParts = [variant.color, variant.size, variant.capacity].filter(Boolean);
    const variantLabel = variantParts.length > 0 ? variantParts.join(' · ') : variant.sku;

    calculatedItems.push({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productImage: variant.images?.[0]?.url || product.images?.[0]?.url || '',
      brand: product.brand,
      variantId: variant.id,
      variantLabel,
      sku: variant.sku,
      quantity: qty,
      unitPriceAtPurchase: unitPrice,
      originalUnitPriceAtPurchase: originalUnitPrice,
      itemSubtotal,
      itemOriginalSubtotal,
      availableStock: variant.stock,
    });
  }

  const productDiscount = Math.max(0, originalSubtotal - sellingSubtotal);

  const { coupon, discountAmount: couponDiscount, error: couponError } =
    validateAndComputeCoupon(couponCode, sellingSubtotal);

  if (strictCoupon && couponCode && couponError) {
    throw new AppError(couponError, 400);
  }

  let deliveryFee = 0;
  if (deliveryMethod === 'Express') {
    deliveryFee = sellingSubtotal >= 50000 ? 0 : 450;
  } else if (deliveryMethod === 'WhiteGlove') {
    deliveryFee = 1200;
  } else {
    // Standard delivery free over ₹10,000
    deliveryFee = sellingSubtotal >= 10000 ? 0 : 250;
  }

  const taxableAmount = Math.max(0, sellingSubtotal - couponDiscount);
  const gstRatePercent = 18;
  const gstTaxAmount = Math.round((taxableAmount * gstRatePercent) / 100);
  const finalTotal = taxableAmount + gstTaxAmount + deliveryFee;

  return {
    items: calculatedItems,
    subtotal: originalSubtotal,
    sellingSubtotal,
    productDiscount,
    couponCode: coupon ? coupon.code : null,
    couponDiscount,
    deliveryMethod,
    deliveryFee,
    taxableAmount,
    gstRatePercent,
    gstTaxAmount,
    finalTotal,
  };
};
