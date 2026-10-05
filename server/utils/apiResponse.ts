import { Response } from 'express';

export interface ApiSuccessPayload<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorPayload {
  success: false;
  message: string;
  errors: string[];
}

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data: T = {} as T,
  statusCode = 200
): Response<ApiSuccessPayload<T>> => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (
  res: Response,
  message: string,
  errors: string[] = [],
  statusCode = 400
): Response<ApiErrorPayload> => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

export class AppError extends Error {
  public statusCode: number;
  public errors: string[];

  constructor(message: string, statusCode = 400, errors: string[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
