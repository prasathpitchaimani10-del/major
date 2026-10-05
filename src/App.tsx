import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/HomePage';
import { ProductCatalogPage } from './pages/ProductCatalogPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import {
  CartPage,
  WishlistPage,
  ComparePage,
} from './pages/CartWishlistComparePages';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersListPage, OrderDetailsPage } from './pages/OrdersPages';
import {
  LoginPage,
  RegisterPage,
  VerifyOtpPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  ProfilePage,
  AddressesPage,
} from './pages/AccountPages';
import {
  AdminLoginPage,
  AdminDashboardPage,
  AdminProductsPage,
  AdminProductFormPage,
  AdminCustomersPage,
  AdminOrdersPage,
  AdminCouponsPage,
  AdminReviewsPage,
  AdminQuestionsPage,
} from './pages/AdminPages';

export function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <MainLayout>
          <Routes>
            {/* Customer Storefront & Catalog Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductCatalogPage />} />
            <Route path="/category/:slug" element={<ProductCatalogPage />} />
            <Route path="/products/:slug" element={<ProductDetailsPage />} />
            <Route path="/compare" element={<ComparePage />} />

            {/* Shopping Bag, Wishlist & Checkout Routes */}
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />

            {/* Customer Orders & Tracking Routes */}
            <Route path="/orders" element={<OrdersListPage />} />
            <Route path="/orders/:id" element={<OrderDetailsPage />} />

            {/* Customer Authentication & Account Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify" element={<VerifyOtpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/addresses" element={<AddressesPage />} />

            {/* Protected Admin Management Routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/products/new" element={<AdminProductFormPage />} />
            <Route path="/admin/products/:id/edit" element={<AdminProductFormPage />} />
            <Route path="/admin/customers" element={<AdminCustomersPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/orders/:id" element={<OrderDetailsPage />} />
            <Route path="/admin/coupons" element={<AdminCouponsPage />} />
            <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            <Route path="/admin/questions" element={<AdminQuestionsPage />} />
          </Routes>
        </MainLayout>
      </StoreProvider>
    </BrowserRouter>
  );
}

export default App;
