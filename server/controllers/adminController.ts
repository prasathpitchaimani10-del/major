import { Response } from 'express';
import { dbStore, syncProductRatingSummary, STUDIO_ASSETS } from '../models/store';
import { ProductDoc, CouponDoc, OrderStatusType } from '../models/types';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';
import { PaymentGatewayService } from '../services/paymentService';

export const getDashboardStats = (_req: AuthRequest, res: Response) => {
  const totalCustomers = dbStore.users.filter((u) => u.role === 'customer').length;
  const totalProducts = dbStore.products.length;
  const totalOrders = dbStore.orders.length;
  const pendingOrders = dbStore.orders.filter((o) =>
    ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery'].includes(
      o.orderStatus
    )
  ).length;
  const deliveredOrders = dbStore.orders.filter(
    (o) => o.orderStatus === 'Delivered'
  ).length;

  const revenue = dbStore.orders
    .filter((o) => o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Refunded')
    .reduce((sum, o) => sum + o.pricing.finalTotal, 0);

  const lowStockProducts = dbStore.products.filter((p) => p.stock <= 8);
  const recentOrders = [...dbStore.orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return sendSuccess(res, 'Admin dashboard metrics retrieved.', {
    metrics: {
      totalCustomers,
      totalProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      revenue,
      lowStockCount: lowStockProducts.length,
    },
    lowStockProducts,
    recentOrders,
  });
};

// Admin Product CRUD + Cloudinary Media Upload/Delete
export const adminGetAllProducts = (_req: AuthRequest, res: Response) => {
  return sendSuccess(res, 'All catalog products retrieved.', {
    products: dbStore.products,
  });
};

export const adminCreateProduct = async (req: AuthRequest, res: Response) => {
  const {
    name,
    description,
    shortDescription = '',
    category,
    subcategory,
    brand,
    sku,
    price,
    originalPrice,
    stock,
    images = [],
    videoUrl = '',
    specifications = [],
    variants = [],
    isFeatured = false,
    isTrending = false,
    isNewArrival = true,
    isDeal = false,
    warrantyInfo = '2 Years Manufacturer Warranty',
  } = req.body;

  if (!name || !description || !category || !brand || !sku) {
    return sendError(
      res,
      'Name, description, category, brand, and SKU are required.',
      [],
      400
    );
  }

  const slug =
    String(req.body.slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + `-${Date.now().toString().slice(-4)}`;

  const numPrice = Math.max(1, Number(price) || 1000);
  const numOrigPrice = Math.max(numPrice, Number(originalPrice) || numPrice);
  const discountPercentage =
    numOrigPrice > numPrice
      ? Math.round(((numOrigPrice - numPrice) / numOrigPrice) * 100)
      : 0;

  const processedImages =
    Array.isArray(images) && images.length > 0
      ? images.map((img: { url?: string; publicId?: string }, idx: number) => ({
          url: img.url || STUDIO_ASSETS.headphones,
          publicId: img.publicId || `krono/prod_${Date.now()}_${idx}`,
          isMain: idx === 0,
        }))
      : [
          {
            url: STUDIO_ASSETS.headphones,
            publicId: `krono/default_${Date.now()}`,
            isMain: true,
          },
        ];

  const processedVariants =
    Array.isArray(variants) && variants.length > 0
      ? variants.map((v: Record<string, unknown>, idx: number) => ({
          id: String(v.id || `var_${Date.now()}_${idx}`),
          sku: String(v.sku || `${sku}-V${idx + 1}`),
          size: String(v.size || 'Standard'),
          color: String(v.color || 'Default Finish'),
          capacity: String(v.capacity || ''),
          finish: String(v.finish || ''),
          price: Number(v.price) || numPrice,
          originalPrice: Number(v.originalPrice) || numOrigPrice,
          stock: Number(v.stock) >= 0 ? Number(v.stock) : Number(stock) || 10,
          isAvailable: Number(v.stock ?? stock ?? 10) > 0,
          images: [{ url: processedImages[0].url, publicId: processedImages[0].publicId }],
        }))
      : [
          {
            id: `var_${Date.now()}_0`,
            sku: String(sku),
            size: 'Standard',
            color: 'Obsidian Matte',
            capacity: '',
            finish: 'Anodized',
            price: numPrice,
            originalPrice: numOrigPrice,
            stock: Number(stock) >= 0 ? Number(stock) : 10,
            isAvailable: true,
            images: [{ url: processedImages[0].url, publicId: processedImages[0].publicId }],
          },
        ];

  const totalStock = processedVariants.reduce((sum, v) => sum + v.stock, 0);

  const newProduct: ProductDoc = {
    id: `prod_${Date.now()}`,
    name: String(name).trim(),
    slug,
    description: String(description).trim(),
    shortDescription: String(shortDescription || description.slice(0, 120)).trim(),
    category: String(category),
    subcategory: String(subcategory || 'general'),
    brand: String(brand).trim(),
    sku: String(sku).trim().toUpperCase(),
    price: numPrice,
    originalPrice: numOrigPrice,
    discountPercentage,
    stock: totalStock,
    images: processedImages,
    video: { url: String(videoUrl || ''), publicId: videoUrl ? `vid_${Date.now()}` : '' },
    specifications: Array.isArray(specifications) ? specifications : [],
    variants: processedVariants,
    ratingSummary: {
      average: 0,
      count: 0,
      distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    },
    isFeatured: Boolean(isFeatured),
    isTrending: Boolean(isTrending),
    isNewArrival: Boolean(isNewArrival),
    isDeal: Boolean(isDeal),
    isActive: true,
    serviceablePincodes: [],
    warrantyInfo: String(warrantyInfo),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbStore.products.unshift(newProduct);

  return sendSuccess(res, 'Product created successfully.', { product: newProduct }, 201);
};

export const adminUpdateProduct = (req: AuthRequest, res: Response) => {
  const index = dbStore.products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return sendError(res, 'Product not found.', [], 404);
  }

  const existing = dbStore.products[index];
  const body = req.body;

  const numPrice = body.price !== undefined ? Number(body.price) : existing.price;
  const numOrigPrice =
    body.originalPrice !== undefined
      ? Math.max(numPrice, Number(body.originalPrice))
      : Math.max(numPrice, existing.originalPrice);

  const discountPercentage =
    numOrigPrice > numPrice
      ? Math.round(((numOrigPrice - numPrice) / numOrigPrice) * 100)
      : 0;

  const updatedVariants = Array.isArray(body.variants)
    ? body.variants.map((v: Record<string, unknown>, idx: number) => ({
        id: String(v.id || `var_${Date.now()}_${idx}`),
        sku: String(v.sku || `${existing.sku}-V${idx + 1}`),
        size: String(v.size || ''),
        color: String(v.color || ''),
        capacity: String(v.capacity || ''),
        finish: String(v.finish || ''),
        price: Number(v.price) || numPrice,
        originalPrice: Number(v.originalPrice) || numOrigPrice,
        stock: Number(v.stock) >= 0 ? Number(v.stock) : 0,
        isAvailable: Number(v.stock) > 0,
        images: Array.isArray(v.images)
          ? v.images
          : [{ url: existing.images[0]?.url || '', publicId: 'krono/var' }],
      }))
    : existing.variants;

  const totalStock =
    body.variants !== undefined
      ? updatedVariants.reduce((s: number, v: { stock: number }) => s + v.stock, 0)
      : body.stock !== undefined
      ? Number(body.stock)
      : existing.stock;

  dbStore.products[index] = {
    ...existing,
    name: body.name !== undefined ? String(body.name).trim() : existing.name,
    description:
      body.description !== undefined ? String(body.description).trim() : existing.description,
    shortDescription:
      body.shortDescription !== undefined
        ? String(body.shortDescription).trim()
        : existing.shortDescription,
    category: body.category !== undefined ? String(body.category) : existing.category,
    subcategory:
      body.subcategory !== undefined ? String(body.subcategory) : existing.subcategory,
    brand: body.brand !== undefined ? String(body.brand).trim() : existing.brand,
    sku: body.sku !== undefined ? String(body.sku).trim() : existing.sku,
    price: numPrice,
    originalPrice: numOrigPrice,
    discountPercentage,
    stock: totalStock,
    images: Array.isArray(body.images) && body.images.length > 0 ? body.images : existing.images,
    specifications: Array.isArray(body.specifications)
      ? body.specifications
      : existing.specifications,
    variants: updatedVariants,
    isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : existing.isFeatured,
    isTrending: body.isTrending !== undefined ? Boolean(body.isTrending) : existing.isTrending,
    isNewArrival:
      body.isNewArrival !== undefined ? Boolean(body.isNewArrival) : existing.isNewArrival,
    isDeal: body.isDeal !== undefined ? Boolean(body.isDeal) : existing.isDeal,
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
    updatedAt: new Date().toISOString(),
  };

  return sendSuccess(res, 'Product updated successfully.', {
    product: dbStore.products[index],
  });
};

export const adminToggleProductActive = (req: AuthRequest, res: Response) => {
  const product = dbStore.products.find((p) => p.id === req.params.id);
  if (!product) return sendError(res, 'Product not found.', [], 404);

  product.isActive = !product.isActive;
  product.updatedAt = new Date().toISOString();

  return sendSuccess(
    res,
    `Product ${product.isActive ? 'activated' : 'deactivated'}.`,
    { product }
  );
};

export const adminDeleteProduct = async (req: AuthRequest, res: Response) => {
  const product = dbStore.products.find((p) => p.id === req.params.id);
  if (!product) return sendError(res, 'Product not found.', [], 404);

  for (const img of product.images) {
    await deleteFromCloudinary(img.publicId, 'image');
  }

  dbStore.products = dbStore.products.filter((p) => p.id !== req.params.id);
  return sendSuccess(res, 'Product and associated Cloudinary references deleted.');
};

export const adminUploadMedia = async (req: AuthRequest, res: Response) => {
  const { fileUrl, folder = 'krono_products', resourceType = 'image' } = req.body;
  if (!fileUrl) {
    return sendError(res, 'Please provide an image URL or base64 data payload.', [], 400);
  }

  const uploaded = await uploadToCloudinary(fileUrl, folder, resourceType);
  return sendSuccess(res, 'Media uploaded to Cloudinary storage.', { media: uploaded }, 201);
};

// Admin Customer Management
export const adminGetCustomers = (req: AuthRequest, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  let customers = dbStore.users.filter((u) => u.role === 'customer');

  if (q) {
    customers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }

  const enriched = customers.map((c) => {
    const orders = dbStore.orders.filter((o) => o.userId === c.id);
    const totalSpent = orders
      .filter((o) => o.orderStatus !== 'Cancelled')
      .reduce((s, o) => s + o.pricing.finalTotal, 0);
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      isVerified: c.isVerified,
      isActive: c.isActive,
      addressesCount: c.addresses.length,
      ordersCount: orders.length,
      totalSpent,
      createdAt: c.createdAt,
      orders,
    };
  });

  return sendSuccess(res, 'Customers retrieved.', { customers: enriched });
};

export const adminToggleCustomerStatus = (req: AuthRequest, res: Response) => {
  const user = dbStore.users.find((u) => u.id === req.params.id);
  if (!user) return sendError(res, 'Customer not found.', [], 404);
  if (user.role === 'admin') {
    return sendError(res, 'Cannot deactivate an administrator account.', [], 400);
  }

  user.isActive = !user.isActive;
  user.updatedAt = new Date().toISOString();

  return sendSuccess(
    res,
    `Customer account ${user.isActive ? 'activated' : 'deactivated'}.`,
    { isActive: user.isActive }
  );
};

// Admin Order Management
export const adminGetAllOrders = (req: AuthRequest, res: Response) => {
  const { status = '', q = '' } = req.query;
  let orders = [...dbStore.orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (status) {
    orders = orders.filter((o) => o.orderStatus === String(status));
  }

  const search = String(q).trim().toLowerCase();
  if (search) {
    orders = orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(search) ||
        o.customerName.toLowerCase().includes(search) ||
        o.customerEmail.toLowerCase().includes(search)
    );
  }

  return sendSuccess(res, 'All orders retrieved.', { orders });
};

export const adminUpdateOrderStatus = (req: AuthRequest, res: Response) => {
  const order = dbStore.orders.find((o) => o.id === req.params.id);
  if (!order) return sendError(res, 'Order not found.', [], 404);

  const newStatus = req.body.orderStatus as OrderStatusType;
  const note = String(
    req.body.note || `Order status updated to ${newStatus} by administrator.`
  ).trim();

  const validStatuses: OrderStatusType[] = [
    'Pending',
    'Confirmed',
    'Processing',
    'Shipped',
    'Out for Delivery',
    'Delivered',
    'Cancelled',
    'Return Requested',
    'Returned',
    'Refund Initiated',
    'Refunded',
  ];

  if (!validStatuses.includes(newStatus)) {
    return sendError(res, 'Invalid order status value.', [], 400);
  }

  const nowIso = new Date().toISOString();
  order.orderStatus = newStatus;

  if (newStatus === 'Delivered' && order.paymentMethod === 'COD') {
    order.paymentStatus = 'Paid';
    order.paymentDetails.paidAt = nowIso;
  }

  if (newStatus === 'Returned') {
    order.returnRequest.status = 'Approved';
  }

  if (newStatus === 'Refunded' && order.refundInfo.status !== 'Processed') {
    const refundResult = PaymentGatewayService.initiateGatewayRefund(
      order.paymentDetails.gatewayPaymentId || order.orderNumber,
      order.pricing.finalTotal
    );
    order.paymentStatus = 'Refunded';
    order.refundInfo = {
      status: 'Processed',
      amount: order.pricing.finalTotal,
      reason: note,
      providerReference: refundResult.refundReference,
      refundedAt: nowIso,
    };
  }

  order.statusHistory.push({
    status: newStatus,
    note,
    timestamp: nowIso,
    actor: `${req.user!.name} (Admin)`,
  });
  order.updatedAt = nowIso;

  dbStore.notifications.unshift({
    id: `notif_upd_${Date.now()}`,
    userId: order.userId,
    type: 'Order',
    title: `Order ${order.orderNumber} — ${newStatus}`,
    message: note,
    isRead: false,
    link: `/orders/${order.id}`,
    createdAt: nowIso,
  });

  return sendSuccess(res, `Order status updated to ${newStatus}.`, { order });
};

// Admin Coupon Management
export const adminGetCoupons = (_req: AuthRequest, res: Response) => {
  return sendSuccess(res, 'Coupons retrieved.', { coupons: dbStore.coupons });
};

export const adminCreateCoupon = (req: AuthRequest, res: Response) => {
  const {
    code,
    description,
    discountType = 'PERCENTAGE',
    discountValue,
    minPurchaseAmount = 0,
    maxDiscountAmount = 0,
    expiresAt,
    usageLimit = 100,
  } = req.body;

  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode || !description || !discountValue) {
    return sendError(res, 'Coupon code, description, and discount value are required.', [], 400);
  }

  if (dbStore.coupons.some((c) => c.code === cleanCode)) {
    return sendError(res, `Coupon code ${cleanCode} already exists.`, [], 409);
  }

  const newCoupon: CouponDoc = {
    id: `cpn_${Date.now()}`,
    code: cleanCode,
    description: String(description).trim(),
    discountType: discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
    discountValue: Number(discountValue),
    minPurchaseAmount: Number(minPurchaseAmount) || 0,
    maxDiscountAmount: Number(maxDiscountAmount) || 0,
    expiresAt: expiresAt
      ? new Date(expiresAt).toISOString()
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    usageLimit: Number(usageLimit) || 100,
    usedCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  dbStore.coupons.unshift(newCoupon);
  return sendSuccess(res, 'Coupon created.', { coupon: newCoupon }, 201);
};

export const adminToggleCoupon = (req: AuthRequest, res: Response) => {
  const coupon = dbStore.coupons.find((c) => c.id === req.params.id);
  if (!coupon) return sendError(res, 'Coupon not found.', [], 404);

  coupon.isActive = !coupon.isActive;
  return sendSuccess(
    res,
    `Coupon ${coupon.code} ${coupon.isActive ? 'enabled' : 'disabled'}.`,
    { coupon }
  );
};

// Admin Reviews & Questions Moderation
export const adminGetReviews = (_req: AuthRequest, res: Response) => {
  const enriched = dbStore.reviews.map((r) => {
    const product = dbStore.products.find((p) => p.id === r.productId);
    return {
      ...r,
      productName: product?.name || 'Unknown Product',
      productSlug: product?.slug || '',
    };
  });
  return sendSuccess(res, 'All reviews retrieved.', { reviews: enriched });
};

export const adminModerateReview = (req: AuthRequest, res: Response) => {
  const review = dbStore.reviews.find((r) => r.id === req.params.id);
  if (!review) return sendError(res, 'Review not found.', [], 404);

  review.isModerated = !review.isModerated;
  syncProductRatingSummary(review.productId);

  return sendSuccess(
    res,
    review.isModerated ? 'Review hidden from storefront.' : 'Review restored to storefront.',
    { review }
  );
};

export const adminGetQuestions = (_req: AuthRequest, res: Response) => {
  const enriched = dbStore.questions.map((q) => {
    const product = dbStore.products.find((p) => p.id === q.productId);
    return {
      ...q,
      productName: product?.name || 'Unknown Product',
      productSlug: product?.slug || '',
    };
  });
  return sendSuccess(res, 'All product questions retrieved.', { questions: enriched });
};

export const adminAnswerQuestion = (req: AuthRequest, res: Response) => {
  const qst = dbStore.questions.find((q) => q.id === req.params.id);
  if (!qst) return sendError(res, 'Question not found.', [], 404);

  const answer = String(req.body.answer || '').trim();
  if (!answer) return sendError(res, 'Answer text is required.', [], 400);

  qst.answer = answer;
  qst.answeredBy = `${req.user!.name} (Krono Specialist)`;
  qst.answeredAt = new Date().toISOString();

  dbStore.notifications.unshift({
    id: `notif_ans_${Date.now()}`,
    userId: qst.userId,
    type: 'Account',
    title: 'Your Product Question Was Answered',
    message: `Our specialist replied: "${answer.slice(0, 80)}..."`,
    isRead: false,
    link: `/products/${qst.productId}`,
    createdAt: new Date().toISOString(),
  });

  return sendSuccess(res, 'Answer published.', { question: qst });
};
