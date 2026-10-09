import { Router } from 'express';
import { getGeolocationProviderStatus, lookupIpGeolocation } from '../services/ipService.js';
import { z } from 'zod';

const router = Router();

const ipSchema = z.object({
  ip: z.string().min(1, 'IP address is required')
});

router.get('/provider-status', (_req, res) => {
  return res.json(getGeolocationProviderStatus());
});

router.get('/:ip', async (req, res, next) => {
  try {
    const { ip } = ipSchema.parse(req.params);
    const result = await lookupIpGeolocation(ip);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
