import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Bookmark,
  ShoppingBag,
  Tag,
  ArrowRight,
  Scale,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest, formatINR } from '../services/api';
import { Product } from '../types';
import {
  ResilientImage,
  EmptyState,
  ProductGrid,
  RatingStars,
} from '../components/CommonUI';

// 1. Shopping Cart & Save-for-Later Page
export const CartPage: React.FC = () => {
  const {
    user,
    activeCartItems,
    savedForLaterItems,
    cartSummary,
    availableCoupons,
    updateQuantity,
    toggleSaveForLater,
    removeFromCart,
    applyCoupon,
    removeCoupon,
  } = useStore();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');

  if (!user) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12">
        <EmptyState
          title="Sign In to View Your Shopping Bag"
          description="Your cart items, saved-for-later list, and privilege coupons are synced securely with your account."
          actionLabel="Sign In to Account"
          actionTo="/login"
        />
      </div>
    );
  }

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const ok = await applyCoupon(couponInput.trim());
    if (ok) setCouponInput('');
  };

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10 space-y-12">
      <div className="border-b border-zinc-200 pb-5">
        <h1 className="font-display text-3xl font-bold text-zinc-900">
          Shopping Bag ({activeCartItems.reduce((s, i) => s + i.quantity, 0)})
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          All item prices, stock counts, coupon discounts, and 18% GST are validated on our
          backend server.
        </p>
      </div>

      {activeCartItems.length === 0 ? (
        <EmptyState
          title="Your Shopping Bag is Empty"
          description="Explore our acoustic headphones, CNC mechanical keyboards, and titanium chronographs."
          actionLabel="Browse Catalog"
          actionTo="/products"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Active Cart Items */}
          <div className="lg:col-span-8 space-y-4">
            {activeCartItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-zinc-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5"
              >
                <div className="flex items-center gap-4">
                  <Link
                    to={`/products/${item.productSlug}`}
                    className="w-24 h-20 rounded-xl overflow-hidden bg-zinc-100 shrink-0"
                  >
                    <ResilientImage
                      src={item.image}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{item.brand}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{item.sku}</span>
                    </div>
                    <Link
                      to={`/products/${item.productSlug}`}
                      className="text-sm font-semibold text-zinc-900 hover:text-amber-800 block"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-zinc-500">{item.variantLabel}</p>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => toggleSaveForLater(item.id)}
                        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Save for Later</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3">
                  <div className="text-right">
                    <span className="text-sm font-mono font-semibold text-zinc-900">
                      {formatINR(item.lineSubtotal)}
                    </span>
                    {item.originalUnitPrice > item.unitPrice && (
                      <p className="text-[11px] font-mono text-zinc-400 line-through">
                        {formatINR(item.originalUnitPrice * item.quantity)}
                      </p>
                    )}
                  </div>

                  <div className="inline-flex items-center border border-zinc-200 rounded-lg bg-zinc-50">
                    <button
                      type="button"
                      disabled={item.quantity <= 1}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="px-3 py-1 text-xs font-mono font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={item.quantity >= item.stock}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Server-Calculated Price Summary & Coupon Input */}
          <div className="lg:col-span-4 bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-6">
            <h2 className="text-base font-semibold text-zinc-900 border-b border-zinc-100 pb-3">
              Order Calculation Summary
            </h2>

            {/* Coupon Form */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-zinc-800">
                Privilege Coupon Code
              </label>
              {cartSummary.couponCode ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                  <div>
                    <span className="font-mono font-bold text-emerald-900">
                      {cartSummary.couponCode}
                    </span>
                    <p className="text-emerald-700">
                      −{formatINR(cartSummary.couponDiscount)} savings applied
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-emerald-800 hover:text-emerald-950 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="e.g. ATELIER10"
                    className="flex-1 px-3 py-2 text-xs font-mono uppercase bg-zinc-50 border border-zinc-200 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 whitespace-nowrap"
                  >
                    Apply
                  </button>
                </form>
              )}

              {availableCoupons.length > 0 && !cartSummary.couponCode && (
                <div className="pt-1 space-y-1.5">
                  <p className="text-[11px] text-zinc-500">Available privilege codes:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableCoupons.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => applyCoupon(c.code)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-md transition-colors"
                      >
                        <Tag className="w-3 h-3" />
                        <span>{c.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Breakdown */}
            <dl className="space-y-2.5 text-xs border-t border-zinc-100 pt-4">
              <div className="flex justify-between text-zinc-600">
                <dt>Original MRP Subtotal</dt>
                <dd className="font-mono tabular-nums">{formatINR(cartSummary.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-emerald-700">
                <dt>Product Discount</dt>
                <dd className="font-mono tabular-nums">
                  −{formatINR(cartSummary.productDiscount)}
                </dd>
              </div>
              {cartSummary.couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <dt>Coupon Discount ({cartSummary.couponCode})</dt>
                  <dd className="font-mono tabular-nums">
                    −{formatINR(cartSummary.couponDiscount)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between text-zinc-600">
                <dt>Taxable Net Amount</dt>
                <dd className="font-mono tabular-nums">
                  {formatINR(cartSummary.taxableAmount)}
                </dd>
              </div>
              <div className="flex justify-between text-zinc-600">
                <dt>GST ({cartSummary.gstRatePercent}%)</dt>
                <dd className="font-mono tabular-nums">
                  +{formatINR(cartSummary.gstTaxAmount)}
                </dd>
              </div>
              <div className="flex justify-between text-zinc-600">
                <dt>Estimated Standard Delivery</dt>
                <dd className="font-mono tabular-nums">
                  {cartSummary.deliveryFee === 0
                    ? 'Complimentary'
                    : formatINR(cartSummary.deliveryFee)}
                </dd>
              </div>
              <div className="flex justify-between text-base font-bold text-zinc-900 border-t border-zinc-200 pt-3">
                <dt>Final Payable Amount</dt>
                <dd className="font-mono tabular-nums">{formatINR(cartSummary.finalTotal)}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 text-xs font-semibold text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              <span>Proceed to Secure Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Saved For Later Section */}
      {savedForLaterItems.length > 0 && (
        <div className="border-t border-zinc-200 pt-10 space-y-5">
          <h2 className="font-display text-xl font-bold text-zinc-900">
            Saved for Later ({savedForLaterItems.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedForLaterItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-zinc-200/80 rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-14 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                    <ResilientImage
                      src={item.image}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <Link
                      to={`/products/${item.productSlug}`}
                      className="text-xs font-semibold text-zinc-900 hover:underline"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-[11px] text-zinc-500">{item.variantLabel}</p>
                    <p className="text-xs font-mono font-semibold text-zinc-900 mt-0.5">
                      {formatINR(item.unitPrice)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSaveForLater(item.id)}
                    className="px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 whitespace-nowrap"
                  >
                    Move to Bag
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 text-zinc-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 2. Wishlist Page
export const WishlistPage: React.FC = () => {
  const { user, wishlistProducts, moveWishlistToCart, toggleWishlist } = useStore();

  if (!user) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12">
        <EmptyState
          title="Sign In to Access Your Wishlist"
          description="Save instruments across sessions and move them directly to your shopping bag."
          actionLabel="Sign In"
          actionTo="/login"
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10 space-y-8">
      <div className="border-b border-zinc-200 pb-5">
        <h1 className="font-display text-3xl font-bold text-zinc-900">
          Saved Wishlist ({wishlistProducts.length})
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Curated instruments reserved for future acquisition.
        </p>
      </div>

      {wishlistProducts.length === 0 ? (
        <EmptyState
          title="Your Wishlist is Empty"
          description="Click the heart icon on any product to save it here for quick comparison or purchase."
          actionLabel="Explore Catalog"
          actionTo="/products"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <Link to={`/products/${p.slug}`} className="aspect-[4/3] bg-zinc-100 block">
                <ResilientImage
                  src={p.images[0]?.url || ''}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
              </Link>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-zinc-500">{p.brand}</p>
                  <Link
                    to={`/products/${p.slug}`}
                    className="text-base font-semibold text-zinc-900 hover:text-amber-800 block mt-0.5"
                  >
                    {p.name}
                  </Link>
                  <p className="text-sm font-mono font-semibold text-zinc-900 mt-2">
                    {formatINR(p.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => moveWishlistToCart(p.id, p.variants[0]?.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Move to Bag</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWishlist(p.id)}
                    className="px-3 py-2 text-xs font-medium text-zinc-600 hover:text-red-600 border border-zinc-200 rounded-lg"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 3. Product Comparison Matrix Page
export const ComparePage: React.FC = () => {
  const { compareIds, toggleCompare, clearCompare, addToCart } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (compareIds.length === 0) {
      setProducts([]);
      return;
    }
    setLoading(true);
    apiRequest(`/products/compare?ids=${compareIds.join(',')}`)
      .then((res) => setProducts(res.data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [compareIds]);

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10 space-y-8">
      <div className="flex items-end justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-900">
            Specification Comparison Matrix
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Side-by-side evaluation of pricing, ratings, availability, and hardware
            specifications (up to 4 instruments).
          </p>
        </div>
        {products.length > 0 && (
          <button
            type="button"
            onClick={clearCompare}
            className="px-3.5 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-100"
          >
            Clear Comparison
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-500">
          Loading comparison matrix...
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No Instruments Selected for Comparison"
          description="Click the scale icon on up to 4 product cards to compare their technical specifications."
          actionLabel="Browse Catalog"
          actionTo="/products"
        />
      ) : (
        <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="p-5 w-48 text-xs font-semibold text-zinc-500 bg-zinc-50/60">
                  Instrument
                </th>
                {products.map((p) => (
                  <th key={p.id} className="p-5 align-top border-l border-zinc-100 w-64">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => toggleCompare(p.id)}
                        className="absolute top-2 right-2 p-1 bg-white/90 rounded-md text-zinc-500 hover:text-red-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="aspect-[4/3] rounded-lg overflow-hidden bg-zinc-100 mb-3">
                        <ResilientImage
                          src={p.images[0]?.url || ''}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Link
                        to={`/products/${p.slug}`}
                        className="text-sm font-semibold text-zinc-900 hover:text-amber-800 block"
                      >
                        {p.name}
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs">
              <tr>
                <td className="p-4 font-medium text-zinc-500 bg-zinc-50/60">Price</td>
                {products.map((p) => (
                  <td
                    key={p.id}
                    className="p-4 font-mono font-semibold text-sm text-zinc-900 border-l border-zinc-100"
                  >
                    {formatINR(p.price)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-medium text-zinc-500 bg-zinc-50/60">Brand &amp; SKU</td>
                {products.map((p) => (
                  <td key={p.id} className="p-4 text-zinc-700 border-l border-zinc-100">
                    {p.brand} · <span className="font-mono">{p.sku}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-medium text-zinc-500 bg-zinc-50/60">Rating</td>
                {products.map((p) => (
                  <td key={p.id} className="p-4 border-l border-zinc-100">
                    <RatingStars
                      rating={p.ratingSummary.average || 4.8}
                      count={p.ratingSummary.count}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-medium text-zinc-500 bg-zinc-50/60">Availability</td>
                {products.map((p) => (
                  <td key={p.id} className="p-4 border-l border-zinc-100">
                    <span
                      className={
                        p.stock > 0
                          ? 'text-emerald-700 font-medium'
                          : 'text-red-600 font-medium'
                      }
                    >
                      {p.stock > 0 ? `In Stock (${p.stock} units)` : 'Out of Stock'}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-medium text-zinc-500 bg-zinc-50/60">
                  Key Specifications
                </td>
                {products.map((p) => (
                  <td key={p.id} className="p-4 border-l border-zinc-100 space-y-1.5">
                    {p.specifications.map((s, i) => (
                      <div key={i}>
                        <span className="text-zinc-400">{s.label}: </span>
                        <span className="font-medium text-zinc-800">{s.value}</span>
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 font-medium text-zinc-500 bg-zinc-50/60">Action</td>
                {products.map((p) => (
                  <td key={p.id} className="p-4 border-l border-zinc-100">
                    <button
                      type="button"
                      disabled={p.stock < 1}
                      onClick={() => addToCart(p.id, p.variants[0]?.id, 1)}
                      className="w-full py-2 px-3 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 disabled:opacity-40"
                    >
                      Add to Bag
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
