import React, { useEffect, useState, useCallback } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Tag,
  Star,
  MessageSquare,
  Plus,
  Upload,
  Trash2,
  Edit,
  EyeOff,
  Eye,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import { apiRequest, formatINR } from '../services/api';
import { useStore } from '../context/StoreContext';
import { Product, Order, Coupon, Review, Question, OrderStatus } from '../types';
import { ResilientImage, ErrorState } from '../components/CommonUI';

// Shared Admin Navigation Shell
const AdminShell: React.FC<{
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, actionButton, children }) => {
  const { user, logout } = useStore();
  const navigate = useNavigate();

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center space-y-4">
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 space-y-4">
          <h1 className="font-display text-2xl font-bold text-zinc-900">
            Administrator Access Required
          </h1>
          <p className="text-xs text-zinc-600 leading-relaxed">
            This management portal is restricted to authorized administrators. Sign in
            with <span className="font-mono font-semibold">admin@krono.co</span> (Password:{' '}
            <span className="font-mono font-semibold">Admin@123</span>).
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Link
              to="/admin/login"
              className="px-5 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
            >
              Go to Admin Login
            </Link>
            <Link
              to="/"
              className="px-4 py-2.5 text-xs font-medium bg-zinc-100 text-zinc-700 rounded-lg"
            >
              Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/products', label: 'Products & Media', icon: Package },
    { to: '/admin/orders', label: 'Orders & Refunds', icon: ShoppingCart },
    { to: '/admin/customers', label: 'Customers', icon: Users },
    { to: '/admin/coupons', label: 'Coupons', icon: Tag },
    { to: '/admin/reviews', label: 'Reviews', icon: Star },
    { to: '/admin/questions', label: 'Specialist Q&A', icon: MessageSquare },
  ];

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Admin Sidebar */}
        <aside className="lg:col-span-3 bg-zinc-900 text-zinc-300 rounded-2xl p-5 space-y-6">
          <div className="border-b border-zinc-800 pb-4">
            <p className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
              Operations Console
            </p>
            <h2 className="font-display text-lg font-bold text-white mt-0.5">
              Krono Admin
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 truncate">{user.name}</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-white text-zinc-900 font-semibold'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-zinc-800 space-y-2">
            <Link
              to="/"
              className="flex items-center gap-2 px-3.5 py-2 text-xs text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>View Storefront</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/admin/login');
              }}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-red-400 hover:text-red-300"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Admin</span>
            </button>
          </div>
        </aside>

        {/* Main Admin Workspace */}
        <div className="lg:col-span-9 space-y-6">
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-zinc-900">{title}</h1>
              {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
            </div>
            {actionButton}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};

// 1. Admin Login Page
export const AdminLoginPage: React.FC = () => {
  const { loginWithToken, showToast } = useStore();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('admin@krono.co');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      if (res.data.user.role !== 'admin') {
        showToast('Access denied: Administrator role required.', 'error');
        return;
      }
      loginWithToken(res.data.token, res.data.user);
      showToast('Signed in to Admin Console.', 'success');
      navigate('/admin');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-zinc-900 text-white border border-zinc-800 rounded-2xl p-8 space-y-6">
        <div>
          <p className="text-xs font-mono uppercase text-amber-400">
            Role-Based Access Control
          </p>
          <h1 className="font-display text-2xl font-bold mt-1">
            Administrator Sign In
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Default Admin Credentials pre-filled for mentor evaluation.
          </p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Administrator Email
            </label>
            <input
              type="email"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-xs font-semibold bg-amber-400 text-zinc-950 rounded-xl hover:bg-amber-300 transition-colors"
          >
            {loading ? 'Verifying Role...' : 'Enter Admin Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

// 2. Admin Dashboard Overview Page
export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/admin/dashboard');
      setData(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <AdminShell
      title="Executive Operations Overview"
      subtitle="Real-time revenue, order pipeline, customer count, and low-stock alerts."
      actionButton={
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Product</span>
        </Link>
      }
    >
      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-500">
          Loading operational metrics...
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadDashboard} />
      ) : (
        <div className="space-y-6">
          {/* Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              ['Gross Revenue', formatINR(data.metrics.revenue)],
              ['Total Orders', data.metrics.totalOrders],
              ['Pending Orders', data.metrics.pendingOrders],
              ['Delivered', data.metrics.deliveredOrders],
              ['Catalog Products', data.metrics.totalProducts],
              ['Customers', data.metrics.totalCustomers],
            ].map(([label, val], i) => (
              <div
                key={i}
                className="bg-white border border-zinc-200/80 rounded-xl p-4 space-y-1"
              >
                <p className="text-[11px] text-zinc-500">{label}</p>
                <p className="text-lg font-bold font-mono tabular-nums text-zinc-900">
                  {val}
                </p>
              </div>
            ))}
          </div>

          {/* Low Stock Inventory Alerts */}
          {data.lowStockProducts?.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-semibold text-amber-950">
                Low Stock Inventory Alerts ({data.lowStockProducts.length})
              </h3>
              <div className="divide-y divide-amber-200/60 text-xs">
                {data.lowStockProducts.map((p: Product) => (
                  <div
                    key={p.id}
                    className="py-2.5 flex items-center justify-between gap-4"
                  >
                    <div>
                      <span className="font-semibold text-zinc-900">{p.name}</span>
                      <span className="text-zinc-500 ml-2 font-mono">({p.sku})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-amber-900">
                        {p.stock} units left
                      </span>
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        className="text-zinc-900 underline font-medium"
                      >
                        Restock
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Orders Table */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">Recent Orders</h3>
              <Link
                to="/admin/orders"
                className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
              >
                View All Orders →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60 text-zinc-500">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {data.recentOrders.map((o: Order) => (
                    <tr key={o.id}>
                      <td className="py-3 px-4 font-mono font-semibold text-zinc-900">
                        {o.orderNumber}
                      </td>
                      <td className="py-3 px-4">{o.customerName}</td>
                      <td className="py-3 px-4">
                        {o.paymentMethod} ({o.paymentStatus})
                      </td>
                      <td className="py-3 px-4 font-medium">{o.orderStatus}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        {formatINR(o.pricing.finalTotal)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/admin/orders/${o.id}`}
                          className="text-zinc-900 font-semibold hover:underline"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};

// 3. Admin Products List Page
export const AdminProductsPage: React.FC = () => {
  const { showToast } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/admin/products');
      setProducts(res.data.products || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleToggleActive = async (id: string) => {
    try {
      const res = await apiRequest(`/admin/products/${id}/toggle-active`, {
        method: 'PATCH',
      });
      showToast(res.message, 'info');
      loadProducts();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await apiRequest(`/admin/products/${id}`, { method: 'DELETE' });
      showToast(res.message, 'info');
      loadProducts();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <AdminShell
      title={`Catalog Products (${products.length})`}
      subtitle="Create, edit, activate/deactivate products, variants, and Cloudinary media."
      actionButton={
        <Link
          to="/admin/products/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Product</span>
        </Link>
      }
    >
      <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading catalog...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-zinc-500">
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">SKU &amp; Category</th>
                  <th className="py-3.5 px-4 text-right">Selling Price</th>
                  <th className="py-3.5 px-4 text-right">Stock</th>
                  <th className="py-3.5 px-4">State</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 rounded-lg overflow-hidden bg-zinc-100 shrink-0">
                          <ResilientImage
                            src={p.images[0]?.url || ''}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900">{p.name}</p>
                          <p className="text-zinc-500">
                            {p.brand} · {p.variants.length} Variants
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-zinc-800">{p.sku}</p>
                      <p className="text-zinc-500">{p.category}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold">
                      {formatINR(p.price)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">{p.stock}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={
                          p.isActive
                            ? 'text-emerald-700 font-semibold'
                            : 'text-zinc-400 font-medium'
                        }
                      >
                        {p.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          to={`/admin/products/${p.id}/edit`}
                          className="p-1.5 text-zinc-600 hover:text-zinc-900"
                          title="Edit Product"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p.id)}
                          className="p-1.5 text-zinc-600 hover:text-zinc-900"
                          title={p.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {p.isActive ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-red-600 hover:text-red-800"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
};

// 4. Admin Product Form Page (Create & Edit with Cloudinary Media Upload & Multi-Variants)
export const AdminProductFormPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useStore();

  const [form, setForm] = useState({
    name: '',
    shortDescription: '',
    description: '',
    category: 'acoustics-audio',
    subcategory: 'over-ear-headphones',
    brand: 'Krono Acoustics',
    sku: 'KRN-NEW-01',
    price: 29900,
    originalPrice: 34900,
    stock: 15,
    isFeatured: true,
    isTrending: false,
    isNewArrival: true,
    isDeal: false,
  });

  const [images, setImages] = useState<Array<{ url: string; publicId: string; isMain: boolean }>>([
    {
      url: '/src/assets/images/product_wireless_headphones_1791206501259.jpg',
      publicId: 'krono/default_studio',
      isMain: true,
    },
  ]);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [variants, setVariants] = useState([
    {
      id: 'var_1',
      sku: 'KRN-NEW-01-OBS',
      color: 'Obsidian Matte Black',
      size: 'Standard',
      capacity: '',
      price: 29900,
      originalPrice: 34900,
      stock: 15,
    },
  ]);

  const [specifications, setSpecifications] = useState([
    { label: 'Chassis Material', value: 'CNC 6061 Anodized Aluminum' },
    { label: 'Warranty', value: '3 Years International Warranty' },
  ]);

  useEffect(() => {
    if (isEditing && id) {
      apiRequest('/admin/products').then((res) => {
        const found = (res.data.products || []).find((p: Product) => p.id === id);
        if (found) {
          setForm({
            name: found.name,
            shortDescription: found.shortDescription,
            description: found.description,
            category: found.category,
            subcategory: found.subcategory,
            brand: found.brand,
            sku: found.sku,
            price: found.price,
            originalPrice: found.originalPrice,
            stock: found.stock,
            isFeatured: found.isFeatured,
            isTrending: found.isTrending,
            isNewArrival: found.isNewArrival,
            isDeal: found.isDeal,
          });
          setImages(found.images || []);
          setVariants(found.variants || []);
          setSpecifications(found.specifications || []);
        }
      });
    }
  }, [isEditing, id]);

  const handleCloudinaryUpload = async () => {
    if (!newMediaUrl.trim()) return;
    setUploadingMedia(true);
    try {
      const res = await apiRequest('/admin/media/upload', {
        method: 'POST',
        body: JSON.stringify({ fileUrl: newMediaUrl.trim() }),
      });
      setImages((prev) => [
        ...prev,
        {
          url: res.data.media.url,
          publicId: res.data.media.publicId,
          isMain: prev.length === 0,
        },
      ]);
      setNewMediaUrl('');
      showToast('Uploaded to Cloudinary and linked to product gallery.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        images,
        variants,
        specifications,
      };
      if (isEditing && id) {
        await apiRequest(`/admin/products/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast('Product updated.', 'success');
      } else {
        await apiRequest('/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Product created.', 'success');
      }
      navigate('/admin/products');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <AdminShell
      title={isEditing ? 'Edit Product & Variants' : 'Create New Catalog Product'}
      subtitle="Manage pricing, SKU variants, technical specifications, and Cloudinary media."
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Product Title
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Brand / Division
            </label>
            <input
              type="text"
              required
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Primary SKU
            </label>
            <input
              type="text"
              required
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Category Slug
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            >
              <option value="acoustics-audio">Acoustics &amp; Audio</option>
              <option value="tactile-computing">Tactile Computing</option>
              <option value="horology-timepieces">Horology &amp; Timepieces</option>
              <option value="architectural-lighting">Architectural Lighting</option>
              <option value="culinary-espresso">Culinary &amp; Espresso</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1">
                Selling Price (₹)
              </label>
              <input
                type="number"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1">
                Original MRP (₹)
              </label>
              <input
                type="number"
                required
                value={form.originalPrice}
                onChange={(e) =>
                  setForm({ ...form, originalPrice: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Detailed Engineering Description
            </label>
            <textarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>
        </div>

        {/* Cloudinary Media Uploader */}
        <div className="space-y-3 pt-4 border-t border-zinc-100">
          <h3 className="text-xs font-semibold text-zinc-900">
            Cloudinary Product Gallery ({images.length})
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newMediaUrl}
              onChange={(e) => setNewMediaUrl(e.target.value)}
              placeholder="Paste studio image URL or data URI to upload to Cloudinary..."
              className="flex-1 px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
            <button
              type="button"
              disabled={uploadingMedia}
              onClick={handleCloudinaryUpload}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-lg"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingMedia ? 'Uploading...' : 'Upload to Cloudinary'}</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative w-24 h-20 rounded-lg overflow-hidden border border-zinc-200"
              >
                <ResilientImage
                  src={img.url}
                  alt="Gallery item"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setImages((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Variants Manager */}
        <div className="space-y-3 pt-4 border-t border-zinc-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-900">
              Configurable SKU Variants ({variants.length})
            </h3>
            <button
              type="button"
              onClick={() =>
                setVariants((prev) => [
                  ...prev,
                  {
                    id: `var_${Date.now()}`,
                    sku: `${form.sku}-V${prev.length + 1}`,
                    color: 'Brushed Silver',
                    size: 'Standard',
                    capacity: '',
                    price: form.price,
                    originalPrice: form.originalPrice,
                    stock: 10,
                  },
                ])
              }
              className="text-xs font-semibold text-zinc-900 hover:underline"
            >
              + Add Variant Row
            </button>
          </div>

          {variants.map((v, idx) => (
            <div
              key={idx}
              className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-zinc-50 rounded-xl text-xs"
            >
              <input
                type="text"
                placeholder="Variant SKU"
                value={v.sku}
                onChange={(e) => {
                  const copy = [...variants];
                  copy[idx].sku = e.target.value;
                  setVariants(copy);
                }}
                className="px-2.5 py-1.5 font-mono bg-white border border-zinc-200 rounded"
              />
              <input
                type="text"
                placeholder="Color / Finish"
                value={v.color}
                onChange={(e) => {
                  const copy = [...variants];
                  copy[idx].color = e.target.value;
                  setVariants(copy);
                }}
                className="px-2.5 py-1.5 bg-white border border-zinc-200 rounded"
              />
              <input
                type="text"
                placeholder="Size / Profile"
                value={v.size}
                onChange={(e) => {
                  const copy = [...variants];
                  copy[idx].size = e.target.value;
                  setVariants(copy);
                }}
                className="px-2.5 py-1.5 bg-white border border-zinc-200 rounded"
              />
              <input
                type="number"
                placeholder="Price (₹)"
                value={v.price}
                onChange={(e) => {
                  const copy = [...variants];
                  copy[idx].price = Number(e.target.value);
                  setVariants(copy);
                }}
                className="px-2.5 py-1.5 font-mono bg-white border border-zinc-200 rounded"
              />
              <input
                type="number"
                placeholder="Stock"
                value={v.stock}
                onChange={(e) => {
                  const copy = [...variants];
                  copy[idx].stock = Number(e.target.value);
                  setVariants(copy);
                }}
                className="px-2.5 py-1.5 font-mono bg-white border border-zinc-200 rounded"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
          <Link
            to="/admin/products"
            className="px-4 py-2.5 text-xs font-medium bg-zinc-100 text-zinc-700 rounded-lg"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="px-6 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            {isEditing ? 'Save Product Updates' : 'Publish Product'}
          </button>
        </div>
      </form>
    </AdminShell>
  );
};

// 5. Admin Orders List & Order Status Management Page
export const AdminOrdersPage: React.FC = () => {
  const { showToast } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      const res = await apiRequest(
        `/admin/orders${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''}`
      );
      setOrders(res.data.orders || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleStatusUpdate = async (orderId: string, orderStatus: string) => {
    try {
      const res = await apiRequest(`/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          orderStatus,
          note: `Status transitioned to ${orderStatus} via Admin Console.`,
        }),
      });
      showToast(res.message, 'success');
      loadOrders();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const ALL_STATUSES: OrderStatus[] = [
    'Pending',
    'Confirmed',
    'Processing',
    'Shipped',
    'Out for Delivery',
    'Delivered',
    'Cancelled',
    'Return Requested',
    'Returned',
    'Refund Initiated',
    'Refunded',
  ];

  return (
    <AdminShell
      title={`Order Fulfillment (${orders.length})`}
      subtitle="Update shipment statuses, process return requests, and trigger gateway refunds."
      actionButton={
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      }
    >
      <div className="space-y-4">
        {orders.map((o) => (
          <div
            key={o.id}
            className="bg-white border border-zinc-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link
                  to={`/orders/${o.id}`}
                  className="font-mono font-bold text-sm text-zinc-900 hover:underline"
                >
                  {o.orderNumber}
                </Link>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-zinc-800">{o.customerName}</span>
                <span aria-hidden="true">·</span>
                <span className="text-zinc-500">{o.customerEmail}</span>
              </div>
              <p className="text-zinc-500">
                {o.items.length} item(s) · {o.paymentMethod} ({o.paymentStatus}) · Total:{' '}
                <span className="font-mono font-bold text-zinc-900">
                  {formatINR(o.pricing.finalTotal)}
                </span>
              </p>
              {o.returnRequest.isRequested && (
                <p className="text-amber-800 font-semibold">
                  Customer {o.returnRequest.type} Request: {o.returnRequest.reason} —{' '}
                  {o.returnRequest.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <select
                value={o.orderStatus}
                onChange={(e) => handleStatusUpdate(o.id, e.target.value)}
                className="px-3 py-2 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg"
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <Link
                to={`/orders/${o.id}`}
                className="px-3.5 py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg whitespace-nowrap"
              >
                Inspect
              </Link>
            </div>
          </div>
        ))}
      </div>
    </AdminShell>
  );
};

// 6. Admin Customers Management Page
export const AdminCustomersPage: React.FC = () => {
  const { showToast } = useStore();
  const [customers, setCustomers] = useState<any[]>([]);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/customers');
      setCustomers(res.data.customers || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const toggleStatus = async (id: string) => {
    try {
      const res = await apiRequest(`/admin/customers/${id}/toggle-status`, {
        method: 'PATCH',
      });
      showToast(res.message, 'info');
      loadCustomers();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <AdminShell
      title={`Registered Customers (${customers.length})`}
      subtitle="View customer lifetime value, order counts, and manage active/suspended states."
    >
      <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-zinc-500">
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Phone</th>
              <th className="py-3.5 px-4 text-right">Orders</th>
              <th className="py-3.5 px-4 text-right">Total Spend</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {customers.map((c) => (
              <tr key={c.id}>
                <td className="py-3.5 px-4">
                  <p className="font-semibold text-zinc-900">{c.name}</p>
                  <p className="text-zinc-500">{c.email}</p>
                </td>
                <td className="py-3.5 px-4 font-mono">{c.phone}</td>
                <td className="py-3.5 px-4 text-right font-mono">{c.ordersCount}</td>
                <td className="py-3.5 px-4 text-right font-mono font-semibold">
                  {formatINR(c.totalSpent)}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={
                      c.isActive
                        ? 'text-emerald-700 font-semibold'
                        : 'text-red-600 font-semibold'
                    }
                  >
                    {c.isActive ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleStatus(c.id)}
                    className="px-3 py-1.5 text-xs font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50"
                  >
                    {c.isActive ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
};

// 7. Admin Coupons Management Page
export const AdminCouponsPage: React.FC = () => {
  const { showToast } = useStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    minPurchaseAmount: 10000,
    maxDiscountAmount: 4000,
    usageLimit: 100,
  });

  const loadCoupons = useCallback(async () => {
    try {
      const res = await apiRequest('/admin/coupons');
      setCoupons(res.data.coupons || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      showToast(res.message, 'success');
      setForm({ ...form, code: '', description: '' });
      loadCoupons();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await apiRequest(`/admin/coupons/${id}/toggle`, { method: 'PATCH' });
      showToast(res.message, 'info');
      loadCoupons();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <AdminShell
      title="Privilege Coupons Management"
      subtitle="Configure discount rules, minimum purchase thresholds, and usage caps."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-3">
          {coupons.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-zinc-200/80 rounded-xl p-4 flex items-center justify-between gap-4 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-zinc-900">
                    {c.code}
                  </span>
                  <span className="text-zinc-500">
                    ({c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : formatINR(c.discountValue)})
                  </span>
                </div>
                <p className="text-zinc-600 mt-0.5">{c.description}</p>
                <p className="text-[11px] font-mono text-zinc-400 mt-1">
                  Min Order: {formatINR(c.minPurchaseAmount)} · Used: {c.usedCount}/
                  {c.usageLimit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(c.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold ${
                  c.isActive
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-zinc-100 text-zinc-500'
                }`}
              >
                {c.isActive ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleCreate}
          className="lg:col-span-5 bg-white border border-zinc-200/80 rounded-2xl p-5 space-y-3 text-xs"
        >
          <h3 className="text-sm font-semibold text-zinc-900">Create New Coupon</h3>
          <input
            type="text"
            required
            placeholder="Code (e.g. STUDIO20)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 font-mono uppercase bg-zinc-50 border border-zinc-200 rounded-lg"
          />
          <input
            type="text"
            required
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value })}
              className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg"
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Flat Rupee (₹)</option>
            </select>
            <input
              type="number"
              required
              placeholder="Discount Value"
              value={form.discountValue}
              onChange={(e) =>
                setForm({ ...form, discountValue: Number(e.target.value) })
              }
              className="px-3 py-2 font-mono bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min Purchase (₹)"
              value={form.minPurchaseAmount}
              onChange={(e) =>
                setForm({ ...form, minPurchaseAmount: Number(e.target.value) })
              }
              className="px-3 py-2 font-mono bg-zinc-50 border border-zinc-200 rounded-lg"
            />
            <input
              type="number"
              placeholder="Max Cap (₹)"
              value={form.maxDiscountAmount}
              onChange={(e) =>
                setForm({ ...form, maxDiscountAmount: Number(e.target.value) })
              }
              className="px-3 py-2 font-mono bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            Create Coupon
          </button>
        </form>
      </div>
    </AdminShell>
  );
};

// 8. Admin Reviews Moderation & Specialist Q&A Pages
export const AdminReviewsPage: React.FC = () => {
  const { showToast } = useStore();
  const [reviews, setReviews] = useState<Review[]>([]);

  const loadReviews = useCallback(async () => {
    const res = await apiRequest('/admin/reviews');
    setReviews(res.data.reviews || []);
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleModerate = async (id: string) => {
    try {
      const res = await apiRequest(`/admin/reviews/${id}/moderate`, { method: 'PATCH' });
      showToast(res.message, 'info');
      loadReviews();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <AdminShell
      title={`Customer Reviews Moderation (${reviews.length})`}
      subtitle="Inspect verified purchase reviews and moderate storefront visibility."
    >
      <div className="space-y-3">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="bg-white border border-zinc-200/80 rounded-xl p-5 flex items-start justify-between gap-4 text-xs"
          >
            <div className="space-y-1">
              <p className="font-semibold text-zinc-900">
                {r.title} ({r.rating} ★) — <span className="text-zinc-500">{r.productName}</span>
              </p>
              <p className="text-zinc-600">{r.comment}</p>
              <p className="text-[11px] text-zinc-400">
                By {r.userName} ·{' '}
                {r.verifiedPurchase ? 'Verified Purchase' : 'Standard Review'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleModerate(r.id)}
              className="px-3 py-1.5 font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 shrink-0"
            >
              {r.isModerated ? 'Restore to Public' : 'Hide Review'}
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
};

export const AdminQuestionsPage: React.FC = () => {
  const { showToast } = useStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answersMap, setAnswersMap] = useState<Record<string, string>>({});

  const loadQuestions = useCallback(async () => {
    const res = await apiRequest('/admin/questions');
    setQuestions(res.data.questions || []);
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handlePublishAnswer = async (id: string) => {
    const answerText = answersMap[id];
    if (!answerText?.trim()) return;
    try {
      const res = await apiRequest(`/admin/questions/${id}/answer`, {
        method: 'POST',
        body: JSON.stringify({ answer: answerText }),
      });
      showToast(res.message, 'success');
      loadQuestions();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <AdminShell
      title={`Technical Q&A Queue (${questions.length})`}
      subtitle="Answer customer pre-purchase questions across the product catalog."
    >
      <div className="space-y-4">
        {questions.map((q) => (
          <div
            key={q.id}
            className="bg-white border border-zinc-200/80 rounded-xl p-5 space-y-3 text-xs"
          >
            <div>
              <p className="text-zinc-500">{q.productName}</p>
              <p className="font-semibold text-zinc-900 text-sm mt-0.5">
                Q: {q.question}
              </p>
              <p className="text-[11px] text-zinc-400">Asked by {q.userName}</p>
            </div>

            {q.answer ? (
              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                <p className="text-zinc-800">
                  <span className="font-semibold">Published Answer:</span> {q.answer}
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Write specialist engineering response..."
                  value={answersMap[q.id] || ''}
                  onChange={(e) =>
                    setAnswersMap({ ...answersMap, [q.id]: e.target.value })
                  }
                  className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handlePublishAnswer(q.id)}
                  className="px-4 py-2 font-semibold bg-zinc-900 text-white rounded-lg whitespace-nowrap"
                >
                  Publish Answer
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminShell>
  );
};
