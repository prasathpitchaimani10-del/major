import { Request, Response } from 'express';
import { dbStore } from '../models/store';
import { sendSuccess, sendError } from '../utils/apiResponse';

export const getCategories = (_req: Request, res: Response) => {
  const categoriesWithCounts = dbStore.categories
    .filter((c) => c.isActive)
    .map((cat) => {
      const productCount = dbStore.products.filter(
        (p) => p.isActive && p.category === cat.slug
      ).length;

      const subcategories = cat.subcategories.map((sub) => ({
        ...sub,
        productCount: dbStore.products.filter(
          (p) => p.isActive && p.category === cat.slug && p.subcategory === sub.slug
        ).length,
      }));

      return {
        ...cat,
        productCount,
        subcategories,
      };
    });

  return sendSuccess(res, 'Categories retrieved successfully.', {
    categories: categoriesWithCounts,
  });
};

export const getProducts = (req: Request, res: Response) => {
  const {
    q = '',
    category = '',
    subcategory = '',
    brand = '',
    minPrice,
    maxPrice,
    minRating,
    inStock,
    featured,
    trending,
    newArrival,
    deal,
    sort = 'relevance',
    page = '1',
    limit = '12',
  } = req.query;

  let filtered = dbStore.products.filter((p) => p.isActive);

  const searchQuery = String(q).trim().toLowerCase();
  if (searchQuery) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery) ||
        p.description.toLowerCase().includes(searchQuery) ||
        p.shortDescription.toLowerCase().includes(searchQuery) ||
        p.brand.toLowerCase().includes(searchQuery) ||
        p.category.toLowerCase().includes(searchQuery) ||
        p.sku.toLowerCase().includes(searchQuery)
    );
  }

  if (category) {
    filtered = filtered.filter((p) => p.category === String(category));
  }

  if (subcategory) {
    filtered = filtered.filter((p) => p.subcategory === String(subcategory));
  }

  if (brand) {
    const brands = String(brand)
      .split(',')
      .map((b) => b.trim().toLowerCase());
    filtered = filtered.filter((p) => brands.includes(p.brand.toLowerCase()));
  }

  if (minPrice !== undefined && minPrice !== '') {
    filtered = filtered.filter((p) => p.price >= Number(minPrice));
  }

  if (maxPrice !== undefined && maxPrice !== '') {
    filtered = filtered.filter((p) => p.price <= Number(maxPrice));
  }

  if (minRating !== undefined && minRating !== '') {
    filtered = filtered.filter((p) => p.ratingSummary.average >= Number(minRating));
  }

  if (inStock === 'true') {
    filtered = filtered.filter((p) => p.stock > 0);
  }

  if (featured === 'true') {
    filtered = filtered.filter((p) => p.isFeatured);
  }

  if (trending === 'true') {
    filtered = filtered.filter((p) => p.isTrending);
  }

  if (newArrival === 'true') {
    filtered = filtered.filter((p) => p.isNewArrival);
  }

  if (deal === 'true') {
    filtered = filtered.filter((p) => p.isDeal);
  }

  // Sorting
  const sorted = [...filtered];
  switch (String(sort)) {
    case 'price_asc':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      sorted.sort((a, b) => b.price - a.price);
      break;
    case 'newest':
      sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    case 'rating':
      sorted.sort((a, b) => b.ratingSummary.average - a.ratingSummary.average);
      break;
    case 'popularity':
      sorted.sort((a, b) => b.ratingSummary.count - a.ratingSummary.count);
      break;
    default:
      // relevance: featured first, then rating
      sorted.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
      break;
  }

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.max(1, Math.min(50, parseInt(String(limit), 10) || 12));
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / limitNum));
  const paginated = sorted.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  const availableBrands = Array.from(
    new Set(dbStore.products.filter((p) => p.isActive).map((p) => p.brand))
  );

  return sendSuccess(res, 'Products retrieved successfully.', {
    products: paginated,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
    facets: {
      brands: availableBrands,
    },
  });
};

export const getSearchSuggestions = (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) {
    return sendSuccess(res, 'Suggestions retrieved.', { suggestions: [] });
  }

  const matches = dbStore.products
    .filter(
      (p) =>
        p.isActive &&
        (p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q))
    )
    .slice(0, 6)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      category: p.category,
      price: p.price,
      image: p.images[0]?.url || '',
    }));

  return sendSuccess(res, 'Search suggestions retrieved.', { suggestions: matches });
};

export const getProductBySlugOrId = (req: Request, res: Response) => {
  const identifier = req.params.slug;
  const product = dbStore.products.find(
    (p) => p.isActive && (p.slug === identifier || p.id === identifier)
  );

  if (!product) {
    return sendError(res, 'Product not found or is no longer available.', [], 404);
  }

  const reviews = dbStore.reviews
    .filter((r) => r.productId === product.id && !r.isModerated)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const questions = dbStore.questions
    .filter((q) => q.productId === product.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const relatedProducts = dbStore.products
    .filter((p) => p.isActive && p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  return sendSuccess(res, 'Product details retrieved.', {
    product,
    reviews,
    questions,
    relatedProducts,
  });
};

export const checkPincodeDelivery = (req: Request, res: Response) => {
  const pincode = String(req.query.pincode || req.body.pincode || '').trim();
  const productId = String(req.query.productId || req.body.productId || '').trim();

  if (!/^[1-9][0-9]{5}$/.test(pincode)) {
    return sendError(res, 'Please enter a valid 6-digit postal pincode.', [], 400);
  }

  if (productId) {
    const product = dbStore.products.find((p) => p.id === productId);
    if (product && product.serviceablePincodes.length > 0) {
      if (!product.serviceablePincodes.includes(pincode)) {
        return sendSuccess(res, 'Pincode checked.', {
          serviceable: false,
          pincode,
          message: 'Currently unserviceable for heavy courier dispatch at this pincode.',
        });
      }
    }
  }

  // Metro pincodes starting with 11, 40, 56, 60, 50, 70 get 2-day Express
  const prefix = pincode.substring(0, 2);
  const isMetro = ['11', '40', '56', '60', '50', '70', '41', '38'].includes(prefix);
  const estimatedDays = isMetro ? 2 : 4;
  const deliveryDate = new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000);

  return sendSuccess(res, 'Delivery availability verified.', {
    serviceable: true,
    pincode,
    isMetro,
    estimatedDays,
    estimatedDateFormatted: deliveryDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
    codAvailable: true,
    expressAvailable: isMetro,
  });
};

export const compareProducts = (req: Request, res: Response) => {
  const idsParam = String(req.query.ids || '').trim();
  if (!idsParam) {
    return sendSuccess(res, 'No products selected for comparison.', { products: [] });
  }

  const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
  if (ids.length > 4) {
    return sendError(
      res,
      'You can compare up to 4 products simultaneously.',
      ['Comparison limit exceeded'],
      400
    );
  }

  const products = ids
    .map((id) => dbStore.products.find((p) => p.id === id && p.isActive))
    .filter(Boolean);

  return sendSuccess(res, 'Comparison matrix retrieved.', { products });
};
