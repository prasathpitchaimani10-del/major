import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbStore } from '../models/store';
import { sendError } from '../utils/apiResponse';

const JWT_SECRET = process.env.JWT_SECRET || 'krono_enterprise_jwt_secret_key_2026';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'customer' | 'admin';
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const signAuthToken = (payload: AuthenticatedUser): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
};

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication required. Please sign in to continue.', [], 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    const userInDb = dbStore.users.find((u) => u.id === decoded.id);

    if (!userInDb) {
      sendError(res, 'User account no longer exists.', [], 401);
      return;
    }

    if (!userInDb.isActive) {
      sendError(res, 'Your account has been deactivated by an administrator.', [], 403);
      return;
    }

    req.user = {
      id: userInDb.id,
      email: userInDb.email,
      role: userInDb.role,
      name: userInDb.name,
    };
    next();
  } catch {
    sendError(res, 'Invalid or expired authentication session. Please log in again.', [], 401);
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    sendError(res, 'Authentication required.', [], 401);
    return;
  }

  if (req.user.role !== 'admin') {
    sendError(res, 'Forbidden: Administrator privileges are required for this resource.', [], 403);
    return;
  }

  next();
};
