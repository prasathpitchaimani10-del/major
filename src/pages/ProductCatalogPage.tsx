import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, RotateCcw, Search } from 'lucide-react';
import { apiRequest } from '../services/api';
import { Product, Category } from '../types';
import {
  ProductGrid,
  LoadingSkeleton,
  EmptyState,
  ErrorState,
  Pagination,
} from '../components/CommonUI';

export const ProductCatalogPage: React.FC = () => {
  const { slug: categoryRouteSlug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states synced with URL or local controls
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(
    categoryRouteSlug || searchParams.get('category') || ''
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState(
    searchParams.get('subcategory') || ''
  );
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [minRating, setMinRating] = useState(searchParams.get('minRating') || '');
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('inStock') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (categoryRouteSlug) {
      setSelectedCategory(categoryRouteSlug);
      setSelectedSubcategory('');
      setPage(1);
    }
  }, [categoryRouteSlug]);

  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam !== null) {
      setSearchQuery(qParam);
    }
  }, [searchParams]);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedSubcategory) params.set('subcategory', selectedSubcategory);
      if (selectedBrand) params.set('brand', selectedBrand);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (minRating) params.set('minRating', minRating);
      if (inStockOnly) params.set('inStock', 'true');
      params.set('sort', sortBy);
      params.set('page', String(page));
      params.set('limit', '9');

      const [prodRes, catRes] = await Promise.all([
        apiRequest(`/products?${params.toString()}`),
        apiRequest('/categories'),
      ]);

      setProducts(prodRes.data.products || []);
      setTotalPages(prodRes.data.pagination?.totalPages || 1);
      setTotalCount(prodRes.data.pagination?.total || 0);
      setAvailableBrands(prodRes.data.facets?.brands || []);
      setCategories(catRes.data.categories || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    selectedBrand,
    minPrice,
    maxPrice,
    minRating,
    inStockOnly,
    sortBy,
    page,
  ]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const resetAllFilters = () => {
    setSearchQuery('');
    if (!categoryRouteSlug) setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedBrand('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setInStockOnly(false);
    setSortBy('relevance');
    setPage(1);
    setSearchParams({});
  };

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10">
      {/* Page Header */}
      <div className="border-b border-zinc-200 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
            <Link to="/" className="hover:text-zinc-900">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span>Catalog</span>
            {activeCategoryObj && (
              <>
                <span aria-hidden="true">/</span>
                <span className="text-zinc-900 font-medium">{activeCategoryObj.name}</span>
              </>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold text-zinc-900">
            {activeCategoryObj ? activeCategoryObj.name : 'Complete Engineering Catalog'}
          </h1>
          {activeCategoryObj && (
            <p className="text-sm text-zinc-600 mt-1">{activeCategoryObj.description}</p>
          )}
        </div>

        {/* Sort Dropdown & Count */}
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs font-mono text-zinc-500">
            Showing {products.length} of {totalCount} instruments
          </span>

          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-xs font-medium text-zinc-600">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-medium bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
            >
              <option value="relevance">Relevance &amp; Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest Releases</option>
              <option value="rating">Customer Rating</option>
              <option value="popularity">Popularity</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar Filters */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-zinc-200/80 rounded-xl p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filter Specifications</span>
              </div>
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Keyword Filter */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-800">
                Keyword or SKU
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter by model..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            {/* Department / Category */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-800">
                Department
              </label>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedSubcategory('');
                    setPage(1);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    selectedCategory === ''
                      ? 'bg-zinc-900 text-white font-medium'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  All Departments
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.slug);
                      setSelectedSubcategory('');
                      setPage(1);
                    }}
                    className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      selectedCategory === cat.slug
                        ? 'bg-zinc-900 text-white font-medium'
                        : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className="font-mono text-[11px] opacity-75">
                      {cat.productCount}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subcategories if a Category is selected */}
            {activeCategoryObj && activeCategoryObj.subcategories.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <label className="block text-xs font-semibold text-zinc-800">
                  Subcategory
                </label>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setSelectedSubcategory('')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs ${
                      selectedSubcategory === ''
                        ? 'bg-zinc-200/80 text-zinc-900 font-medium'
                        : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    All in {activeCategoryObj.name}
                  </button>
                  {activeCategoryObj.subcategories.map((sub) => (
                    <button
                      key={sub.slug}
                      type="button"
                      onClick={() => {
                        setSelectedSubcategory(sub.slug);
                        setPage(1);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs ${
                        selectedSubcategory === sub.slug
                          ? 'bg-zinc-200/80 text-zinc-900 font-medium'
                          : 'text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price Range */}
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <label className="block text-xs font-semibold text-zinc-800">
                Price Range (₹)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg"
                />
              </div>
            </div>

            {/* Brand */}
            {availableBrands.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <label className="block text-xs font-semibold text-zinc-800">
                  Atelier Division
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-2.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
                >
                  <option value="">All Brands</option>
                  {availableBrands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Minimum Rating */}
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <label className="block text-xs font-semibold text-zinc-800">
                Minimum Customer Rating
              </label>
              <select
                value={minRating}
                onChange={(e) => {
                  setMinRating(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
              >
                <option value="">Any Rating</option>
                <option value="4.5">4.5 Stars &amp; Above</option>
                <option value="4">4.0 Stars &amp; Above</option>
                <option value="3">3.0 Stars &amp; Above</option>
              </select>
            </div>

            {/* Stock Toggle */}
            <div className="pt-2 border-t border-zinc-100">
              <label className="inline-flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => {
                    setInStockOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span>Exclude Out-of-Stock Items</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="lg:col-span-9">
          {loading ? (
            <LoadingSkeleton count={6} />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchCatalog} />
          ) : products.length === 0 ? (
            <EmptyState
              title="No Matching Instruments Found"
              description="Try clearing one or more specification filters or broadening your price range."
              actionLabel="Reset All Filters"
              onActionClick={resetAllFilters}
            />
          ) : (
            <>
              <ProductGrid products={products} />
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(next) => setPage(next)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
