import { Router } from 'express';
import { db } from '../database/db.js';
import { z } from 'zod';

const router = Router();

const updateSettingsSchema = z.object({
  owasp_edition: z.string().optional(),
  rate_limit_default_max: z.string().optional(),
  theme: z.string().optional(),
  demo_mode: z.string().optional()
});

router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT key, value FROM application_settings').all() as Array<{ key: string; value: string }>;
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    return res.json({ status: 'success', data: settings });
  } catch (err) {
    next(err);
  }
});

router.put('/', (req, res, next) => {
  try {
    const updates = updateSettingsSchema.parse(req.body);
    const stmt = db.prepare('INSERT INTO application_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) {
        stmt.run(k, String(v));
      }
    }

    return res.json({ status: 'success', message: 'Application settings updated successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
