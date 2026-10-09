import { Router } from 'express';
import { db } from '../database/db.js';

const router = Router();

// Get scan history list
router.get('/history', (req, res, next) => {
  try {
    const scans = db.prepare('SELECT * FROM scan_history ORDER BY start_time DESC').all();
    return res.json({ status: 'success', data: scans });
  } catch (err) {
    next(err);
  }
});

// Get individual scan detail with findings
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const scan = db.prepare('SELECT * FROM scan_history WHERE id = ?').get(id);
    if (!scan) {
      return res.status(404).json({ status: 'error', message: `Scan ID '${id}' not found.` });
    }
    const findings = db.prepare('SELECT * FROM scan_findings WHERE scan_id = ?').all(id);
    return res.json({ status: 'success', data: { scan, findings } });
  } catch (err) {
    next(err);
  }
});

// Clear scan history
router.delete('/history', (req, res, next) => {
  try {
    db.prepare('DELETE FROM scan_findings').run();
    db.prepare('DELETE FROM scan_history').run();
    return res.json({ status: 'success', message: 'All scan history cleared successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
