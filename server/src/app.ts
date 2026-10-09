import express from 'express';
import { helmetSecurity, corsMiddleware, apiRateLimiter } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';

import healthRouter from './routes/health.js';
import geolocationRouter from './routes/geolocation.js';
import sqlInjectionRouter from './routes/sqlInjection.js';
import owaspRouter from './routes/owasp.js';
import rateLimitRouter from './routes/rateLimit.js';
import scansRouter from './routes/scans.js';
import reportsRouter from './routes/reports.js';
import settingsRouter from './routes/settings.js';
import { labRouter } from './routes/lab.js';
import { realtimeScansRouter } from './routes/realtimeScans.js';
import { urlAnalyzerRouter } from './routes/urlAnalyzer.js';

export const app = express();

// Global Middleware
app.use(helmetSecurity);
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiRateLimiter);

// API Routes setup
app.use('/api/health', healthRouter);
app.use('/api/geolocation', geolocationRouter);
app.use('/api/scans/sql-injection', sqlInjectionRouter);
app.use('/api/scans/owasp', owaspRouter);
app.use('/api/scans/rate-limit', rateLimitRouter);
app.use('/api/scans/realtime', realtimeScansRouter);
app.use('/api/scans', scansRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/lab', labRouter);
app.use('/api/url-analyzer', urlAnalyzerRouter);

// Root fallback
app.get('/', (req, res) => {
  res.json({
    project: 'CyberSentinel AI',
    status: 'online',
    documentation: '/api/health'
  });
});

// Centralized error handler
app.use(errorHandler);
