import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[CyberSentinel Error Handler]', err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed for request inputs.',
      errors: err.errors
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal server error occurred.',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}
