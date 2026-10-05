import { Request, Response, NextFunction } from 'express';
import { AppError, sendError } from '../utils/apiResponse';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    sendError(res, err.message, err.errors, err.statusCode);
    return;
  }

  if (err instanceof Error) {
    console.error('[Server Error]:', err.message);
    sendError(res, err.message || 'An unexpected server error occurred.', [], 500);
    return;
  }

  sendError(res, 'Internal server error.', [], 500);
};
