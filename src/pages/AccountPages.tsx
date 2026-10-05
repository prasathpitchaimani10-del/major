import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  MapPin,
  CreditCard,
  Trash2,
  CheckCircle2,
  KeyRound,
  User as UserIcon,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { useStore } from '../context/StoreContext';
import { EmptyState } from '../components/CommonUI';

// 1. Login Page (Customer & Quick Demo Fill)
export const LoginPage: React.FC = () => {
  const { loginWithToken, showToast } = useStore();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('aarav@example.com');
  const [password, setPassword] = useState('Customer@123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      loginWithToken(res.data.token, res.data.user);
      showToast(`Welcome back, ${res.data.user.name}!`, 'success');
      if (res.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-14">
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-8 space-y-6">
        <div>
          <p className="text-xs text-zinc-500">Customer &amp; Atelier Access</p>
          <h1 className="font-display text-2xl font-bold text-zinc-900 mt-1">
            Sign In to Krono &amp; Co.
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Email Address or Phone Number
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-800">Password</label>
              <Link
                to="/forgot-password"
                className="text-xs text-zinc-500 hover:text-zinc-900"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-xs font-semibold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Seeded Account Switchers for Portfolio Inspection */}
        <div className="pt-4 border-t border-zinc-100 space-y-2">
          <p className="text-[11px] text-zinc-500 font-medium">
            Seeded Verification Accounts:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setIdentifier('aarav@example.com');
                setPassword('Customer@123');
              }}
              className="px-3 py-2 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-left"
            >
              <span className="block font-semibold">Customer Demo</span>
              <span className="text-[10px] text-zinc-500">aarav@example.com</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIdentifier('admin@krono.co');
                setPassword('Admin@123');
              }}
              className="px-3 py-2 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-lg text-left"
            >
              <span className="block font-semibold">Admin Console</span>
              <span className="text-[10px] text-amber-700">admin@krono.co</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-center text-zinc-500 pt-2">
          New to Krono &amp; Co.?{' '}
          <Link to="/register" className="font-semibold text-zinc-900 hover:underline">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
};

// 2. Register Page
export const RegisterPage: React.FC = () => {
  const { loginWithToken, showToast } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      loginWithToken(res.data.token, res.data.user);
      showToast(res.message, 'success');
      navigate('/verify', {
        state: {
          email: form.email,
          sandboxOtp: res.data.verificationDispatch?.sandboxOtpPreview,
        },
      });
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-8 space-y-6">
        <div>
          <p className="text-xs text-zinc-500">Client Registration</p>
          <h1 className="font-display text-2xl font-bold text-zinc-900 mt-1">
            Create Your Account
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Aarav Mehta"
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Mobile Phone
            </label>
            <input
              type="text"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98450 00000"
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Password (Min. 8 characters)
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-xs font-semibold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800"
          >
            {loading ? 'Creating Account...' : 'Register & Send OTP'}
          </button>
        </form>

        <p className="text-xs text-center text-zinc-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-zinc-900 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

// 3. OTP Email Verification Page
export const VerifyOtpPage: React.FC = () => {
  const { user, refreshProfile, showToast } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const stateEmail = (location.state as any)?.email || user?.email || '';
  const initialSandboxOtp = (location.state as any)?.sandboxOtp || '';

  const [email, setEmail] = useState(stateEmail);
  const [otp, setOtp] = useState(initialSandboxOtp);
  const [sandboxPreview, setSandboxPreview] = useState(initialSandboxOtp);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });
      await refreshProfile();
      showToast(res.message, 'success');
      navigate('/profile');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const res = await apiRequest('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (res.data.sandboxOtpPreview) {
        setSandboxPreview(res.data.sandboxOtpPreview);
        setOtp(res.data.sandboxOtpPreview);
      }
      showToast(res.message, 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-14">
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900">
            Verify Your Email
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Enter the 6-digit verification code sent to your email address.
          </p>
        </div>

        {sandboxPreview && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            Sandbox Verification Code:{' '}
            <span className="font-mono font-bold">{sandboxPreview}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1">
              6-Digit OTP Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono tracking-widest bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-xs font-semibold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800"
          >
            {loading ? 'Verifying...' : 'Verify Account'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          className="w-full text-xs text-zinc-600 hover:text-zinc-900 font-medium"
        >
          Resend 6-Digit OTP (Rate-Limited)
        </button>
      </div>
    </div>
  );
};

// 4. Forgot & Reset Password Pages
export const ForgotPasswordPage: React.FC = () => {
  const { showToast } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('aarav@example.com');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      showToast(res.message, 'success');
      navigate('/reset-password', {
        state: {
          email,
          sandboxResetToken: res.data.sandboxResetTokenPreview,
        },
      });
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-14">
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900">
            Password Recovery
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Enter your account email to receive a time-limited 6-digit recovery token.
          </p>
        </div>
        <form onSubmit={handleRequestReset} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Registered Email"
            className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-xs font-semibold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800"
          >
            {loading ? 'Generating Token...' : 'Send Recovery Code'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const { showToast } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  const initialEmail = (location.state as any)?.email || '';
  const initialToken = (location.state as any)?.sandboxResetToken || '';

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, token, newPassword }),
      });
      showToast(res.message, 'success');
      navigate('/login');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-14">
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-8 space-y-6">
        <h1 className="font-display text-2xl font-bold text-zinc-900">
          Set New Password
        </h1>
        {initialToken && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            Sandbox Recovery Code:{' '}
            <span className="font-mono font-bold">{initialToken}</span>
          </div>
        )}
        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
          />
          <input
            type="text"
            required
            placeholder="6-Digit Reset Code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-3.5 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg"
          />
          <input
            type="password"
            required
            placeholder="New Password (Min. 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
          />
          <button
            type="submit"
            className="w-full py-3 text-xs font-semibold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800"
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};

// 5. Customer Profile, Password Change & Tokenized Saved Payment Methods Page
export const ProfilePage: React.FC = () => {
  const { user, refreshProfile, showToast } = useStore();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Tokenized payment method form (Never stores raw PAN or CVV)
  const [pmType, setPmType] = useState<'Card' | 'UPI'>('Card');
  const [pmBrand, setPmBrand] = useState('Visa');
  const [pmLast4, setPmLast4] = useState('');
  const [pmUpi, setPmUpi] = useState('');

  if (!user) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12">
        <EmptyState
          title="Sign In to Manage Your Account"
          description="View your profile, update security credentials, and manage addresses."
          actionLabel="Sign In"
          actionTo="/login"
        />
      </div>
    );
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, phone }),
      });
      await refreshProfile();
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/users/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddTokenizedMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/users/payment-methods', {
        method: 'POST',
        body: JSON.stringify({
          type: pmType,
          brand: pmBrand,
          last4: pmLast4,
          upiVpa: pmUpi,
        }),
      });
      setPmLast4('');
      setPmUpi('');
      await refreshProfile();
      showToast('Tokenized payment reference saved.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRemovePaymentMethod = async (id: string) => {
    try {
      await apiRequest(`/users/payment-methods/${id}`, { method: 'DELETE' });
      await refreshProfile();
      showToast('Saved payment method removed.', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10 space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-zinc-900">
            Account Profile &amp; Security
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {user.email} · Role: <span className="font-mono uppercase">{user.role}</span> ·{' '}
            {user.isVerified ? 'Verified Account' : 'Unverified Email'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/addresses"
            className="px-4 py-2 text-xs font-semibold bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50"
          >
            Manage Delivery Addresses ({user.addresses.length})
          </Link>
          <Link
            to="/orders"
            className="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            View My Orders
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Personal Info */}
        <form
          onSubmit={handleUpdateProfile}
          className="lg:col-span-6 bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <UserIcon className="w-4 h-4 text-zinc-900" />
            <h2 className="text-sm font-semibold text-zinc-900">Personal Details</h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Mobile Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            Save Profile Changes
          </button>
        </form>

        {/* Password Change */}
        <form
          onSubmit={handleChangePassword}
          className="lg:col-span-6 bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <KeyRound className="w-4 h-4 text-zinc-900" />
            <h2 className="text-sm font-semibold text-zinc-900">Change Password</h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              New Password (Min. 8 characters)
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            Update Password
          </button>
        </form>
      </div>

      {/* Saved Payment References Section */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-zinc-900" />
            <h2 className="text-sm font-semibold text-zinc-900">
              Tokenized Payment References (PCI-Safe)
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500">
            Raw card numbers and CVV codes are strictly rejected by the server.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {user.savedPaymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="p-4 rounded-xl border border-zinc-200 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-zinc-900">{pm.label}</p>
                  <p className="font-mono text-[11px] text-zinc-500">
                    Token: {pm.providerReference}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePaymentMethod(pm.id)}
                  className="text-zinc-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddTokenizedMethod} className="space-y-3 bg-zinc-50 p-4 rounded-xl">
            <h3 className="text-xs font-semibold text-zinc-900">
              Add Tokenized Display Reference
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={pmType}
                onChange={(e) => setPmType(e.target.value as any)}
                className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg"
              >
                <option value="Card">Card Reference</option>
                <option value="UPI">UPI VPA</option>
              </select>
              {pmType === 'Card' ? (
                <input
                  type="text"
                  maxLength={4}
                  required
                  placeholder="Last 4 Digits (e.g. 8812)"
                  value={pmLast4}
                  onChange={(e) => setPmLast4(e.target.value.replace(/\D/g, ''))}
                  className="px-3 py-2 text-xs font-mono bg-white border border-zinc-200 rounded-lg"
                />
              ) : (
                <input
                  type="text"
                  required
                  placeholder="name@okaxis"
                  value={pmUpi}
                  onChange={(e) => setPmUpi(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-lg"
                />
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-lg"
            >
              Save Tokenized Reference
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// 6. Delivery Addresses Management Page
export const AddressesPage: React.FC = () => {
  const { user, refreshProfile, showToast } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    houseFlat: '',
    street: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    addressType: 'Home',
    isDefault: false,
  });

  if (!user) {
    return (
      <div className="max-w-[1360px] mx-auto px-6 py-12">
        <EmptyState
          title="Sign In to Manage Addresses"
          description="Save multiple home and studio addresses for rapid checkout."
          actionLabel="Sign In"
          actionTo="/login"
        />
      </div>
    );
  }

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiRequest(`/users/addresses/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        showToast('Delivery address updated.', 'success');
      } else {
        await apiRequest('/users/addresses', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        showToast('Delivery address added.', 'success');
      }
      setEditingId(null);
      setForm({
        name: '',
        phone: '',
        houseFlat: '',
        street: '',
        area: '',
        city: '',
        state: '',
        pincode: '',
        addressType: 'Home',
        isDefault: false,
      });
      await refreshProfile();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/users/addresses/${id}`, { method: 'DELETE' });
      await refreshProfile();
      showToast('Address deleted.', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiRequest(`/users/addresses/${id}/default`, { method: 'PATCH' });
      await refreshProfile();
      showToast('Default address updated.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-10 space-y-8">
      <div className="border-b border-zinc-200 pb-5">
        <h1 className="font-display text-3xl font-bold text-zinc-900">
          Delivery Addresses ({user.addresses.length})
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Manage your shipping destinations across India.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          {user.addresses.map((a) => (
            <div
              key={a.id}
              className="bg-white border border-zinc-200/80 rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="font-semibold text-zinc-900 text-sm">{a.name}</span>
                  <span>
                    {a.addressType} {a.isDefault ? '· Default' : ''}
                  </span>
                </div>
                <p className="text-zinc-600">
                  {a.houseFlat}, {a.street}
                </p>
                <p className="text-zinc-600">
                  {a.area}, {a.city}, {a.state} —{' '}
                  <span className="font-mono">{a.pincode}</span>
                </p>
                <p className="text-zinc-500 pt-1">Phone: {a.phone}</p>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-zinc-100 text-xs">
                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(a.id)}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    Set Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(a.id);
                    setForm({
                      name: a.name,
                      phone: a.phone,
                      houseFlat: a.houseFlat,
                      street: a.street,
                      area: a.area,
                      city: a.city,
                      state: a.state,
                      pincode: a.pincode,
                      addressType: a.addressType,
                      isDefault: a.isDefault,
                    });
                  }}
                  className="text-zinc-600 hover:text-zinc-900"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  className="text-red-600 hover:text-red-800 ml-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSaveAddress}
          className="lg:col-span-5 bg-white border border-zinc-200/80 rounded-2xl p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-3">
            {editingId ? 'Edit Address' : 'Add New Delivery Address'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Recipient Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
            <input
              type="text"
              required
              placeholder="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
            <input
              type="text"
              required
              placeholder="House / Flat No."
              value={form.houseFlat}
              onChange={(e) => setForm({ ...form, houseFlat: e.target.value })}
              className="px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
            <input
              type="text"
              required
              placeholder="Street / Road"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
              className="px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
            <input
              type="text"
              required
              placeholder="Area / Locality"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              className="px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
            <input
              type="text"
              required
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
            <input
              type="text"
              required
              placeholder="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            />
            <input
              type="text"
              required
              maxLength={6}
              placeholder="6-Digit Pincode"
              value={form.pincode}
              onChange={(e) =>
                setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })
              }
              className="px-3 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg"
            />
          </div>
          <div className="flex items-center justify-between">
            <select
              value={form.addressType}
              onChange={(e) => setForm({ ...form, addressType: e.target.value })}
              className="px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg"
            >
              <option value="Home">Home</option>
              <option value="Work">Work / Studio</option>
              <option value="Other">Other</option>
            </select>
            <label className="inline-flex items-center gap-2 text-xs text-zinc-700">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
              <span>Set as default</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
            >
              {editingId ? 'Update Address' : 'Save Address'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-4 py-2.5 text-xs text-zinc-600 bg-zinc-100 rounded-lg"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
