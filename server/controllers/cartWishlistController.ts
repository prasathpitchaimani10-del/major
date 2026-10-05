import { Response } from 'express';
import { dbStore } from '../models/store';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { calculateOrderPricing, validateAndComputeCoupon } from '../services/pricingService';

const getOrCreateUserCart = (userId: string) => {
  let cart = dbStore.carts.find((c) => c.userId === userId);
  if (!cart) {
    cart = {
      userId,
      items: [],
      appliedCouponCode: null,
      updatedAt: new Date().toISOString(),
    };
    dbStore.carts.push(cart);
  }
  return cart;
};

const buildHydratedCartResponse = (userId: string) => {
  const cart = getOrCreateUserCart(userId);

  const activeItems = [];
  const savedForLaterItems = [];

  for (const item of cart.items) {
    const product = dbStore.products.find((p) => p.id === item.productId && p.isActive);
    if (!product) continue;

    const variant =
      product.variants.find((v) => v.id === item.variantId) || product.variants[0];
    if (!variant) continue;

    const variantLabel = [variant.color, variant.size, variant.capacity]
      .filter(Boolean)
      .join(' · ');

    const hydrated = {
      id: item.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      brand: product.brand,
      image: variant.images?.[0]?.url || product.images?.[0]?.url || '',
      variantId: variant.id,
      variantLabel: variantLabel || variant.sku,
      sku: variant.sku,
      unitPrice: variant.price,
      originalUnitPrice: variant.originalPrice,
      stock: variant.stock,
      isAvailable: variant.isAvailable && variant.stock > 0,
      quantity: Math.min(item.quantity, Math.max(1, variant.stock)),
      savedForLater: item.savedForLater,
      lineSubtotal: variant.price * item.quantity,
    };

    if (item.savedForLater) {
      savedForLaterItems.push(hydrated);
    } else {
      activeItems.push(hydrated);
    }
  }

  let summary = {
    subtotal: 0,
    sellingSubtotal: 0,
    productDiscount: 0,
    couponCode: cart.appliedCouponCode,
    couponDiscount: 0,
    deliveryFee: 0,
    taxableAmount: 0,
    gstRatePercent: 18,
    gstTaxAmount: 0,
    finalTotal: 0,
  };

  if (activeItems.length > 0) {
    try {
      const calc = calculateOrderPricing(
        activeItems.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        cart.appliedCouponCode,
        'Standard',
        false
      );
      summary = {
        subtotal: calc.subtotal,
        sellingSubtotal: calc.sellingSubtotal,
        productDiscount: calc.productDiscount,
        couponCode: calc.couponCode,
        couponDiscount: calc.couponDiscount,
        deliveryFee: calc.deliveryFee,
        taxableAmount: calc.taxableAmount,
        gstRatePercent: calc.gstRatePercent,
        gstTaxAmount: calc.gstTaxAmount,
        finalTotal: calc.finalTotal,
      };
    } catch {
      // Fallback if an item went out of stock while in cart
    }
  } else {
    cart.appliedCouponCode = null;
  }

  return {
    activeItems,
    savedForLaterItems,
    summary,
    availableCoupons: dbStore.coupons.filter(
      (c) => c.isActive && new Date(c.expiresAt).getTime() > Date.now()
    ),
  };
};

export const getCart = (req: AuthRequest, res: Response) => {
  const payload = buildHydratedCartResponse(req.user!.id);
  return sendSuccess(res, 'Cart retrieved.', payload);
};

export const addToCart = (req: AuthRequest, res: Response) => {
  const { productId, variantId, quantity = 1 } = req.body;
  const qty = Math.max(1, Math.floor(Number(quantity)));

  const product = dbStore.products.find((p) => p.id === productId && p.isActive);
  if (!product) {
    return sendError(res, 'Product not found or unavailable.', [], 404);
  }

  const variant = variantId
    ? product.variants.find((v) => v.id === variantId)
    : product.variants[0];

  if (!variant) {
    return sendError(res, 'Selected product variant is invalid.', [], 400);
  }

  if (!variant.isAvailable || variant.stock < qty) {
    return sendError(
      res,
      `Only ${variant.stock} units available in stock for this variant.`,
      [],
      400
    );
  }

  const cart = getOrCreateUserCart(req.user!.id);
  const existing = cart.items.find(
    (item) => item.productId === product.id && item.variantId === variant.id
  );

  if (existing) {
    const newQty = existing.savedForLater ? qty : existing.quantity + qty;
    if (newQty > variant.stock) {
      return sendError(
        res,
        `Cannot add more than available stock (${variant.stock} units).`,
        [],
        400
      );
    }
    existing.quantity = newQty;
    existing.savedForLater = false;
  } else {
    cart.items.push({
      id: `ci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
      quantity: qty,
      savedForLater: false,
    });
  }

  cart.updatedAt = new Date().toISOString();
  return sendSuccess(res, 'Added to shopping bag.', buildHydratedCartResponse(req.user!.id));
};

export const updateCartItemQuantity = (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  const qty = Math.floor(Number(req.body.quantity));

  if (!Number.isFinite(qty) || qty < 1) {
    return sendError(res, 'Quantity must be at least 1.', [], 400);
  }

  const cart = getOrCreateUserCart(req.user!.id);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) {
    return sendError(res, 'Item not found in cart.', [], 404);
  }

  const product = dbStore.products.find((p) => p.id === item.productId && p.isActive);
  const variant = product?.variants.find((v) => v.id === item.variantId);

  if (!product || !variant) {
    return sendError(res, 'Product variant no longer available.', [], 400);
  }

  if (qty > variant.stock) {
    return sendError(
      res,
      `Maximum available stock for ${product.name} (${variant.color}) is ${variant.stock}.`,
      [],
      400
    );
  }

  item.quantity = qty;
  cart.updatedAt = new Date().toISOString();

  return sendSuccess(res, 'Quantity updated.', buildHydratedCartResponse(req.user!.id));
};

export const toggleSaveForLater = (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  const cart = getOrCreateUserCart(req.user!.id);
  const item = cart.items.find((i) => i.id === itemId);

  if (!item) {
    return sendError(res, 'Cart item not found.', [], 404);
  }

  item.savedForLater = !item.savedForLater;
  cart.updatedAt = new Date().toISOString();

  return sendSuccess(
    res,
    item.savedForLater ? 'Item saved for later.' : 'Item moved to active shopping bag.',
    buildHydratedCartResponse(req.user!.id)
  );
};

export const removeCartItem = (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  const cart = getOrCreateUserCart(req.user!.id);
  cart.items = cart.items.filter((i) => i.id !== itemId);
  cart.updatedAt = new Date().toISOString();

  return sendSuccess(res, 'Item removed from bag.', buildHydratedCartResponse(req.user!.id));
};

export const applyCouponToCart = (req: AuthRequest, res: Response) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!code) {
    return sendError(res, 'Please enter a coupon code.', [], 400);
  }

  const cart = getOrCreateUserCart(req.user!.id);
  const currentHydrated = buildHydratedCartResponse(req.user!.id);

  if (currentHydrated.activeItems.length === 0) {
    return sendError(res, 'Add items to your cart before applying a coupon.', [], 400);
  }

  const { coupon, discountAmount, error } = validateAndComputeCoupon(
    code,
    currentHydrated.summary.sellingSubtotal
  );

  if (error || !coupon) {
    return sendError(res, error || 'Invalid coupon code.', [], 400);
  }

  cart.appliedCouponCode = coupon.code;
  cart.updatedAt = new Date().toISOString();

  return sendSuccess(
    res,
    `Coupon ${coupon.code} applied — you saved ₹${discountAmount.toLocaleString('en-IN')}!`,
    buildHydratedCartResponse(req.user!.id)
  );
};

export const removeCouponFromCart = (req: AuthRequest, res: Response) => {
  const cart = getOrCreateUserCart(req.user!.id);
  cart.appliedCouponCode = null;
  cart.updatedAt = new Date().toISOString();

  return sendSuccess(res, 'Coupon removed.', buildHydratedCartResponse(req.user!.id));
};

// Wishlist operations
export const getWishlist = (req: AuthRequest, res: Response) => {
  let wishlist = dbStore.wishlists.find((w) => w.userId === req.user!.id);
  if (!wishlist) {
    wishlist = {
      userId: req.user!.id,
      productIds: [],
      updatedAt: new Date().toISOString(),
    };
    dbStore.wishlists.push(wishlist);
  }

  const products = wishlist.productIds
    .map((id) => dbStore.products.find((p) => p.id === id && p.isActive))
    .filter(Boolean);

  return sendSuccess(res, 'Wishlist retrieved.', {
    productIds: wishlist.productIds,
    products,
  });
};

export const toggleWishlistItem = (req: AuthRequest, res: Response) => {
  const { productId } = req.body;
  const product = dbStore.products.find((p) => p.id === productId && p.isActive);
  if (!product) {
    return sendError(res, 'Product not found.', [], 404);
  }

  let wishlist = dbStore.wishlists.find((w) => w.userId === req.user!.id);
  if (!wishlist) {
    wishlist = {
      userId: req.user!.id,
      productIds: [],
      updatedAt: new Date().toISOString(),
    };
    dbStore.wishlists.push(wishlist);
  }

  const exists = wishlist.productIds.includes(productId);
  if (exists) {
    wishlist.productIds = wishlist.productIds.filter((id) => id !== productId);
  } else {
    wishlist.productIds.push(productId);
  }
  wishlist.updatedAt = new Date().toISOString();

  const products = wishlist.productIds
    .map((id) => dbStore.products.find((p) => p.id === id && p.isActive))
    .filter(Boolean);

  return sendSuccess(
    res,
    exists ? 'Removed from wishlist.' : 'Saved to wishlist.',
    {
      added: !exists,
      productIds: wishlist.productIds,
      products,
    }
  );
};

export const moveWishlistToCart = (req: AuthRequest, res: Response) => {
  const { productId, variantId } = req.body;
  const product = dbStore.products.find((p) => p.id === productId && p.isActive);
  if (!product) {
    return sendError(res, 'Product not found.', [], 404);
  }

  const variant = variantId
    ? product.variants.find((v) => v.id === variantId)
    : product.variants.find((v) => v.stock > 0) || product.variants[0];

  if (!variant || variant.stock < 1) {
    return sendError(res, 'This product is currently out of stock.', [], 400);
  }

  const cart = getOrCreateUserCart(req.user!.id);
  const existing = cart.items.find(
    (i) => i.productId === product.id && i.variantId === variant.id
  );
  if (existing) {
    existing.quantity = Math.min(variant.stock, existing.quantity + 1);
    existing.savedForLater = false;
  } else {
    cart.items.push({
      id: `ci_${Date.now()}`,
      productId: product.id,
      variantId: variant.id,
      sku: variant.sku,
      quantity: 1,
      savedForLater: false,
    });
  }

  const wishlist = dbStore.wishlists.find((w) => w.userId === req.user!.id);
  if (wishlist) {
    wishlist.productIds = wishlist.productIds.filter((id) => id !== productId);
  }

  return sendSuccess(res, 'Moved to shopping bag.', {
    cart: buildHydratedCartResponse(req.user!.id),
    wishlistIds: wishlist?.productIds || [],
  });
};
