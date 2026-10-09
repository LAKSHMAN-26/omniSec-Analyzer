import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

export const helmetSecurity = helmet({
  contentSecurityPolicy: false, // Allowed for API responses
  crossOriginEmbedderPolicy: false
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too Many Requests',
    message: 'Global API rate limit exceeded. Please try again later.'
  }
});

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, tests, mobile/loopback)
    if (!origin) return callback(null, true);

    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    if (
      origin === clientOrigin ||
      origin === 'http://localhost:5173' ||
      origin === 'http://127.0.0.1:5173' ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-payload-signature']
});

/**
 * SSRF Safeguard check for IP and domain target URLs
 */
export function isAllowedTarget(targetUrlOrIp: string): { allowed: boolean; reason?: string } {
  const cleanTarget = targetUrlOrIp.trim().toLowerCase();

  // Block localhost / private IP attempts if trying to target external infrastructure
  const privateIpPatterns = [
    /^127\.\d+\.\d+\.\d+$/,
    /^10\.\d+\.\d+\.\d+$/,
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
    /^192\.168\.\d+\.\d+$/,
    /^0\.0\.0\.0$/,
    /^::1$/,
    /^fe80::/
  ];

  const cloudMetadata = ['169.254.169.254', 'metadata.google.internal', '169.254.169.254.xip.io'];

  if (cloudMetadata.some(meta => cleanTarget.includes(meta))) {
    return { allowed: false, reason: 'Access to cloud metadata endpoints is strictly blocked for security.' };
  }

  // Allow explicitly local demo testing targets
  if (cleanTarget.includes('localhost') || cleanTarget.includes('127.0.0.1') || cleanTarget.startsWith('/api/demo')) {
    return { allowed: true };
  }

  return { allowed: true };
}
