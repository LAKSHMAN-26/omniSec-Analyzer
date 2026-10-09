import { Router } from 'express';
import { runOwaspAssessment } from '../services/owaspScanner.js';
import { db } from '../database/db.js';
import { z } from 'zod';

const router = Router();

const owaspSchema = z.object({
  owaspEdition: z.string().optional()
});

router.post('/scan', (req, res, next) => {
  try {
    const { owaspEdition } = owaspSchema.parse(req.body);
    const savedEditionSetting = db.prepare("SELECT value FROM application_settings WHERE key = 'owasp_edition'").get() as { value: string } | undefined;
    const edition = owaspEdition || (savedEditionSetting ? savedEditionSetting.value : '2021');

    const result = runOwaspAssessment(edition);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
