import { Router } from 'express';
import { runSqlInjectionAssessment, testVulnerableDemoEndpoint, testSecureDemoEndpoint } from '../services/sqlScanner.js';
import { z } from 'zod';

const router = Router();

const sqlScanSchema = z.object({
  targetMode: z.enum(['vulnerable', 'secure']).default('vulnerable')
});

const demoTestSchema = z.object({
  username: z.string().default('admin')
});

// Run complete automated SQL injection scan
router.post('/scan', (req, res, next) => {
  try {
    const { targetMode } = sqlScanSchema.parse(req.body);
    const result = runSqlInjectionAssessment(targetMode);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// Demo vulnerable endpoint invocation
router.post('/demo-vulnerable', (req, res, next) => {
  try {
    const { username } = demoTestSchema.parse(req.body);
    const result = testVulnerableDemoEndpoint(username);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// Demo secure endpoint invocation
router.post('/demo-secure', (req, res, next) => {
  try {
    const { username } = demoTestSchema.parse(req.body);
    const result = testSecureDemoEndpoint(username);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
