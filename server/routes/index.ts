import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  getCurrentProfile,
  updateProfile,
  changePassword,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  addSavedPaymentMethod,
  deleteSavedPaymentMethod,
} from '../controllers/authController';
import {
  getCategories,
  getProducts,
  getSearchSuggestions,
  getProductBySlugOrId,
  checkPincodeDelivery,
  compareProducts,
} from '../controllers/productController';
import {
  getCart,
  addToCart,
  updateCartItemQuantity,
  toggleSaveForLater,
  removeCartItem,
  applyCouponToCart,
  removeCouponFromCart,
  getWishlist,
  toggleWishlistItem,
  moveWishlistToCart,
} from '../controllers/cartWishlistController';
import {
  calculateCheckoutPreview,
  createOrder,
  verifyOrderPayment,
  getMyOrders,
  getOrderById,
  cancelOrder,
  requestReturnOrReplacement,
  reorderPreviousOrder,
} from '../controllers/orderCheckoutController';
import {
  createReview,
  deleteReview,
  askQuestion,
  getNotifications,
  markNotificationRead,
} from '../controllers/reviewQuestionController';
import {
  getDashboardStats,
  adminGetAllProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminToggleProductActive,
  adminDeleteProduct,
  adminUploadMedia,
  adminGetCustomers,
  adminToggleCustomerStatus,
  adminGetAllOrders,
  adminUpdateOrderStatus,
  adminGetCoupons,
  adminCreateCoupon,
  adminToggleCoupon,
  adminGetReviews,
  adminModerateReview,
  adminGetQuestions,
  adminAnswerQuestion,
} from '../controllers/adminController';
import { sendSuccess } from '../utils/apiResponse';
import { dbStore } from '../models/store';

const apiRouter = Router();

// 1. Health Check (Mandatory Render Requirement)
apiRouter.get('/health', (_req, res) => {
  return sendSuccess(res, 'API is running');
});

// 2. Auth Routes (/api/auth)
apiRouter.post('/auth/register', registerUser);
apiRouter.post('/auth/login', loginUser);
apiRouter.post('/auth/verify-otp', verifyOtp);
apiRouter.post('/auth/resend-otp', resendOtp);
apiRouter.post('/auth/forgot-password', forgotPassword);
apiRouter.post('/auth/reset-password', resetPassword);
apiRouter.get('/auth/me', authenticate, getCurrentProfile);

// 3. Users & Account Routes (/api/users)
apiRouter.get('/users/profile', authenticate, getCurrentProfile);
apiRouter.put('/users/profile', authenticate, updateProfile);
apiRouter.put('/users/change-password', authenticate, changePassword);
apiRouter.post('/users/addresses', authenticate, addAddress);
apiRouter.put('/users/addresses/:id', authenticate, updateAddress);
apiRouter.delete('/users/addresses/:id', authenticate, deleteAddress);
apiRouter.patch('/users/addresses/:id/default', authenticate, setDefaultAddress);
apiRouter.post('/users/payment-methods', authenticate, addSavedPaymentMethod);
apiRouter.delete('/users/payment-methods/:id', authenticate, deleteSavedPaymentMethod);

// 4. Categories & Products Routes (/api/categories & /api/products)
apiRouter.get('/categories', getCategories);
apiRouter.get('/products/suggestions', getSearchSuggestions);
apiRouter.get('/products/compare', compareProducts);
apiRouter.get('/products/delivery-check', checkPincodeDelivery);
apiRouter.get('/products', getProducts);
apiRouter.get('/products/:slug', getProductBySlugOrId);

// 5. Cart & Coupons Routes (/api/cart & /api/coupons)
apiRouter.get('/cart', authenticate, getCart);
apiRouter.post('/cart/items', authenticate, addToCart);
apiRouter.put('/cart/items/:itemId', authenticate, updateCartItemQuantity);
apiRouter.patch('/cart/items/:itemId/save-for-later', authenticate, toggleSaveForLater);
apiRouter.delete('/cart/items/:itemId', authenticate, removeCartItem);
apiRouter.post('/cart/coupon', authenticate, applyCouponToCart);
apiRouter.delete('/cart/coupon', authenticate, removeCouponFromCart);
apiRouter.get('/coupons', (_req, res) => {
  const activeCoupons = dbStore.coupons.filter(
    (c) => c.isActive && new Date(c.expiresAt).getTime() > Date.now()
  );
  return sendSuccess(res, 'Active coupons retrieved.', { coupons: activeCoupons });
});

// 6. Wishlist Routes (/api/wishlist)
apiRouter.get('/wishlist', authenticate, getWishlist);
apiRouter.post('/wishlist/toggle', authenticate, toggleWishlistItem);
apiRouter.post('/wishlist/move-to-cart', authenticate, moveWishlistToCart);

// 7. Checkout & Payments Routes (/api/checkout & /api/payments)
apiRouter.post('/checkout/calculate', authenticate, calculateCheckoutPreview);
apiRouter.post('/checkout/create-order', authenticate, createOrder);
apiRouter.post('/payments/verify', authenticate, verifyOrderPayment);

// 8. Orders Routes (/api/orders)
apiRouter.get('/orders', authenticate, getMyOrders);
apiRouter.get('/orders/:id', authenticate, getOrderById);
apiRouter.post('/orders/:id/cancel', authenticate, cancelOrder);
apiRouter.post('/orders/:id/return', authenticate, requestReturnOrReplacement);
apiRouter.post('/orders/:id/reorder', authenticate, reorderPreviousOrder);

// 9. Reviews, Questions & Notifications (/api/reviews, /api/questions, /api/notifications)
apiRouter.post('/reviews', authenticate, createReview);
apiRouter.delete('/reviews/:id', authenticate, deleteReview);
apiRouter.post('/questions', authenticate, askQuestion);
apiRouter.get('/notifications', authenticate, getNotifications);
apiRouter.patch('/notifications/:id/read', authenticate, markNotificationRead);

// 10. Protected Admin Routes (/api/admin)
apiRouter.get('/admin/dashboard', authenticate, requireAdmin, getDashboardStats);
apiRouter.get('/admin/products', authenticate, requireAdmin, adminGetAllProducts);
apiRouter.post('/admin/products', authenticate, requireAdmin, adminCreateProduct);
apiRouter.put('/admin/products/:id', authenticate, requireAdmin, adminUpdateProduct);
apiRouter.patch(
  '/admin/products/:id/toggle-active',
  authenticate,
  requireAdmin,
  adminToggleProductActive
);
apiRouter.delete('/admin/products/:id', authenticate, requireAdmin, adminDeleteProduct);
apiRouter.post('/admin/media/upload', authenticate, requireAdmin, adminUploadMedia);

apiRouter.get('/admin/customers', authenticate, requireAdmin, adminGetCustomers);
apiRouter.patch(
  '/admin/customers/:id/toggle-status',
  authenticate,
  requireAdmin,
  adminToggleCustomerStatus
);

apiRouter.get('/admin/orders', authenticate, requireAdmin, adminGetAllOrders);
apiRouter.patch(
  '/admin/orders/:id/status',
  authenticate,
  requireAdmin,
  adminUpdateOrderStatus
);

apiRouter.get('/admin/coupons', authenticate, requireAdmin, adminGetCoupons);
apiRouter.post('/admin/coupons', authenticate, requireAdmin, adminCreateCoupon);
apiRouter.patch('/admin/coupons/:id/toggle', authenticate, requireAdmin, adminToggleCoupon);

apiRouter.get('/admin/reviews', authenticate, requireAdmin, adminGetReviews);
apiRouter.patch(
  '/admin/reviews/:id/moderate',
  authenticate,
  requireAdmin,
  adminModerateReview
);

apiRouter.get('/admin/questions', authenticate, requireAdmin, adminGetQuestions);
apiRouter.post(
  '/admin/questions/:id/answer',
  authenticate,
  requireAdmin,
  adminAnswerQuestion
);

export default apiRouter;
