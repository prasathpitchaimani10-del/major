export interface Address {
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

export interface SavedPaymentMethod {
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

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  avatarUrl: string;
  addresses: Address[];
  savedPaymentMethods: SavedPaymentMethod[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  productCount?: number;
  subcategories: Array<{
    name: string;
    slug: string;
    description: string;
    productCount?: number;
  }>;
}

export interface ProductVariant {
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

export interface Product {
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
  variants: ProductVariant[];
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
  warrantyInfo: string;
  createdAt: string;
}

export interface HydratedCartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  brand: string;
  image: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  unitPrice: number;
  originalUnitPrice: number;
  stock: number;
  isAvailable: boolean;
  quantity: number;
  savedForLater: boolean;
  lineSubtotal: number;
}

export interface CartSummary {
  subtotal: number;
  sellingSubtotal: number;
  productDiscount: number;
  couponCode: string | null;
  couponDiscount: number;
  deliveryFee: number;
  taxableAmount: number;
  gstRatePercent: number;
  gstTaxAmount: number;
  finalTotal: number;
}

export interface Coupon {
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
}

export type OrderStatus =
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

export type PaymentMethod = 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'COD';

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
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
  }>;
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
  addressSnapshot: Omit<Address, 'id' | 'isDefault'>;
  paymentMethod: PaymentMethod;
  paymentStatus: 'Pending' | 'Authorized' | 'Paid' | 'Failed' | 'RefundInitiated' | 'Refunded';
  paymentDetails: {
    gatewayOrderId: string;
    gatewayPaymentId: string;
    gatewaySignature: string;
    paidAt: string | null;
  };
  orderStatus: OrderStatus;
  statusHistory: Array<{
    status: OrderStatus;
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
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  photos: string[];
  verifiedPurchase: boolean;
  isModerated: boolean;
  createdAt: string;
}

export interface Question {
  id: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  userId: string;
  userName: string;
  question: string;
  answer: string;
  answeredBy: string;
  answeredAt: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'Order' | 'Account' | 'Operational';
  title: string;
  message: string;
  isRead: boolean;
  link: string;
  createdAt: string;
}
