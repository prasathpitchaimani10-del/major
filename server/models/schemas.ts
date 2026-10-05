import mongoose, { Schema } from 'mongoose';

// 1. User Schema (with embedded Addresses & Saved Payment References)
const AddressSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  houseFlat: { type: String, required: true, trim: true },
  street: { type: String, required: true, trim: true },
  area: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  pincode: { type: String, required: true, trim: true },
  addressType: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
  isDefault: { type: Boolean, default: false },
});

const SavedPaymentMethodSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['Card', 'UPI', 'Wallet', 'NetBanking'], required: true },
  providerReference: { type: String, required: true }, // Safe tokenized reference only
  label: { type: String, required: true }, // e.g., "Visa ending in 4242" or "alex@okaxis"
  brand: { type: String, default: '' },
  last4: { type: String, default: '' },
  expiryMonth: { type: String, default: '' },
  expiryYear: { type: String, default: '' },
  upiVpa: { type: String, default: '' },
  isDefault: { type: Boolean, default: false },
});

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    otpCode: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    resetToken: { type: String, default: null },
    resetExpiresAt: { type: Date, default: null },
    avatarUrl: { type: String, default: '' },
    addresses: [AddressSchema],
    savedPaymentMethods: [SavedPaymentMethodSchema],
  },
  { timestamps: true }
);

// 2. Category Schema
const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    subcategories: [
      {
        name: { type: String, required: true },
        slug: { type: String, required: true },
        description: { type: String, default: '' },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// 3. Product & ProductVariant Schema
const ProductVariantSchema = new Schema({
  id: { type: String, required: true },
  sku: { type: String, required: true, index: true },
  size: { type: String, default: '' },
  color: { type: String, default: '' },
  capacity: { type: String, default: '' },
  finish: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0 },
  isAvailable: { type: Boolean, default: true },
  images: [
    {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
  ],
});

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    shortDescription: { type: String, default: '' },
    category: { type: String, required: true, index: true },
    subcategory: { type: String, required: true, index: true },
    brand: { type: String, required: true, index: true },
    sku: { type: String, required: true, unique: true, index: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, default: 0 },
    stock: { type: Number, required: true, min: 0 },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        isMain: { type: Boolean, default: false },
      },
    ],
    video: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    specifications: [
      {
        label: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    variants: [ProductVariantSchema],
    ratingSummary: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      distribution: {
        1: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
        4: { type: Number, default: 0 },
        5: { type: Number, default: 0 },
      },
    },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isDeal: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    serviceablePincodes: [{ type: String }], // Empty means pan-country serviceable
    warrantyInfo: { type: String, default: '2 Years International Manufacturer Warranty' },
  },
  { timestamps: true }
);

// 4. Cart Schema (includes active items + savedForLater items)
const CartItemSchema = new Schema({
  id: { type: String, required: true },
  productId: { type: String, required: true },
  variantId: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  savedForLater: { type: Boolean, default: false },
});

const CartSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    items: [CartItemSchema],
    appliedCouponCode: { type: String, default: null },
  },
  { timestamps: true }
);

// 5. Wishlist Schema
const WishlistSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    productIds: [{ type: String }],
  },
  { timestamps: true }
);

// 6. Coupon Schema
const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, index: true },
    description: { type: String, required: true },
    discountType: { type: String, enum: ['PERCENTAGE', 'FIXED'], required: true },
    discountValue: { type: Number, required: true, min: 1 },
    minPurchaseAmount: { type: Number, default: 0 },
    maxDiscountAmount: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    usageLimit: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// 7. Order Schema (Stores historical purchase snapshots)
const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    items: [
      {
        productId: { type: String, required: true },
        productName: { type: String, required: true },
        productSlug: { type: String, required: true },
        productImage: { type: String, required: true },
        brand: { type: String, required: true },
        variantId: { type: String, required: true },
        variantLabel: { type: String, required: true },
        sku: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPriceAtPurchase: { type: Number, required: true },
        originalUnitPriceAtPurchase: { type: Number, required: true },
        itemSubtotal: { type: Number, required: true },
      },
    ],
    pricing: {
      subtotal: { type: Number, required: true },
      productDiscount: { type: Number, required: true },
      couponCode: { type: String, default: null },
      couponDiscount: { type: Number, default: 0 },
      deliveryMethod: { type: String, enum: ['Standard', 'Express', 'WhiteGlove'], default: 'Standard' },
      deliveryFee: { type: Number, required: true },
      taxableAmount: { type: Number, required: true },
      gstTaxAmount: { type: Number, required: true },
      gstRatePercent: { type: Number, default: 18 },
      finalTotal: { type: Number, required: true },
    },
    addressSnapshot: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      houseFlat: { type: String, required: true },
      street: { type: String, required: true },
      area: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      addressType: { type: String, default: 'Home' },
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'Card', 'NetBanking', 'Wallet', 'COD'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Authorized', 'Paid', 'Failed', 'RefundInitiated', 'Refunded'],
      default: 'Pending',
    },
    paymentDetails: {
      gatewayOrderId: { type: String, default: '' },
      gatewayPaymentId: { type: String, default: '' },
      gatewaySignature: { type: String, default: '' },
      paidAt: { type: Date, default: null },
    },
    orderStatus: {
      type: String,
      enum: [
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
      ],
      default: 'Pending',
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        note: { type: String, required: true },
        timestamp: { type: Date, required: true },
        actor: { type: String, default: 'System' },
      },
    ],
    cancellation: {
      isCancelled: { type: Boolean, default: false },
      reason: { type: String, default: '' },
      cancelledAt: { type: Date, default: null },
      cancelledBy: { type: String, default: '' },
    },
    returnRequest: {
      isRequested: { type: Boolean, default: false },
      type: { type: String, enum: ['Return', 'Replacement', 'None'], default: 'None' },
      reason: { type: String, default: '' },
      description: { type: String, default: '' },
      images: [{ type: String }],
      status: { type: String, enum: ['None', 'Pending', 'Approved', 'Rejected', 'Completed'], default: 'None' },
      requestedAt: { type: Date, default: null },
    },
    refundInfo: {
      status: { type: String, enum: ['None', 'Initiated', 'Processed', 'Failed'], default: 'None' },
      amount: { type: Number, default: 0 },
      reason: { type: String, default: '' },
      providerReference: { type: String, default: '' },
      refundedAt: { type: Date, default: null },
    },
    invoiceNumber: { type: String, required: true },
    idempotencyKey: { type: String, default: '' },
  },
  { timestamps: true }
);

// 8. Payment Ledger Schema
const PaymentSchema = new Schema(
  {
    orderId: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true },
    userId: { type: String, required: true },
    method: { type: String, enum: ['UPI', 'Card', 'NetBanking', 'Wallet', 'COD'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    gatewayOrderId: { type: String, required: true, index: true },
    gatewayPaymentId: { type: String, default: '' },
    gatewaySignature: { type: String, default: '' },
    status: { type: String, enum: ['Created', 'Authorized', 'Captured', 'Failed', 'Refunded'], default: 'Created' },
    failureReason: { type: String, default: '' },
    refundReference: { type: String, default: '' },
  },
  { timestamps: true }
);

// 9. Review Schema (With Server-Authoritative Verified Purchase)
const ReviewSchema = new Schema(
  {
    productId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true },
    comment: { type: String, required: true, trim: true },
    photos: [{ type: String }],
    verifiedPurchase: { type: Boolean, default: false },
    orderId: { type: String, default: '' },
    isModerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 10. Question & Answer Schema
const QuestionSchema = new Schema(
  {
    productId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    question: { type: String, required: true, trim: true },
    answer: { type: String, default: '' },
    answeredBy: { type: String, default: '' },
    answeredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// 11. Notification Schema
const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true }, // 'admin' or specific customer userId
    type: { type: String, enum: ['Order', 'Account', 'Operational'], default: 'Order' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    link: { type: String, default: '' },
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const CategoryModel = mongoose.models.Category || mongoose.model('Category', CategorySchema);
export const ProductModel = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const CartModel = mongoose.models.Cart || mongoose.model('Cart', CartSchema);
export const WishlistModel = mongoose.models.Wishlist || mongoose.model('Wishlist', WishlistSchema);
export const CouponModel = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
export const OrderModel = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const PaymentModel = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
export const ReviewModel = mongoose.models.Review || mongoose.model('Review', ReviewSchema);
export const QuestionModel = mongoose.models.Question || mongoose.model('Question', QuestionSchema);
export const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
