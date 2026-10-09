import { Router } from 'express';
import { generateScanReportJson, generateScanReportHtml } from '../services/reportGenerator.js';

const router = Router();

router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const format = (req.query.format as string) || 'json';

    if (format === 'html') {
      const html = generateScanReportHtml(id);
      if (!html) {
        return res.status(404).send('<h2>Report not found</h2>');
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    const jsonData = generateScanReportJson(id);
    if (!jsonData) {
      return res.status(404).json({ status: 'error', message: `Report for Scan ID '${id}' not found.` });
    }

    return res.json({ status: 'success', data: jsonData });
  } catch (err) {
    next(err);
  }
});

export default router;
