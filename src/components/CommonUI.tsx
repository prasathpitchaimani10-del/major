import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  Heart,
  Scale,
  ShoppingBag,
  AlertCircle,
  Package,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Product } from '../types';
import { formatINR } from '../services/api';
import { useStore } from '../context/StoreContext';

// 1. Resilient Studio Image with Zero-Broken-Image Fallback
export const ResilientImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-500 p-4 text-center ${className}`}
      >
        <Package className="w-8 h-8 mb-2 stroke-[1.5] text-zinc-400" />
        <span className="text-xs font-medium text-zinc-600 line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

// 2. RatingStars Component
export const RatingStars: React.FC<{
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
}> = ({ rating, count, size = 'sm' }) => {
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
      <div className="flex items-center text-amber-600">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${iconClass} ${
              star <= Math.round(rating)
                ? 'fill-amber-600 text-amber-600'
                : 'text-zinc-300'
            }`}
          />
        ))}
      </div>
      <span className="font-mono font-medium text-zinc-800">{rating.toFixed(1)}</span>
      {count !== undefined && (
        <>
          <span aria-hidden="true">·</span>
          <span className="text-zinc-500">
            {count} {count === 1 ? 'review' : 'reviews'}
          </span>
        </>
      )}
    </div>
  );
};

// 3. WishlistButton Component
export const WishlistButton: React.FC<{
  productId: string;
  className?: string;
}> = ({ productId, className = '' }) => {
  const { wishlistIds, toggleWishlist } = useStore();
  const isSaved = wishlistIds.includes(productId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(productId);
      }}
      aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 hover:bg-white text-zinc-800 shadow-xs transition-transform active:scale-95 ${className}`}
    >
      <Heart
        className={`w-4 h-4 transition-colors ${
          isSaved ? 'fill-red-600 text-red-600' : 'text-zinc-700'
        }`}
      />
    </button>
  );
};

// 4. ProductCard Component (Strict E-Commerce Retail Rules: 70% image height, clean unboxed metadata, tabular price)
export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { addToCart, compareIds, toggleCompare } = useStore();
  const isCompared = compareIds.includes(product.id);
  const mainImage =
    product.images.find((i) => i.isMain)?.url || product.images[0]?.url || '';
  const defaultVariant = product.variants[0];

  return (
    <div className="group flex flex-col bg-white border border-zinc-200/80 rounded-xl overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      <div className="relative aspect-[4/3] w-full bg-[#F4F4F2] overflow-hidden">
        <Link to={`/products/${product.slug}`} className="block w-full h-full">
          <ResilientImage
            src={mainImage}
            alt={product.name}
            className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-103"
          />
        </Link>

        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <WishlistButton productId={product.id} />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleCompare(product.id);
            }}
            title={isCompared ? 'Remove from comparison' : 'Compare specifications'}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-lg shadow-xs transition-colors ${
              isCompared
                ? 'bg-zinc-900 text-white'
                : 'bg-white/90 hover:bg-white text-zinc-700'
            }`}
          >
            <Scale className="w-4 h-4" />
          </button>
        </div>

        {product.stock <= 5 && product.stock > 0 && (
          <div className="absolute bottom-3 left-3 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-amber-800">
            Only {product.stock} left in stock
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5 justify-between gap-4">
        <div className="space-y-1.5">
          {/* Unboxed clean metadata with typographic separator */}
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span>
              {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
            </span>
            {product.discountPercentage > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-700 font-medium">
                  {product.discountPercentage}% Off
                </span>
              </>
            )}
          </div>

          <Link
            to={`/products/${product.slug}`}
            className="block text-base font-semibold text-zinc-900 group-hover:text-amber-800 transition-colors line-clamp-2"
          >
            {product.name}
          </Link>

          <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
            {product.shortDescription}
          </p>
        </div>

        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-semibold font-mono tabular-nums text-zinc-900">
                {formatINR(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-xs font-mono tabular-nums text-zinc-400 line-through">
                  {formatINR(product.originalPrice)}
                </span>
              )}
            </div>
            <div className="mt-1">
              <RatingStars
                rating={product.ratingSummary.average || 4.8}
                count={product.ratingSummary.count}
              />
            </div>
          </div>

          <button
            type="button"
            disabled={product.stock < 1}
            onClick={() => addToCart(product.id, defaultVariant?.id, 1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500 transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{product.stock > 0 ? 'Add to Bag' : 'Sold Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// 5. ProductGrid Component
export const ProductGrid: React.FC<{ products: Product[] }> = ({ products }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
};

// 6. LoadingSkeleton Component
export const LoadingSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-zinc-200/70 rounded-xl overflow-hidden animate-pulse"
        >
          <div className="aspect-[4/3] bg-zinc-200" />
          <div className="p-5 space-y-3">
            <div className="h-3 bg-zinc-200 rounded w-1/3" />
            <div className="h-4 bg-zinc-200 rounded w-3/4" />
            <div className="h-3 bg-zinc-200 rounded w-full" />
            <div className="pt-3 flex justify-between items-center">
              <div className="h-5 bg-zinc-200 rounded w-24" />
              <div className="h-8 bg-zinc-200 rounded w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// 7. EmptyState Component
export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onActionClick?: () => void;
}> = ({ title, description, actionLabel, actionTo, onActionClick }) => {
  return (
    <div className="bg-white border border-zinc-200/80 rounded-xl p-12 text-center max-w-lg mx-auto my-6">
      <Package className="w-10 h-10 text-zinc-400 mx-auto mb-3 stroke-[1.5]" />
      <h3 className="text-lg font-semibold text-zinc-900 mb-1.5">{title}</h3>
      <p className="text-sm text-zinc-500 mb-6 leading-relaxed">{description}</p>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onActionClick && !actionTo && (
        <button
          type="button"
          onClick={onActionClick}
          className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// 8. ErrorState Component
export const ErrorState: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => {
  return (
    <div className="bg-red-50/70 border border-red-200 rounded-xl p-8 text-center max-w-lg mx-auto my-6">
      <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2.5" />
      <h3 className="text-base font-semibold text-red-950 mb-1">
        Unable to Complete Request
      </h3>
      <p className="text-sm text-red-800 mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 text-xs font-medium text-white bg-red-800 rounded-lg hover:bg-red-900 transition-colors whitespace-nowrap"
        >
          Retry Operation
        </button>
      )}
    </div>
  );
};

// 9. Pagination Component
export const Pagination: React.FC<{
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
}> = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-8">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 whitespace-nowrap"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Previous</span>
      </button>
      <span className="px-3 py-2 text-xs font-mono text-zinc-600">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 whitespace-nowrap"
      >
        <span>Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

// 10. Modal & ConfirmationDialog Component
export const ConfirmationDialog: React.FC<{
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white border border-zinc-200 rounded-xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-zinc-600 mb-6 leading-relaxed">{description}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors whitespace-nowrap ${
              variant === 'danger'
                ? 'bg-red-700 hover:bg-red-800'
                : 'bg-zinc-900 hover:bg-zinc-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// 11. ToastNotification Container
export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useStore();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl border shadow-lg transition-all ${
            t.type === 'error'
              ? 'bg-red-950 text-white border-red-800'
              : 'bg-zinc-900 text-white border-zinc-800'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {t.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-xs font-medium">{t.title}</p>
              {t.description && (
                <p className="text-[11px] text-zinc-300 mt-0.5">{t.description}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

// 12. CompareBar Floating Tray
export const CompareFloatingBar: React.FC = () => {
  const { compareIds, clearCompare } = useStore();
  if (compareIds.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-40 bg-zinc-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-zinc-800 flex items-center gap-4 no-print">
      <div className="flex items-center gap-2 text-xs">
        <Scale className="w-4 h-4 text-amber-400" />
        <span className="font-medium">
          Comparing {compareIds.length} {compareIds.length === 1 ? 'Item' : 'Items'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/compare"
          className="px-3 py-1.5 text-xs font-medium bg-white text-zinc-900 rounded-md hover:bg-zinc-100 transition-colors whitespace-nowrap"
        >
          View Matrix
        </Link>
        <button
          type="button"
          onClick={clearCompare}
          className="text-xs text-zinc-400 hover:text-white px-1.5"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
