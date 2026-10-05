export interface AddressDoc {
  id: string;
  name: string;
  phone: string;
  houseFlat: string;
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  addressType: 'Home' | 'Work' | 'Other';
  isDefault: boolean;
}

export interface SavedPaymentMethodDoc {
  id: string;
  type: 'Card' | 'UPI' | 'Wallet' | 'NetBanking';
  providerReference: string;
  label: string;
  brand: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  upiVpa: string;
  isDefault: boolean;
}

export interface UserDoc {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: 'customer' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  otpCode: string | null;
  otpExpiresAt: string | null;
  resetToken: string | null;
  resetExpiresAt: string | null;
  avatarUrl: string;
  addresses: AddressDoc[];
  savedPaymentMethods: SavedPaymentMethodDoc[];
  createdAt: string;
  updatedAt: string;
}

export interface SubcategoryDoc {
  name: string;
  slug: string;
  description: string;
}

export interface CategoryDoc {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  subcategories: SubcategoryDoc[];
  isActive: boolean;
  createdAt: string;
}

export interface ProductVariantDoc {
  id: string;
  sku: string;
  size: string;
  color: string;
  capacity: string;
  finish: string;
  price: number;
  originalPrice: number;
  stock: number;
  isAvailable: boolean;
  images: Array<{ url: string; publicId: string }>;
}

export interface ProductDoc {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  subcategory: string;
  brand: string;
  sku: string;
  price: number;
  originalPrice: number;
  discountPercentage: number;
  stock: number;
  images: Array<{ url: string; publicId: string; isMain: boolean }>;
  video: { url: string; publicId: string };
  specifications: Array<{ label: string; value: string }>;
  variants: ProductVariantDoc[];
  ratingSummary: {
    average: number;
    count: number;
    distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  };
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  isDeal: boolean;
  isActive: boolean;
  serviceablePincodes: string[];
  warrantyInfo: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItemDoc {
  id: string;
  productId: string;
  variantId: string;
  sku: string;
  quantity: number;
  savedForLater: boolean;
}

export interface CartDoc {
  userId: string;
  items: CartItemDoc[];
  appliedCouponCode: string | null;
  updatedAt: string;
}

export interface WishlistDoc {
  userId: string;
  productIds: string[];
  updatedAt: string;
}

export interface CouponDoc {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minPurchaseAmount: number;
  maxDiscountAmount: number;
  expiresAt: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

export type OrderStatusType =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Return Requested'
  | 'Returned'
  | 'Refund Initiated'
  | 'Refunded';

export type PaymentMethodType = 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'COD';

export type PaymentStatusType =
  | 'Pending'
  | 'Authorized'
  | 'Paid'
  | 'Failed'
  | 'RefundInitiated'
  | 'Refunded';

export interface OrderItemSnapshot {
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
}

export interface OrderDoc {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItemSnapshot[];
  pricing: {
    subtotal: number;
    productDiscount: number;
    couponCode: string | null;
    couponDiscount: number;
    deliveryMethod: 'Standard' | 'Express' | 'WhiteGlove';
    deliveryFee: number;
    taxableAmount: number;
    gstTaxAmount: number;
    gstRatePercent: number;
    finalTotal: number;
  };
  addressSnapshot: Omit<AddressDoc, 'id' | 'isDefault'>;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatusType;
  paymentDetails: {
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewaySignature: string;
    paidAt: string | null;
  };
  orderStatus: OrderStatusType;
  statusHistory: Array<{
    status: OrderStatusType;
    note: string;
    timestamp: string;
    actor: string;
  }>;
  cancellation: {
    isCancelled: boolean;
    reason: string;
    cancelledAt: string | null;
    cancelledBy: string;
  };
  returnRequest: {
    isRequested: boolean;
    type: 'Return' | 'Replacement' | 'None';
    reason: string;
    description: string;
    images: string[];
    status: 'None' | 'Pending' | 'Approved' | 'Rejected' | 'Completed';
    requestedAt: string | null;
  };
  refundInfo: {
    status: 'None' | 'Initiated' | 'Processed' | 'Failed';
    amount: number;
    reason: string;
    providerReference: string;
    refundedAt: string | null;
  };
  invoiceNumber: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDoc {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  method: PaymentMethodType;
  amount: number;
  currency: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  gatewaySignature: string;
  status: 'Created' | 'Authorized' | 'Captured' | 'Failed' | 'Refunded';
  failureReason: string;
  refundReference: string;
  createdAt: string;
}

export interface ReviewDoc {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  photos: string[];
  verifiedPurchase: boolean;
  orderId: string;
  isModerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionDoc {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  question: string;
  answer: string;
  answeredBy: string;
  answeredAt: string | null;
  createdAt: string;
}

export interface NotificationDoc {
  id: string;
  userId: string; // 'admin' or customer userId
  type: 'Order' | 'Account' | 'Operational';
  title: string;
  message: string;
  isRead: boolean;
  link: string;
  createdAt: string;
}
