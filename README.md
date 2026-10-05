# Krono & Co. — Full-Stack E-Commerce Web Application

## 1. Project Overview

**Krono & Co.** is a production-style full-stack e-commerce web application engineered for serialized acoustic hardware, CNC-machined mechanical keyboards, Grade-5 titanium horology, architectural luminaires, and manual lever espresso systems.

Every customer and administrative operation is connected end-to-end from the React UI through a dedicated API client to Express routes, controllers, server-side pricing/payment services, and Mongoose schemas.

---

## 2. Core Features

### Customer Storefront & Account
- **Authentication & Security**: Registration with `bcryptjs` password hashing, email/phone login with JWT tokens, 6-digit OTP email verification with expiration and resend rate limiting, forgot/reset password flow, and profile management.
- **Address Book & Tokenized Payment References**: Full CRUD for multiple delivery addresses (Home, Work, Other) with default address selection. PCI-safe tokenized payment reference management that strictly rejects raw card numbers or CVV storage.
- **Catalog, Search & Filtering**: Department and subcategory browsing with product counts, real-time debounced search autocomplete suggestions, multi-facet filtering (category, subcategory, price range, brand, minimum rating, stock availability), and 6 sorting modes.
- **Multi-Variant Product Details**: Configurable SKU variants (color, size, capacity, finish) with variant-specific pricing and stock, pincode delivery & COD availability checker, side-by-side specification comparison matrix (up to 4 products), verified-purchase customer reviews with photo support, and technical Q&A.
- **Shopping Bag, Save for Later & Buy Now**: Server-synchronized cart with stock-validated quantity steppers, Save-for-Later list, privilege coupon validation (`ATELIER10`, `KRONO2500`, `HOROLOGY5000`), and isolated single-item **Buy Now** direct checkout.
- **5-Step Server-Validated Checkout**: Address → Delivery Method (Standard, Express Air, White-Glove) → Payment Method (UPI, Card, NetBanking, Wallet, COD) → Final Order Review → Confirmation.
- **Orders, Tracking, Returns, Refunds & GST Invoices**: Full status timeline tracking, customer order cancellation with automatic inventory restoration and gateway refund, return/replacement requests on delivered orders, one-click reorder at live pricing, and printable GST Tax Invoices.

### Protected Admin Console
- **Role-Based Access Control (RBAC)**: Protected `/admin/*` frontend routes and `/api/admin/*` backend endpoints requiring an authenticated `admin` JWT role.
- **Executive Dashboard**: Live gross revenue, order pipeline counts, customer metrics, low-stock alerts, and recent orders.
- **Catalog, Media, Order, Customer, Coupon & Moderation CRUD**: Full product & variant CRUD, Cloudinary media upload/deletion, order status transitions (11 statuses), customer account activation/suspension, coupon management, review moderation, and specialist Q&A responses.

---

## 3. Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, React Router v7, Lucide Icons
- **Backend**: Node.js, Express.js, TypeScript (`tsx`)
- **Database**: MongoDB Atlas + Mongoose ODM (with automatic seeded persistence fallback when `MONGODB_URI` is not configured in local sandboxes)
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `express-rate-limit`, `helmet`, `cors`
- **Media Storage**: Cloudinary SDK (`cloudinary`)
- **Testing**: Vitest + Supertest integration test suite
- **Deployment Target**: Render (Render Static Site + Render Web Service)

---

## 4. Architecture & Folder Structure

```text
/
├── client/                  # Render Static Site root configuration
│   ├── src/
│   └── package.json
├── server/                  # Render Web Service backend API
│   ├── config/
│   │   ├── cloudinary.ts    # Cloudinary media upload/delete wrapper
│   │   └── database.ts      # MongoDB Atlas connection manager
│   ├── controllers/
│   │   ├── adminController.ts
│   │   ├── authController.ts
│   │   ├── cartWishlistController.ts
│   │   ├── orderCheckoutController.ts
│   │   ├── productController.ts
│   │   └── reviewQuestionController.ts
│   ├── middleware/
│   │   ├── auth.ts          # JWT verification & requireAdmin RBAC
│   │   └── errorHandler.ts  # Consistent JSON error formatting
│   ├── models/
│   │   ├── schemas.ts       # Mongoose schemas & indexes
│   │   ├── store.ts         # Seeded data store & rating aggregator
│   │   └── types.ts
│   ├── routes/
│   │   └── index.ts         # RESTful /api/* route definitions
│   ├── services/
│   │   ├── paymentService.ts# Isolated payment gateway & HMAC verification
│   │   └── pricingService.ts# Server-authoritative checkout & GST engine
│   ├── tests/
│   │   └── api.test.ts      # Integration tests
│   ├── utils/
│   │   ├── apiResponse.ts
│   │   └── seed.ts          # Database seeding script
│   ├── validators/
│   │   └── requestValidators.ts
│   ├── app.ts
│   ├── server.ts            # Standalone Render Web Service entry point
│   └── package.json
├── src/                     # React + Vite Frontend Application
│   ├── assets/images/       # High-resolution studio product assets
│   ├── components/
│   │   └── CommonUI.tsx
│   ├── context/
│   │   └── StoreContext.tsx
│   ├── layouts/
│   │   └── MainLayout.tsx
│   ├── pages/
│   │   ├── AccountPages.tsx
│   │   ├── AdminPages.tsx
│   │   ├── CartWishlistComparePages.tsx
│   │   ├── CheckoutPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── OrdersPages.tsx
│   │   ├── ProductCatalogPage.tsx
│   │   └── ProductDetailsPage.tsx
│   ├── services/
│   │   └── api.ts           # Centralized VITE_API_BASE_URL client
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── render.yaml              # Render Blueprint for Static Site + Web Service
├── server.ts                # Unified full-stack entry point (Port 3000)
├── package.json
└── README.md
```

---

## 5. Database Design & Indexing

Defined in `server/models/schemas.ts` using Mongoose:
- **User**: `email` (unique index), `passwordHash`, `role` (`customer` | `admin`), embedded `addresses`, embedded `savedPaymentMethods` (tokenized references only).
- **Category**: `slug` (unique index), embedded `subcategories`.
- **Product**: `slug` (unique index), `sku` (unique index), `category` (index), `brand` (index), embedded `variants` (`ProductVariantSchema`), `specifications`, `images` (Cloudinary URLs + `publicId`), `ratingSummary`.
- **Cart & Wishlist**: Indexed by `userId`, supporting active cart items, `savedForLater` items, and applied coupon code.
- **Coupon**: `code` (unique uppercase index), `discountType` (`PERCENTAGE` | `FIXED`), `minPurchaseAmount`, `maxDiscountAmount`, `expiresAt`, `usageLimit`, `usedCount`.
- **Order**: `orderNumber` (unique index), `userId` (index), historical `items` snapshot (`unitPriceAtPurchase`), `pricing` breakdown (`subtotal`, `productDiscount`, `couponDiscount`, `deliveryFee`, `gstTaxAmount`, `finalTotal`), `addressSnapshot`, `statusHistory`, `cancellation`, `returnRequest`, `refundInfo`, `invoiceNumber`.
- **Payment, Review, Question, Notification**: Indexed by `orderId`, `productId`, and `userId`.

---

## 6. REST API Overview & Response Format

All endpoints return a consistent JSON envelope:
- **Success**: `{ "success": true, "message": "...", "data": { ... } }`
- **Error**: `{ "success": false, "message": "...", "errors": [ ... ] }`

### Route Groups
- `GET /api/health` — Render health check endpoint (`{ "success": true, "message": "API is running" }`)
- `/api/auth/*` — `POST /register`, `POST /login`, `POST /verify-otp`, `POST /resend-otp`, `POST /forgot-password`, `POST /reset-password`, `GET /me`
- `/api/users/*` — `GET/PUT /profile`, `PUT /change-password`, `POST/PUT/DELETE /addresses`, `POST/DELETE /payment-methods`
- `/api/categories` & `/api/products/*` — Catalog listing, search suggestions, comparison matrix, pincode delivery verification, product details
- `/api/cart/*`, `/api/wishlist/*`, `/api/coupons` — Cart CRUD, save-for-later, coupon validation, wishlist sync
- `/api/checkout/*` & `/api/payments/*` — Server-side price recalculation, idempotent order creation, HMAC-SHA256 payment verification
- `/api/orders/*` — Customer orders, tracking timeline, cancellation, return/replacement requests, reorder
- `/api/reviews/*`, `/api/questions/*`, `/api/notifications/*` — Server-verified purchase reviews, Q&A, notifications
- `/api/admin/*` — Protected Admin CRUD for dashboard metrics, products, Cloudinary uploads, orders, customers, coupons, reviews, and Q&A

---

## 7. Environment Variables

Copy `.env.example` to `.env` for local development:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/krono_commerce
JWT_SECRET=replace_with_strong_random_256_bit_secret_in_production
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:3000

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

PAYMENT_PROVIDER_KEY=rzp_test_sandbox_key_id
PAYMENT_PROVIDER_SECRET=rzp_test_sandbox_key_secret
PAYMENT_WEBHOOK_SECRET=whsec_test_webhook_secret

EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=587
EMAIL_USER=your_smtp_user
EMAIL_PASSWORD=your_smtp_password

VITE_API_BASE_URL=/api
```

---

## 8. Local Development, Seeding & Testing

### Install Dependencies
```bash
npm install
```

### Seed Database / Inspect Seeded Accounts
```bash
npm run seed
```
- **Seeded Admin Account**: `admin@krono.co` / `Admin@123`
- **Seeded Customer Account**: `aarav@example.com` / `Customer@123`
- **Seeded Coupons**: `ATELIER10` (10% off above ₹15,000), `KRONO2500` (₹2,500 off above ₹25,000), `HOROLOGY5000` (₹5,000 off above ₹60,000)

### Start Full-Stack Development Server
```bash
npm run dev
```

### Run Backend Integration Tests
```bash
npm test
```

### Production Build Check
```bash
npm run build
```

---

## 9. Render Deployment Guide (Static Site + Web Service)

This repository is architected specifically for **Render** (either via the included `render.yaml` Blueprint or manual service creation).

### A. Deploying the Backend API on Render (Web Service)
1. In the Render Dashboard, create a new **Web Service** connected to your GitHub repository.
2. Configure the service settings:
   - **Root Directory**: `server` (or leave blank if running unified `npm start` from root)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
3. The server automatically binds to `0.0.0.0` on `process.env.PORT`.
4. Add the Backend Environment Variables in Render:
   - `NODE_ENV=production`
   - `MONGODB_URI` (Your MongoDB Atlas connection string)
   - `JWT_SECRET` (Generated 256-bit secret)
   - `JWT_EXPIRES_IN=7d`
   - `CLIENT_URL` (Your Render Static Site URL, e.g., `https://krono-ecommerce-client.onrender.com`)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `PAYMENT_PROVIDER_KEY`, `PAYMENT_PROVIDER_SECRET`, `PAYMENT_WEBHOOK_SECRET`

### B. Deploying the Frontend on Render (Static Site)
1. In the Render Dashboard, create a new **Static Site** connected to your GitHub repository.
2. Configure the build settings:
   - **Root Directory**: `client` (or root `/` with Publish Directory `dist`)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist` (resolves to `client/dist`)
3. Add the Frontend Environment Variable:
   - `VITE_API_BASE_URL=https://<your-backend-service>.onrender.com/api`
4. **React Router SPA Rewrite Rule (Mandatory)**:
   In the Render Static Site dashboard under **Redirects/Rewrites**, add:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`
   *(This is also pre-configured in `render.yaml` so refreshing nested routes like `/products/aether-h1-reference-planar-headphones` or `/orders/ord_1001` works seamlessly).*

---

## 10. Known Limitations & Future Improvements
- **Sandbox Payment Flow**: Online payment methods (UPI, Card, NetBanking, Wallet) use a deterministic HMAC-SHA256 sandbox verification modal so evaluators can test both cryptographic signature verification and simulated bank declines without real credit card charges.
- **Future Enhancements**: Live carrier webhook listeners for automated AWB tracking updates and multi-warehouse inventory allocation.
