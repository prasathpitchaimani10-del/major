import { AppError } from '../utils/apiResponse';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export const validateRegistrationInput = (body: Record<string, unknown>): void => {
  const errors: string[] = [];
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const password = String(body.password || '');
  const confirmPassword = String(body.confirmPassword || '');

  if (name.length < 2) errors.push('Full name must be at least 2 characters.');
  if (!EMAIL_REGEX.test(email)) errors.push('Please provide a valid email address.');
  if (phone.replace(/\D/g, '').length < 10) errors.push('Phone number must contain at least 10 digits.');
  if (password.length < 8) errors.push('Password must be at least 8 characters long.');
  if (confirmPassword && password !== confirmPassword) {
    errors.push('Passwords do not match.');
  }

  if (errors.length > 0) {
    throw new AppError(errors[0], 400, errors);
  }
};

export const validateAddressInput = (body: Record<string, unknown>): void => {
  const errors: string[] = [];
  const requiredFields = [
    ['name', 'Recipient name'],
    ['phone', 'Phone number'],
    ['houseFlat', 'House / Flat number'],
    ['street', 'Street'],
    ['area', 'Area / Locality'],
    ['city', 'City'],
    ['state', 'State'],
    ['pincode', 'Pincode'],
  ] as const;

  for (const [key, label] of requiredFields) {
    if (!String(body[key] || '').trim()) {
      errors.push(`${label} is required.`);
    }
  }

  const pincode = String(body.pincode || '').trim();
  if (pincode && !PINCODE_REGEX.test(pincode)) {
    errors.push('Pincode must be a valid 6-digit postal code.');
  }

  if (errors.length > 0) {
    throw new AppError(errors[0], 400, errors);
  }
};

export const validateSavedPaymentInput = (body: Record<string, unknown>): void => {
  // Strictly forbid storing raw card numbers (13-19 digits) or CVV
  if (body.cardNumber || body.cvv || body.cvc) {
    throw new AppError(
      'Security Policy Violation: Raw card numbers and CVV codes must never be transmitted for storage. Provide only tokenized payment references or last-4 display digits.',
      400
    );
  }

  const type = String(body.type || '');
  if (!['Card', 'UPI', 'Wallet', 'NetBanking'].includes(type)) {
    throw new AppError('Invalid payment method type.', 400);
  }
};
