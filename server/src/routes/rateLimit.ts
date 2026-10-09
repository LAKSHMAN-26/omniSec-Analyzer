import { Router } from 'express';
import { runRateLimitTest, handleProtectedDemoEndpoint, handleUnprotectedDemoEndpoint } from '../services/rateLimitTester.js';
import { z } from 'zod';

const router = Router();

const rateLimitSchema = z.object({
  targetEndpoint: z.enum(['protected', 'unprotected']).default('protected'),
  httpMethod: z.enum(['GET', 'POST']).default('GET'),
  requestLimit: z.number().min(5).max(100).default(30),
  configuredThreshold: z.number().min(5).max(50).default(20)
});

// Run automated rate limit test simulation
router.post('/scan', async (req, res, next) => {
  try {
    const config = rateLimitSchema.parse(req.body);
    const result = await runRateLimitTest(config);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// Target Endpoint Protected Demo
router.all('/target-protected', (req, res) => {
  const result = handleProtectedDemoEndpoint();
  return res.status(result.status).json(result);
});

// Target Endpoint Unprotected Demo
router.all('/target-unprotected', (req, res) => {
  const result = handleUnprotectedDemoEndpoint();
  return res.status(result.status).json(result);
});

export default router;
