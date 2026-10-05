import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag,
  Zap,
  Scale,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { apiRequest, formatINR } from '../services/api';
import { Product, ProductVariant, Review, Question } from '../types';
import { useStore } from '../context/StoreContext';
import {
  ResilientImage,
  RatingStars,
  WishlistButton,
  ProductGrid,
  ErrorState,
} from '../components/CommonUI';

export const ProductDetailsPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, addToCart, compareIds, toggleCompare, showToast } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Pincode check state
  const [pincode, setPincode] = useState('560038');
  const [pincodeResult, setPincodeResult] = useState<any>(null);
  const [checkingPincode, setCheckingPincode] = useState(false);

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotoUrl, setReviewPhotoUrl] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Question form state
  const [questionText, setQuestionText] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  const loadProductData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest(`/products/${slug}`);
      const p: Product = res.data.product;
      setProduct(p);
      const firstVariant = p.variants[0] || null;
      setSelectedVariant(firstVariant);
      setActiveImage(
        firstVariant?.images?.[0]?.url || p.images?.[0]?.url || ''
      );
      setReviews(res.data.reviews || []);
      setQuestions(res.data.questions || []);
      setRelatedProducts(res.data.relatedProducts || []);
    } catch (err: any) {
      setError(err.message || 'Product not found.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadProductData();
  }, [loadProductData]);

  const handleCheckPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setCheckingPincode(true);
    try {
      const res = await apiRequest(
        `/products/delivery-check?pincode=${encodeURIComponent(pincode)}&productId=${product.id}`
      );
      setPincodeResult(res.data);
    } catch (err: any) {
      showToast(err.message || 'Invalid pincode.', 'error');
      setPincodeResult(null);
    } finally {
      setCheckingPincode(false);
    }
  };

  // Buy Now: Navigates directly to Checkout with isolated state (no cart duplication)
  const handleBuyNow = () => {
    if (!user) {
      showToast('Please sign in to proceed with instant Buy Now checkout.', 'error');
      navigate('/login');
      return;
    }
    if (!product || !selectedVariant) return;
    navigate('/checkout', {
      state: {
        buyNowItem: {
          productId: product.id,
          variantId: selectedVariant.id,
          quantity,
        },
      },
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) {
      showToast('Please sign in to write a product review.', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await apiRequest('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment,
          photos: reviewPhotoUrl.trim() ? [reviewPhotoUrl.trim()] : [],
        }),
      });
      showToast(res.message, 'success');
      setReviewTitle('');
      setReviewComment('');
      setReviewPhotoUrl('');
      await loadProductData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await apiRequest(`/reviews/${reviewId}`, { method: 'DELETE' });
      showToast('Review deleted.', 'info');
      await loadProductData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) {
      showToast('Please sign in to ask a technical question.', 'error');
      return;
    }
    setSubmittingQuestion(true);
    try {
      const res = await apiRequest('/questions', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          question: questionText,
        }),
      });
      showToast(res.message, 'success');
      setQuestionText('');
      await loadProductData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 aspect-[4/3] bg-zinc-200 rounded-2xl" />
          <div className="lg:col-span-5 space-y-4">
            <div className="h-4 bg-zinc-200 w-1/3 rounded" />
            <div className="h-8 bg-zinc-200 w-3/4 rounded" />
            <div className="h-6 bg-zinc-200 w-1/2 rounded" />
            <div className="h-32 bg-zinc-200 w-full rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12">
        <ErrorState message={error || 'Product not found.'} onRetry={loadProductData} />
      </div>
    );
  }

  const activePrice = selectedVariant ? selectedVariant.price : product.price;
  const activeOriginalPrice = selectedVariant
    ? selectedVariant.originalPrice
    : product.originalPrice;
  const activeStock = selectedVariant ? selectedVariant.stock : product.stock;
  const activeSku = selectedVariant ? selectedVariant.sku : product.sku;
  const isCompared = compareIds.includes(product.id);

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10 space-y-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link to="/" className="hover:text-zinc-900">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link to="/products" className="hover:text-zinc-900">
          Catalog
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/category/${product.category}`} className="hover:text-zinc-900">
          {product.category}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-900 font-medium truncate max-w-xs">{product.name}</span>
      </div>

      {/* Contiguous Purchase Module (Sticky Gallery Left, Purchase Module Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Gallery Column */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-24">
          <div className="relative aspect-[4/3] bg-[#F3F3F1] border border-zinc-200/80 rounded-2xl overflow-hidden">
            <ResilientImage
              src={activeImage}
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <WishlistButton productId={product.id} />
              <button
                type="button"
                onClick={() => toggleCompare(product.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg shadow-xs transition-colors ${
                  isCompared
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white/90 hover:bg-white text-zinc-800'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{isCompared ? 'Comparing' : 'Compare'}</span>
              </button>
            </div>
          </div>

          {/* Thumbnail Strip */}
          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImage(img.url)}
                  className={`w-20 h-16 rounded-lg overflow-hidden border-2 transition-colors shrink-0 ${
                    activeImage === img.url ? 'border-zinc-900' : 'border-transparent opacity-70'
                  }`}
                >
                  <ResilientImage
                    src={img.url}
                    alt={`${product.name} view ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase & Variant Module */}
        <div className="lg:col-span-5 bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2 border-b border-zinc-100 pb-5">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">SKU: {activeSku}</span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  activeStock > 0
                    ? 'text-emerald-700 font-medium'
                    : 'text-red-600 font-medium'
                }
              >
                {activeStock > 0 ? `${activeStock} in stock` : 'Out of Stock'}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 leading-tight">
              {product.name}
            </h1>

            <div className="pt-1">
              <RatingStars
                rating={product.ratingSummary.average || 4.9}
                count={product.ratingSummary.count}
                size="md"
              />
            </div>

            <div className="pt-3 flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-zinc-900">
                {formatINR(activePrice)}
              </span>
              {activeOriginalPrice > activePrice && (
                <>
                  <span className="text-sm font-mono tabular-nums text-zinc-400 line-through">
                    {formatINR(activeOriginalPrice)}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    Save {formatINR(activeOriginalPrice - activePrice)} (
                    {Math.round(
                      ((activeOriginalPrice - activePrice) / activeOriginalPrice) * 100
                    )}
                    %)
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-zinc-500">
              Price exclusive of 18% GST calculated at checkout.
            </p>
          </div>

          {/* Variant Selector */}
          {product.variants.length > 0 && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-800">
                Select Configuration ({selectedVariant?.color} · {selectedVariant?.size})
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariant(v);
                        if (v.images?.[0]?.url) {
                          setActiveImage(v.images[0].url);
                        }
                        setQuantity(1);
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-zinc-900 bg-zinc-900/3 ring-1 ring-zinc-900'
                          : 'border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-semibold text-zinc-900">
                          {v.color} {v.size ? `· ${v.size}` : ''}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {[v.capacity, v.finish, `SKU: ${v.sku}`]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-semibold text-zinc-900">
                          {formatINR(v.price)}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {v.stock > 0 ? `${v.stock} units` : 'Sold out'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & Primary Purchase Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-800">Quantity</span>
              <div className="inline-flex items-center border border-zinc-200 rounded-lg bg-zinc-50">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                >
                  −
                </button>
                <span className="px-4 py-1.5 text-xs font-mono font-semibold text-zinc-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={quantity >= activeStock}
                  onClick={() => setQuantity((q) => Math.min(activeStock, q + 1))}
                  className="px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={activeStock < 1}
                onClick={() => addToCart(product.id, selectedVariant?.id, quantity)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-semibold text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500 transition-colors whitespace-nowrap"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Shopping Bag</span>
              </button>

              <button
                type="button"
                disabled={activeStock < 1}
                onClick={handleBuyNow}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-semibold text-zinc-900 bg-amber-400/90 hover:bg-amber-400 rounded-xl disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                <Zap className="w-4 h-4" />
                <span>Buy Now Direct</span>
              </button>
            </div>
          </div>

          {/* Pincode Delivery Checker */}
          <div className="pt-4 border-t border-zinc-100 space-y-3">
            <label className="block text-xs font-semibold text-zinc-800">
              Check Postal Delivery &amp; COD Availability
            </label>
            <form onSubmit={handleCheckPincode} className="flex items-center gap-2">
              <div className="relative flex-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit Pincode"
                  className="w-full pl-8 pr-3 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900"
                />
              </div>
              <button
                type="submit"
                disabled={checkingPincode}
                className="px-4 py-2 text-xs font-medium bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 transition-colors whitespace-nowrap"
              >
                {checkingPincode ? 'Checking...' : 'Verify Pincode'}
              </button>
            </form>

            {pincodeResult && (
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/80 text-xs space-y-1">
                {pincodeResult.serviceable ? (
                  <>
                    <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        Estimated Delivery by {pincodeResult.estimatedDateFormatted} (
                        {pincodeResult.estimatedDays} Days)
                      </span>
                    </p>
                    <p className="text-zinc-600">
                      Cash on Delivery (COD) Available ·{' '}
                      {pincodeResult.expressAvailable
                        ? 'Express Air Priority Eligible'
                        : 'Standard Insured Courier'}
                    </p>
                  </>
                ) : (
                  <p className="text-red-700 font-medium">{pincodeResult.message}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-zinc-500 pt-1">
              <ShieldCheck className="w-4 h-4 text-zinc-700 shrink-0" />
              <span>{product.warrantyInfo}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Overview & Technical Specifications Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 border-t border-zinc-200 pt-12">
        <div className="lg:col-span-5 space-y-4">
          <p className="text-xs text-zinc-500">01. Architectural Overview</p>
          <h2 className="font-display text-2xl font-bold text-zinc-900">
            Design &amp; Acoustic Engineering
          </h2>
          <p className="text-sm text-zinc-600 leading-relaxed">{product.description}</p>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900">
                Technical Specifications
              </h3>
            </div>
            <dl className="divide-y divide-zinc-100 text-xs">
              {product.specifications.map((spec, i) => (
                <div
                  key={i}
                  className="px-6 py-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2"
                >
                  <dt className="font-medium text-zinc-500">{spec.label}</dt>
                  <dd className="sm:col-span-2 font-mono text-zinc-900">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Customer Reviews & Server-Verified Purchase Section */}
      <div className="border-t border-zinc-200 pt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <div>
            <p className="text-xs text-zinc-500">02. Owner Verification</p>
            <h2 className="font-display text-2xl font-bold text-zinc-900 mt-1">
              Customer Reviews ({reviews.length})
            </h2>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Our backend automatically cross-references your order history to assign
              the Verified Purchase credential.
            </p>
          </div>

          <form
            onSubmit={handleReviewSubmit}
            className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-4"
          >
            <h3 className="text-sm font-semibold text-zinc-900">Write a Review</h3>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Star Rating
              </label>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
              >
                <option value={5}>5 Stars — Reference Standard</option>
                <option value={4}>4 Stars — Above Expectations</option>
                <option value={3}>3 Stars — Satisfactory</option>
                <option value={2}>2 Stars — Subpar</option>
                <option value={1}>1 Star — Unacceptable</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Review Headline
              </label>
              <input
                type="text"
                required
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Summarize your ownership experience"
                className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Detailed Impressions
              </label>
              <textarea
                rows={3}
                required
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share build quality, acoustics, or performance feedback..."
                className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Optional Review Photo URL
              </label>
              <input
                type="text"
                value={reviewPhotoUrl}
                onChange={(e) => setReviewPhotoUrl(e.target.value)}
                placeholder="https://... or /src/assets/..."
                className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
              />
            </div>

            <button
              type="submit"
              disabled={submittingReview}
              className="w-full py-2.5 text-xs font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              {submittingReview ? 'Submitting...' : 'Publish Review'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 space-y-4">
          {reviews.length === 0 ? (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-8 text-center text-xs text-zinc-500">
              No reviews published for this instrument yet.
            </div>
          ) : (
            reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="font-semibold text-zinc-900">{rev.userName}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {rev.verifiedPurchase && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-700 font-medium">
                            Verified Purchase
                          </span>
                        </>
                      )}
                    </div>
                    <RatingStars rating={rev.rating} />
                  </div>

                  {(user?.id === rev.userId || user?.role === 'admin') && (
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(rev.id)}
                      className="text-zinc-400 hover:text-red-600"
                      title="Delete review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h4 className="text-sm font-semibold text-zinc-900">{rev.title}</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">{rev.comment}</p>

                {rev.photos && rev.photos.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    {rev.photos.map((photo, idx) => (
                      <div
                        key={idx}
                        className="w-20 h-16 rounded-lg overflow-hidden border border-zinc-200"
                      >
                        <ResilientImage
                          src={photo}
                          alt="Customer review photo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Technical Questions & Specialist Answers */}
      <div className="border-t border-zinc-200 pt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-4">
          <p className="text-xs text-zinc-500">03. Specialist Q&amp;A</p>
          <h2 className="font-display text-2xl font-bold text-zinc-900">
            Questions &amp; Answers ({questions.length})
          </h2>
          <form
            onSubmit={handleQuestionSubmit}
            className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-4"
          >
            <label className="block text-xs font-semibold text-zinc-800">
              Ask an Engineering Specialist
            </label>
            <textarea
              rows={3}
              required
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Ask about compatibility, dimensions, power requirements, or warranty..."
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
            <button
              type="submit"
              disabled={submittingQuestion}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{submittingQuestion ? 'Sending...' : 'Submit Question'}</span>
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 space-y-4">
          {questions.length === 0 ? (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-8 text-center text-xs text-zinc-500">
              No technical questions asked yet.
            </div>
          ) : (
            questions.map((q) => (
              <div
                key={q.id}
                className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-900">Q: {q.question}</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Asked by {q.userName} ·{' '}
                  {new Date(q.createdAt).toLocaleDateString('en-IN')}
                </p>

                {q.answer ? (
                  <div className="pl-4 border-l-2 border-zinc-900 space-y-1 pt-1">
                    <p className="text-xs text-zinc-800 leading-relaxed">
                      <span className="font-semibold">A: </span>
                      {q.answer}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Answered by {q.answeredBy}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 italic">
                    Awaiting response from Krono Specialist team.
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="border-t border-zinc-200 pt-12 space-y-6">
          <h2 className="font-display text-2xl font-bold text-zinc-900">
            Companion Instruments
          </h2>
          <ProductGrid products={relatedProducts} />
        </div>
      )}
    </div>
  );
};
