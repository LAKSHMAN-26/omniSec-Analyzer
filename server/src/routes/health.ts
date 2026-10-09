import { Router } from 'express';
import { db } from '../database/db.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    // Perform an actual live query to test database health
    const row = db.prepare('SELECT 1 as alive').get() as { alive: number } | undefined;
    const scanRow = db.prepare('SELECT COUNT(*) as count FROM scan_history').get() as { count: number } | undefined;

    if (!row || row.alive !== 1) {
      return res.status(503).json({
        status: 'error',
        service: 'CyberSentinel AI API',
        message: 'Database query returned unexpected state',
        databaseConnected: false
      });
    }

    return res.json({
      status: 'ok',
      service: 'CyberSentinel AI API',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      databaseConnected: true,
      totalScansInDb: scanRow ? scanRow.count : 0,
      version: '1.0.0'
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'error',
      service: 'CyberSentinel AI API',
      message: 'Database initialization failed or connection lost',
      databaseConnected: false,
      error: err.message
    });
  }
});

export default router;
