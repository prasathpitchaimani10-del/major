import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { apiRequest } from '../services/api';
import { Product, Category } from '../types';
import {
  ProductGrid,
  LoadingSkeleton,
  ErrorState,
  ResilientImage,
} from '../components/CommonUI';

const HERO_IMAGE = '/src/assets/images/hero_atelier_collection_1791206487031.jpg';

export const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCollectionTab, setActiveCollectionTab] = useState<
    'featured' | 'trending' | 'new' | 'deals'
  >('featured');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStorefront = async () => {
    setLoading(true);
    setError('');
    try {
      const [prodRes, catRes] = await Promise.all([
        apiRequest('/products?limit=20'),
        apiRequest('/categories'),
      ]);
      setProducts(prodRes.data.products || []);
      setCategories(catRes.data.categories || []);
    } catch (err: any) {
      setError(err.message || 'Unable to load storefront catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorefront();
  }, []);

  const displayedProducts = products.filter((p) => {
    if (activeCollectionTab === 'featured') return p.isFeatured;
    if (activeCollectionTab === 'trending') return p.isTrending;
    if (activeCollectionTab === 'new') return p.isNewArrival;
    if (activeCollectionTab === 'deals') return p.isDeal;
    return true;
  });

  return (
    <div className="space-y-16 pb-8">
      {/* Section 1: Storefront Hero */}
      <section className="max-w-[1360px] mx-auto px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-zinc-900 text-white rounded-2xl overflow-hidden border border-zinc-800">
          <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 space-y-6">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
              <span>2026 Studio Reference Series</span>
              <span aria-hidden="true">·</span>
              <span>Mumbai &amp; Bengaluru Atelier</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.12] text-white">
              Instruments Built for Tactile Permanence.
            </h1>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-xl">
              From CNC-milled planar magnetic headphones and gasket-mounted aluminum
              keyboards to Grade-5 titanium automatic chronographs. Every piece is
              serialized and calibrated before dispatch.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-6 py-3 text-xs font-semibold bg-white text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors whitespace-nowrap"
              >
                <span>Explore Full Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/products/aether-h1-reference-planar-headphones"
                className="inline-flex items-center gap-2 px-5 py-3 text-xs font-medium text-zinc-200 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap"
              >
                <span>Inspect Aether H1</span>
              </Link>
            </div>

            <div className="pt-4 border-t border-zinc-800 grid grid-cols-3 gap-4 text-xs text-zinc-400">
              <div>
                <p className="font-mono font-semibold text-white text-sm">100% Server</p>
                <p>Authoritative Checkout</p>
              </div>
              <div>
                <p className="font-mono font-semibold text-white text-sm">3-5 Years</p>
                <p>Serialized Warranty</p>
              </div>
              <div>
                <p className="font-mono font-semibold text-white text-sm">COD &amp; UPI</p>
                <p>Instant Verification</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 h-full min-h-[340px] lg:min-h-[480px] relative bg-zinc-800">
            <ResilientImage
              src={HERO_IMAGE}
              alt="Krono Studio Reference Collection"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:bg-gradient-to-r lg:from-zinc-900/40 lg:to-transparent" />
          </div>
        </div>
      </section>

      {/* Section 2: Curated Collections (Interactive Filter Controls + 3-Column Uniform Grid) */}
      <section className="max-w-[1360px] mx-auto px-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 pb-5">
          <div>
            <p className="text-xs text-zinc-500 mb-1">01. Serialized Production</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900">
              Atelier Catalog Highlights
            </h2>
          </div>

          {/* Interactive segmented filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-zinc-200/70 rounded-lg self-start">
            {(
              [
                ['featured', 'Featured'],
                ['trending', 'Trending'],
                ['new', 'New Arrivals'],
                ['deals', 'Privilege Offers'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveCollectionTab(key)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeCollectionTab === key
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchStorefront} />
        ) : (
          <ProductGrid
            products={
              displayedProducts.length > 0 ? displayedProducts : products.slice(0, 6)
            }
          />
        )}
      </section>

      {/* Section 3: Architectural Departments & Craftsmanship */}
      <section className="max-w-[1360px] mx-auto px-6 space-y-8">
        <div className="flex items-end justify-between border-b border-zinc-200 pb-5">
          <div>
            <p className="text-xs text-zinc-500 mb-1">02. Taxonomy &amp; Disciplines</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900">
              Browse by Engineering Department
            </h2>
          </div>
          <Link
            to="/products"
            className="text-xs font-semibold text-zinc-900 hover:text-amber-800 inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>All Departments</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="group bg-white border border-zinc-200/80 rounded-xl overflow-hidden flex flex-col justify-between hover:border-zinc-400 transition-colors"
            >
              <div className="aspect-[4/3] bg-zinc-100 overflow-hidden">
                <ResilientImage
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                  <span>{cat.subcategories.length} Subcategories</span>
                  <span className="font-mono">{cat.productCount || 1} Items</span>
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-amber-800 transition-colors">
                  {cat.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        {/* Service & Fulfillment Guarantees */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="bg-white border border-zinc-200/80 rounded-xl p-6 space-y-2">
            <div className="flex items-center gap-2.5 text-zinc-900 font-semibold text-sm">
              <Truck className="w-4 h-4 text-amber-700" />
              <span>Insured Air Priority Logistics</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Complimentary Standard shipping on orders above ₹10,000. 48-hour Express
              air dispatch available for metro postal codes.
            </p>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-xl p-6 space-y-2">
            <div className="flex items-center gap-2.5 text-zinc-900 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Cryptographic Payment Verification</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Pay via UPI, Cards, NetBanking, Wallets, or Cash on Delivery. All prices,
              coupons, and 18% GST invoices are verified on our backend.
            </p>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-xl p-6 space-y-2">
            <div className="flex items-center gap-2.5 text-zinc-900 font-semibold text-sm">
              <RotateCcw className="w-4 h-4 text-amber-700" />
              <span>14-Day Return &amp; Replacement</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Initiate self-service returns, unit replacements, or automated payment
              refunds directly from your order timeline.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
