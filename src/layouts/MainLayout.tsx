import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Bell,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiRequest, formatINR } from '../services/api';
import { NotificationItem } from '../types';
import { ToastContainer, CompareFloatingBar } from '../components/CommonUI';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeCartItems, wishlistIds, logout } = useStore();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const totalBagCount = activeCartItems.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    const q = searchTerm.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest(`/products/suggestions?q=${encodeURIComponent(q)}`);
        setSuggestions(res.data.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const res = await apiRequest('/notifications');
      setNotifications(res.data.notifications || []);
    } catch {
      // Ignore
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setSearchOpen(false);
      navigate(`/products?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9F8] text-zinc-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#F9F9F8]/95 backdrop-blur-xs border-b border-zinc-200/80 no-print">
        <div className="max-w-[1360px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Single text element wordmark */}
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
          >
            Krono &amp; Co.
          </Link>

          {/* Zone 2: 5 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600">
            <NavLink
              to="/products"
              className={({ isActive }) =>
                `hover:text-zinc-900 transition-colors whitespace-nowrap ${
                  isActive ? 'text-zinc-900 underline underline-offset-8 decoration-2' : ''
                }`
              }
            >
              Catalog
            </NavLink>
            <NavLink
              to="/category/acoustics-audio"
              className={({ isActive }) =>
                `hover:text-zinc-900 transition-colors whitespace-nowrap ${
                  isActive ? 'text-zinc-900 underline underline-offset-8 decoration-2' : ''
                }`
              }
            >
              Acoustics
            </NavLink>
            <NavLink
              to="/category/tactile-computing"
              className={({ isActive }) =>
                `hover:text-zinc-900 transition-colors whitespace-nowrap ${
                  isActive ? 'text-zinc-900 underline underline-offset-8 decoration-2' : ''
                }`
              }
            >
              Computing
            </NavLink>
            <NavLink
              to="/category/horology-timepieces"
              className={({ isActive }) =>
                `hover:text-zinc-900 transition-colors whitespace-nowrap ${
                  isActive ? 'text-zinc-900 underline underline-offset-8 decoration-2' : ''
                }`
              }
            >
              Horology
            </NavLink>
            <NavLink
              to="/wishlist"
              className={({ isActive }) =>
                `hover:text-zinc-900 transition-colors whitespace-nowrap ${
                  isActive ? 'text-zinc-900 underline underline-offset-8 decoration-2' : ''
                }`
              }
            >
              Wishlist {wishlistIds.length > 0 ? `(${wishlistIds.length})` : ''}
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                className="text-amber-800 hover:text-amber-950 font-semibold transition-colors whitespace-nowrap hidden xl:inline-block"
              >
                Admin Console
              </NavLink>
            )}
          </nav>

          {/* Zone 3: Primary actions (Search & Bag/Account) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label="Search catalog"
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-900 rounded-lg border border-zinc-200/90 bg-white transition-colors whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
            </button>

            {user ? (
              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((prev) => !prev);
                    loadNotifications();
                  }}
                  aria-label="Notifications"
                  className="p-2 text-zinc-600 hover:text-zinc-900 rounded-lg border border-zinc-200/80 bg-white"
                >
                  <Bell className="w-4 h-4" />
                </button>
                <Link
                  to="/profile"
                  className="px-3 py-2 text-xs font-medium text-zinc-800 bg-white border border-zinc-200/90 rounded-lg hover:bg-zinc-50 transition-colors whitespace-nowrap max-w-[140px] truncate"
                >
                  {user.name.split(' ')[0]}
                </Link>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-2 text-xs font-medium text-zinc-800 bg-white border border-zinc-200/90 rounded-lg hover:bg-zinc-100 transition-colors whitespace-nowrap"
              >
                Sign In
              </Link>
            )}

            <Link
              to="/cart"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Bag ({totalBagCount})</span>
            </Link>
          </div>
        </div>

        {/* Expandable Search Bar with Live Autocomplete Suggestions */}
        {searchOpen && (
          <div className="border-t border-zinc-200 bg-white px-6 py-4 shadow-md">
            <div className="max-w-2xl mx-auto relative">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search headphones, mechanical keyboards, titanium chronographs, SKU..."
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 whitespace-nowrap"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>

              {suggestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-100 divide-y divide-zinc-100">
                  {suggestions.map((s) => (
                    <Link
                      key={s.id}
                      to={`/products/${s.slug}`}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchTerm('');
                      }}
                      className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-50 rounded-lg transition-colors"
                    >
                      <div>
                        <p className="text-xs font-semibold text-zinc-900">{s.name}</p>
                        <p className="text-[11px] text-zinc-500">
                          {s.brand} · {s.category}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-semibold text-zinc-900">
                        {formatINR(s.price)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notifications Slide-down */}
        {notifOpen && user && (
          <div className="absolute right-6 top-16 w-80 bg-white border border-zinc-200 rounded-xl shadow-xl p-4 z-50">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-100">
              <span className="text-xs font-semibold text-zinc-900">Notifications</span>
              <button
                type="button"
                onClick={() => setNotifOpen(false)}
                className="text-xs text-zinc-400 hover:text-zinc-700"
              >
                Close
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No notifications yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {notifications.slice(0, 6).map((n) => (
                  <Link
                    key={n.id}
                    to={n.link || '/orders'}
                    onClick={() => setNotifOpen(false)}
                    className="block p-2.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 transition-colors"
                  >
                    <p className="text-xs font-semibold text-zinc-900">{n.title}</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1">{children}</main>

      <CompareFloatingBar />
      <ToastContainer />

      {/* Clean Architectural Footer (Zero Fake Telemetry) */}
      <footer className="bg-zinc-900 text-zinc-400 border-t border-zinc-800 mt-20 no-print">
        <div className="max-w-[1360px] mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-3">
            <span className="font-display text-lg font-bold text-white tracking-tight">
              Krono &amp; Co.
            </span>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Precision acoustic instruments, CNC tactile computing, Grade-5 titanium
              horology, and architectural luminaires.
            </p>
            <p className="text-xs text-zinc-500">
              Maker Chambers VI, Nariman Point · Mumbai 400021
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white mb-3">Collections</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/category/acoustics-audio" className="hover:text-white transition-colors">
                  Acoustics &amp; Reference Audio
                </Link>
              </li>
              <li>
                <Link to="/category/tactile-computing" className="hover:text-white transition-colors">
                  Tactile Computing &amp; Keyboards
                </Link>
              </li>
              <li>
                <Link to="/category/horology-timepieces" className="hover:text-white transition-colors">
                  Horology &amp; Chronographs
                </Link>
              </li>
              <li>
                <Link to="/category/architectural-lighting" className="hover:text-white transition-colors">
                  Architectural Task Lighting
                </Link>
              </li>
              <li>
                <Link to="/category/culinary-espresso" className="hover:text-white transition-colors">
                  Manual Lever Espresso
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white mb-3">Customer Account</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/orders" className="hover:text-white transition-colors">
                  My Orders &amp; Tracking
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-white transition-colors">
                  Account Profile &amp; Security
                </Link>
              </li>
              <li>
                <Link to="/addresses" className="hover:text-white transition-colors">
                  Saved Delivery Addresses
                </Link>
              </li>
              <li>
                <Link to="/compare" className="hover:text-white transition-colors">
                  Specification Comparison
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white mb-3">Operations &amp; Access</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/admin" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin Management Portal</span>
                </Link>
              </li>
              {user && (
                <li>
                  <button
                    type="button"
                    onClick={logout}
                    className="hover:text-white transition-colors inline-flex items-center gap-1.5 text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out ({user.email})</span>
                  </button>
                </li>
              )}
              <li className="text-zinc-500 pt-2">
                18% GST Invoice issued on all orders · Pan-India Insured Air Dispatch
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-zinc-800/80 py-5 px-6 text-center text-xs text-zinc-500">
          © {new Date().getFullYear()} Krono &amp; Co. Retail Private Limited. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
