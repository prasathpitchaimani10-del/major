import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Krono & Co. Full-Stack E-Commerce API Suite', () => {
  let customerToken = '';
  let adminToken = '';
  let newCustomerToken = '';
  let createdOrderId = '';

  it('1. GET /api/health returns Render health check payload', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'API is running',
      data: {},
    });
  });

  it('2. POST /api/auth/register creates a new customer with hashed password and OTP', async () => {
    const uniqueEmail = `test_${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({
      name: 'Meera Krishnan',
      email: uniqueEmail,
      phone: '+91 98111 22333',
      password: 'Password@123',
      confirmPassword: 'Password@123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe(uniqueEmail);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    newCustomerToken = res.body.data.token;
  });

  it('3. POST /api/auth/login authenticates seeded customer and admin accounts', async () => {
    const custRes = await request(app).post('/api/auth/login').send({
      identifier: 'aarav@example.com',
      password: 'Customer@123',
    });
    expect(custRes.status).toBe(200);
    expect(custRes.body.data.user.role).toBe('customer');
    customerToken = custRes.body.data.token;

    const admRes = await request(app).post('/api/auth/login').send({
      identifier: 'admin@krono.co',
      password: 'Admin@123',
    });
    expect(admRes.status).toBe(200);
    expect(admRes.body.data.user.role).toBe('admin');
    adminToken = admRes.body.data.token;
  });

  it('4. Admin RBAC middleware blocks customer from accessing /api/admin/dashboard', async () => {
    const forbiddenRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.success).toBe(false);

    const allowedRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.data.metrics.totalProducts).toBeGreaterThanOrEqual(6);
  });

  it('5. Admin can create a new catalog product and customer can retrieve it', async () => {
    const createRes = await request(app)
      .post('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Chronos Desk Reference Clock',
        description: 'Machined brass desk instrument with Swiss quartz movement.',
        category: 'horology-timepieces',
        subcategory: 'field-watches',
        brand: 'Krono Horology',
        sku: 'KRN-CLK-09',
        price: 16500,
        originalPrice: 19500,
        stock: 12,
      });

    expect(createRes.status).toBe(201);
    const slug = createRes.body.data.product.slug;

    const getRes = await request(app).get(`/api/products/${slug}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.product.price).toBe(16500);
  });

  it('6. Cart operations and coupon validation recalculate totals on the server', async () => {
    const addRes = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: 'prod_01',
        variantId: 'var_h1_obs',
        quantity: 1,
      });
    expect(addRes.status).toBe(200);

    const couponRes = await request(app)
      .post('/api/cart/coupon')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ code: 'ATELIER10' });
    expect(couponRes.status).toBe(200);
    expect(couponRes.body.data.summary.couponDiscount).toBeGreaterThan(0);
    expect(couponRes.body.data.summary.gstTaxAmount).toBeGreaterThan(0);
  });

  it('7. Checkout calculation and order creation enforce ownership & server pricing', async () => {
    const calcRes = await request(app)
      .post('/api/checkout/calculate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        buyNowItem: {
          productId: 'prod_02',
          variantId: 'var_m75_slv_lin',
          quantity: 1,
        },
        couponCode: 'ATELIER10',
        deliveryMethod: 'Standard',
      });
    expect(calcRes.status).toBe(200);
    expect(calcRes.body.data.calculation.finalTotal).toBe(24214);

    const orderRes = await request(app)
      .post('/api/checkout/create-order')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: 'addr_cust_1',
        deliveryMethod: 'Standard',
        paymentMethod: 'COD',
        buyNowItem: {
          productId: 'prod_02',
          variantId: 'var_m75_slv_lin',
          quantity: 1,
        },
      });
    expect(orderRes.status).toBe(201);
    createdOrderId = orderRes.body.data.order.id;

    // Verify another customer cannot access this order
    const unauthorizedOrderView = await request(app)
      .get(`/api/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${newCustomerToken}`);
    expect(unauthorizedOrderView.status).toBe(403);
  });

  it('8. Verified purchase review ignores client boolean and checks backend order history', async () => {
    // New customer who has never purchased prod_01 tries to pass verifiedPurchase: true
    const revRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${newCustomerToken}`)
      .send({
        productId: 'prod_01',
        rating: 5,
        title: 'Testing verified flag',
        comment: 'Checking if server overrides client verifiedPurchase boolean.',
        verifiedPurchase: true,
      });

    expect(revRes.status).toBe(201);
    expect(revRes.body.data.review.verifiedPurchase).toBe(false);
  });
});
