import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbStore } from '../models/store';
import { UserDoc, AddressDoc, SavedPaymentMethodDoc } from '../models/types';
import { AuthRequest, signAuthToken } from '../middleware/auth';
import { sendSuccess, sendError, AppError } from '../utils/apiResponse';
import {
  validateRegistrationInput,
  validateAddressInput,
  validateSavedPaymentInput,
} from '../validators/requestValidators';

const sanitizeUser = (user: UserDoc) => {
  const {
    passwordHash: _ph,
    otpCode: _otp,
    otpExpiresAt: _otpExp,
    resetToken: _rt,
    resetExpiresAt: _rtExp,
    ...safeUser
  } = user;
  return safeUser;
};

// Track OTP resend timestamps to prevent abuse
const otpRateLimiterMap = new Map<string, number>();

export const registerUser = async (req: Request, res: Response) => {
  validateRegistrationInput(req.body);

  const name = String(req.body.name).trim();
  const email = String(req.body.email).trim().toLowerCase();
  const phone = String(req.body.phone).trim();
  const password = String(req.body.password);

  const existing = dbStore.users.find((u) => u.email.toLowerCase() === email);
  if (existing) {
    return sendError(res, 'An account with this email address already exists.', ['Duplicate email'], 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const newUser: UserDoc = {
    id: `usr_${Date.now()}`,
    name,
    email,
    phone,
    passwordHash,
    role: 'customer',
    isVerified: false,
    isActive: true,
    otpCode,
    otpExpiresAt,
    resetToken: null,
    resetExpiresAt: null,
    avatarUrl: '',
    addresses: [],
    savedPaymentMethods: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  dbStore.users.push(newUser);
  dbStore.carts.push({
    userId: newUser.id,
    items: [],
    appliedCouponCode: null,
    updatedAt: new Date().toISOString(),
  });
  dbStore.wishlists.push({
    userId: newUser.id,
    productIds: [],
    updatedAt: new Date().toISOString(),
  });

  dbStore.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: newUser.id,
    type: 'Account',
    title: 'Welcome to Krono & Co.',
    message: `Your account has been registered. Verification code: ${otpCode}.`,
    isRead: false,
    link: '/verify',
    createdAt: new Date().toISOString(),
  });

  const token = signAuthToken({
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
    name: newUser.name,
  });

  return sendSuccess(
    res,
    'Account registered successfully. Please verify your email using the 6-digit OTP.',
    {
      token,
      user: sanitizeUser(newUser),
      verificationDispatch: {
        email: newUser.email,
        expiresAt: otpExpiresAt,
        sandboxOtpPreview: otpCode, // Exposed for testing in development sandbox
      },
    },
    201
  );
};

export const loginUser = async (req: Request, res: Response) => {
  const identifier = String(req.body.identifier || req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!identifier || !password) {
    return sendError(res, 'Email/Phone and password are required.', [], 400);
  }

  const user = dbStore.users.find(
    (u) =>
      u.email.toLowerCase() === identifier ||
      u.phone.replace(/\s+/g, '') === identifier.replace(/\s+/g, '')
  );

  if (!user) {
    return sendError(res, 'Invalid credentials. No account matches that email or phone.', [], 401);
  }

  if (!user.isActive) {
    return sendError(res, 'Your account has been suspended. Please contact support.', [], 403);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return sendError(res, 'Invalid password. Please check your credentials and try again.', [], 401);
  }

  const token = signAuthToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  return sendSuccess(res, 'Signed in successfully.', {
    token,
    user: sanitizeUser(user),
  });
};

export const verifyOtp = (req: Request, res: Response) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const otp = String(req.body.otp || '').trim();

  if (!email || !otp) {
    return sendError(res, 'Email and 6-digit OTP code are required.', [], 400);
  }

  const user = dbStore.users.find((u) => u.email.toLowerCase() === email);
  if (!user) {
    return sendError(res, 'Account not found.', [], 404);
  }

  if (user.isVerified) {
    return sendSuccess(res, 'Account is already verified.', { user: sanitizeUser(user) });
  }

  if (!user.otpCode || !user.otpExpiresAt) {
    return sendError(res, 'No active OTP found. Please request a new OTP.', [], 400);
  }

  if (new Date(user.otpExpiresAt).getTime() < Date.now()) {
    return sendError(res, 'Your OTP has expired. Please request a new code.', [], 400);
  }

  if (user.otpCode !== otp) {
    return sendError(res, 'Invalid OTP code entered.', [], 400);
  }

  user.isVerified = true;
  user.otpCode = null;
  user.otpExpiresAt = null;
  user.updatedAt = new Date().toISOString();

  return sendSuccess(res, 'Email verified successfully.', {
    user: sanitizeUser(user),
  });
};

export const resendOtp = (req: Request, res: Response) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) {
    return sendError(res, 'Email address is required.', [], 400);
  }

  const lastSent = otpRateLimiterMap.get(email) || 0;
  if (Date.now() - lastSent < 15000) {
    return sendError(
      res,
      'Please wait at least 15 seconds before requesting another OTP.',
      [],
      429
    );
  }

  const user = dbStore.users.find((u) => u.email.toLowerCase() === email);
  if (!user) {
    return sendError(res, 'No account found with that email address.', [], 404);
  }

  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  user.otpCode = otpCode;
  user.otpExpiresAt = otpExpiresAt;
  otpRateLimiterMap.set(email, Date.now());

  return sendSuccess(res, 'A fresh 6-digit verification code has been dispatched.', {
    email: user.email,
    expiresAt: otpExpiresAt,
    sandboxOtpPreview: otpCode,
  });
};

export const forgotPassword = (req: Request, res: Response) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) {
    return sendError(res, 'Please enter your registered email address.', [], 400);
  }

  const user = dbStore.users.find((u) => u.email.toLowerCase() === email);
  if (!user) {
    return sendError(res, 'No user found with that email address.', [], 404);
  }

  const resetToken = String(Math.floor(100000 + Math.random() * 900000));
  const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  user.resetToken = resetToken;
  user.resetExpiresAt = resetExpiresAt;

  return sendSuccess(res, 'Password reset token generated and sent to your email.', {
    email: user.email,
    expiresAt: resetExpiresAt,
    sandboxResetTokenPreview: resetToken,
  });
};

export const resetPassword = async (req: Request, res: Response) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const token = String(req.body.token || '').trim();
  const newPassword = String(req.body.newPassword || '');

  if (!email || !token || !newPassword) {
    return sendError(res, 'Email, reset code, and new password are required.', [], 400);
  }

  if (newPassword.length < 8) {
    return sendError(res, 'New password must be at least 8 characters long.', [], 400);
  }

  const user = dbStore.users.find((u) => u.email.toLowerCase() === email);
  if (!user || !user.resetToken || !user.resetExpiresAt) {
    return sendError(res, 'Invalid password reset request.', [], 400);
  }

  if (new Date(user.resetExpiresAt).getTime() < Date.now()) {
    return sendError(res, 'Password reset code has expired. Please request a new one.', [], 400);
  }

  if (user.resetToken !== token) {
    return sendError(res, 'Invalid password reset code.', [], 400);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetToken = null;
  user.resetExpiresAt = null;
  user.updatedAt = new Date().toISOString();

  return sendSuccess(res, 'Password has been reset successfully. You can now sign in.');
};

export const getCurrentProfile = (req: AuthRequest, res: Response) => {
  const user = dbStore.users.find((u) => u.id === req.user?.id);
  if (!user) {
    return sendError(res, 'User not found.', [], 404);
  }
  return sendSuccess(res, 'Profile retrieved.', { user: sanitizeUser(user) });
};

export const updateProfile = (req: AuthRequest, res: Response) => {
  const user = dbStore.users.find((u) => u.id === req.user?.id);
  if (!user) {
    return sendError(res, 'User not found.', [], 404);
  }

  const name = req.body.name ? String(req.body.name).trim() : user.name;
  const phone = req.body.phone ? String(req.body.phone).trim() : user.phone;
  const avatarUrl =
    req.body.avatarUrl !== undefined ? String(req.body.avatarUrl).trim() : user.avatarUrl;

  if (name.length < 2) {
    return sendError(res, 'Name must be at least 2 characters.', [], 400);
  }

  user.name = name;
  user.phone = phone;
  user.avatarUrl = avatarUrl;
  user.updatedAt = new Date().toISOString();

  return sendSuccess(res, 'Profile updated successfully.', { user: sanitizeUser(user) });
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  const user = dbStore.users.find((u) => u.id === req.user?.id);
  if (!user) {
    return sendError(res, 'User not found.', [], 404);
  }

  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');

  if (!currentPassword || !newPassword) {
    return sendError(res, 'Current password and new password are required.', [], 400);
  }

  if (newPassword.length < 8) {
    return sendError(res, 'New password must be at least 8 characters long.', [], 400);
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    return sendError(res, 'Current password is incorrect.', [], 400);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.updatedAt = new Date().toISOString();

  return sendSuccess(res, 'Password changed successfully.');
};

// Address CRUD
export const addAddress = (req: AuthRequest, res: Response) => {
  validateAddressInput(req.body);
  const user = dbStore.users.find((u) => u.id === req.user?.id);
  if (!user) return sendError(res, 'User not found.', [], 404);

  const isDefault = Boolean(req.body.isDefault) || user.addresses.length === 0;
  if (isDefault) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  const newAddress: AddressDoc = {
    id: `addr_${Date.now()}`,
    name: String(req.body.name).trim(),
    phone: String(req.body.phone).trim(),
    houseFlat: String(req.body.houseFlat).trim(),
    street: String(req.body.street).trim(),
    area: String(req.body.area).trim(),
    city: String(req.body.city).trim(),
    state: String(req.body.state).trim(),
    pincode: String(req.body.pincode).trim(),
    addressType: ['Home', 'Work', 'Other'].includes(req.body.addressType)
      ? req.body.addressType
      : 'Home',
    isDefault,
  };

  user.addresses.push(newAddress);
  user.updatedAt = new Date().toISOString();

  return sendSuccess(res, 'Delivery address added.', {
    addresses: user.addresses,
    address: newAddress,
  }, 201);
};

export const updateAddress = (req: AuthRequest, res: Response) => {
  validateAddressInput(req.body);
  const user = dbStore.users.find((u) => u.id === req.user?.id);
  if (!user) return sendError(res, 'User not found.', [], 404);

  const addrIndex = user.addresses.findIndex((a) => a.id === req.params.id);
  if (addrIndex === -1) return sendError(res, 'Address not found.', [], 404);

  const isDefault = Boolean(req.body.isDefault);
  if (isDefault) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  user.addresses[addrIndex] = {
    ...user.addresses[addrIndex],
    name: String(req.body.name).trim(),
    phone: String(req.body.phone).trim(),
    houseFlat: String(req.body.houseFlat).trim(),
    street: String(req.body.street).trim(),
    area: String(req.body.area).trim(),
    city: String(req.body.city).trim(),
    state: String(req.body.state).trim(),
    pincode: String(req.body.pincode).trim(),
    addressType: ['Home', 'Work', 'Other'].includes(req.body.addressType)
      ? req.body.addressType
      : 'Home',
    isDefault: isDefault || user.addresses.length === 1,
  };

  return sendSuccess(res, 'Delivery address updated.', {
    addresses: user.addresses,
  });
};

export const deleteAddress = (req: AuthRequest, res: Response) => {
  const user = dbStore.users.find((u) => u.id === req.user?.id);
  if (!user) return sendError(res, 'User not found.', [], 404);

  const target = user.addresses.find((a) => a.id === req.params.id);
  if (!target) return sendError(res, 'Address not found.', [], 404);

  user.addresses = user.addresses.filter((a) => a.id !== req.params.id);
  if (target.isDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  return sendSuccess(res, 'Address removed.', { addresses: user.addresses });
};

export const setDefaultAddress = (req: AuthRequest, res: Response) => {
  const user = dbStore.users.find((u) => u.id === req.user?.id);
  if (!user) return sendError(res, 'User not found.', [], 404);

  const target = user.addresses.find((a) => a.id === req.params.id);
  if (!target) return sendError(res, 'Address not found.', [], 404);

  user.addresses.forEach((a) => {
    a.isDefault = a.id === req.params.id;
  });

  return sendSuccess(res, 'Default delivery address updated.', {
    addresses: user.addresses,
  });
};

// Saved Payment Methods (Tokenized references only — never raw PAN or CVV)
export const addSavedPaymentMethod = (req: AuthRequest, res: Response) => {
  validateSavedPaymentInput(req.body);
  const user = dbStore.users.find((u) => u.id === req.user?.id);
  if (!user) return sendError(res, 'User not found.', [], 404);

  const type = req.body.type as SavedPaymentMethodDoc['type'];
  const last4 = String(req.body.last4 || '').replace(/\D/g, '').slice(-4);
  const brand = String(req.body.brand || 'Visa').trim();
  const expiryMonth = String(req.body.expiryMonth || '12').trim();
  const expiryYear = String(req.body.expiryYear || '2029').trim();
  const upiVpa = String(req.body.upiVpa || '').trim();

  if (type === 'Card' && last4.length !== 4) {
    throw new AppError('Please provide the last 4 digits of the card for display.', 400);
  }
  if (type === 'UPI' && !upiVpa.includes('@')) {
    throw new AppError('Please provide a valid UPI ID (e.g., name@bank).', 400);
  }

  const isDefault = Boolean(req.body.isDefault) || user.savedPaymentMethods.length === 0;
  if (isDefault) {
    user.savedPaymentMethods.forEach((pm) => {
      pm.isDefault = false;
    });
  }

  const label =
    type === 'Card'
      ? `${brand} ending in ${last4}`
      : type === 'UPI'
      ? upiVpa
      : String(req.body.label || `${type} Account`);

  const newMethod: SavedPaymentMethodDoc = {
    id: `pm_${Date.now()}`,
    type,
    providerReference: `tok_sandbox_${Date.now()}`,
    label,
    brand: type === 'Card' ? brand : type,
    last4: type === 'Card' ? last4 : '',
    expiryMonth: type === 'Card' ? expiryMonth : '',
    expiryYear: type === 'Card' ? expiryYear : '',
    upiVpa: type === 'UPI' ? upiVpa : '',
    isDefault,
  };

  user.savedPaymentMethods.push(newMethod);
  return sendSuccess(
    res,
    'Payment method tokenized and saved.',
    { savedPaymentMethods: user.savedPaymentMethods },
    201
  );
};

export const deleteSavedPaymentMethod = (req: AuthRequest, res: Response) => {
  const user = dbStore.users.find((u) => u.id === req.user?.id);
  if (!user) return sendError(res, 'User not found.', [], 404);

  user.savedPaymentMethods = user.savedPaymentMethods.filter(
    (pm) => pm.id !== req.params.id
  );
  if (
    user.savedPaymentMethods.length > 0 &&
    !user.savedPaymentMethods.some((pm) => pm.isDefault)
  ) {
    user.savedPaymentMethods[0].isDefault = true;
  }

  return sendSuccess(res, 'Saved payment method removed.', {
    savedPaymentMethods: user.savedPaymentMethods,
  });
};
