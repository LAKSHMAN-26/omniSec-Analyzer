import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { getRegisteredLabTargets } from '../services/targetRegistry.js';
import { executeRealtimeScan, cancelRealtimeScan, ScanJobEvent } from '../services/realtimeScanner.js';
import { z } from 'zod';

export const realtimeScansRouter = Router();

// Store active event listeners for SSE streaming
const jobListeners = new Map<string, Set<(event: ScanJobEvent) => void>>();

function addJobListener(jobId: string, listener: (event: ScanJobEvent) => void) {
  if (!jobListeners.has(jobId)) {
    jobListeners.set(jobId, new Set());
  }
  jobListeners.get(jobId)!.add(listener);
}

function removeJobListener(jobId: string, listener: (event: ScanJobEvent) => void) {
  const listeners = jobListeners.get(jobId);
  if (listeners) {
    listeners.delete(listener);
    if (listeners.size === 0) {
      jobListeners.delete(jobId);
    }
  }
}

function broadcastJobEvent(event: ScanJobEvent) {
  const listeners = jobListeners.get(event.jobId);
  if (listeners) {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in job event listener:', e);
      }
    }
  }
}

// 1. Get registered educational lab targets
realtimeScansRouter.get('/targets', (req: Request, res: Response) => {
  const targets = getRegisteredLabTargets();
  return res.json({ targets });
});

// 2. Start a new real-time scan against a registered lab target
const startScanSchema = z.object({
  targetId: z.string().min(1, 'Target ID is required'),
  owaspEdition: z.string().optional().default('2021')
});

realtimeScansRouter.post('/start', async (req: Request, res: Response, next) => {
  try {
    const { targetId, owaspEdition } = startScanSchema.parse(req.body);

    const jobId = await executeRealtimeScan(targetId, owaspEdition, (event) => {
      broadcastJobEvent(event);
    });

    return res.status(201).json({
      status: 'started',
      jobId,
      message: 'Educational OWASP Top 10 and WSTG scan launched against local lab target.'
    });
  } catch (err: any) {
    // If target violation, return 403 Forbidden with exact explanation
    if (err.message && (err.message.includes('boundary violation') || err.message.includes('Target rejected'))) {
      return res.status(403).json({
        error: 'Forbidden',
        message: err.message,
        disclaimer: 'CyberSentinel operates ONLY against registered local educational lab applications.'
      });
    }
    next(err);
  }
});

// 3. SSE Stream endpoint for live check progression
realtimeScansRouter.get('/stream/:jobId', (req: Request, res: Response) => {
  const jobId = req.params.jobId;

  // SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for Nginx/proxies
  res.flushHeaders();

  // Check if job exists in db
  const job = db.prepare('SELECT * FROM scan_jobs WHERE id = ?').get(jobId) as any;
  if (!job) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: 'Job not found' })}\n\n`);
    return res.end();
  }

  // Send current state
  res.write(`event: initial_state\ndata: ${JSON.stringify(job)}\n\n`);

  // If already finished, send all completed checks and end
  if (job.status === 'COMPLETED' || job.status === 'CANCELLED' || job.status === 'FAILED') {
    const checks = db.prepare('SELECT * FROM scan_checks WHERE scan_id = ? ORDER BY id ASC').all(jobId);
    res.write(`event: existing_checks\ndata: ${JSON.stringify(checks)}\n\n`);
    res.write(`event: job_complete\ndata: ${JSON.stringify(job)}\n\n`);
    return res.end();
  }

  const listener = (event: ScanJobEvent) => {
    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
    if (event.type === 'job_complete' || event.type === 'job_cancelled' || event.type === 'job_error') {
      removeJobListener(jobId, listener);
      res.end();
    }
  };

  addJobListener(jobId, listener);

  req.on('close', () => {
    removeJobListener(jobId, listener);
  });
});

// 4. Cancel a running scan
realtimeScansRouter.post('/cancel/:jobId', (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const cancelled = cancelRealtimeScan(jobId);
  if (cancelled) {
    return res.json({ status: 'cancelled', message: `Scan job ${jobId} was cancelled.` });
  }
  return res.status(404).json({ error: 'Job not found or already finished.' });
});

// 5. Get list of all real-time scan jobs
realtimeScansRouter.get('/jobs', (req: Request, res: Response) => {
  const jobs = db.prepare('SELECT * FROM scan_jobs ORDER BY start_time DESC').all();
  return res.json({ jobs });
});

// 6. Get full details of a specific job (including all checks)
realtimeScansRouter.get('/jobs/:jobId', (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const job = db.prepare('SELECT * FROM scan_jobs WHERE id = ?').get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Scan job not found' });
  }
  const checks = db.prepare('SELECT * FROM scan_checks WHERE scan_id = ? ORDER BY id ASC').all(jobId);
  const findings = db.prepare('SELECT * FROM scan_findings WHERE scan_id = ?').all(jobId);

  return res.json({ job, checks, findings });
});

// 7. Download comprehensive security report
realtimeScansRouter.get('/reports/:jobId/download', (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const format = (req.query.format as string) || 'json';

  const job = db.prepare('SELECT * FROM scan_jobs WHERE id = ?').get(jobId) as any;
  if (!job) {
    return res.status(404).json({ error: 'Scan job not found' });
  }

  const checks = db.prepare('SELECT * FROM scan_checks WHERE scan_id = ? ORDER BY id ASC').all(jobId);
  const findings = db.prepare('SELECT * FROM scan_findings WHERE scan_id = ?').all(jobId);

  const reportPayload = {
    projectName: 'CyberSentinel AI — Real-Time OWASP Top 10 + WSTG Security Scanner',
    scanId: job.id,
    targetEnvironment: job.target_name,
    targetUrl: job.target_url,
    owaspEdition: job.owasp_edition,
    status: job.status,
    startTime: job.start_time,
    completionTime: job.completion_time,
    summary: job.summary,
    statistics: {
      totalChecks: job.total_checks,
      completedChecks: job.completed_checks,
      findingsCount: job.findings_count,
      warningsCount: job.warnings_count,
      passedCount: job.passed_count,
      manualReviewCount: job.manual_review_count
    },
    findings,
    allChecks: checks,
    disclaimer: 'This assessment is generated for educational purposes within the isolated local educational lab. No external testing was conducted.'
  };

  if (format === 'html') {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="cybersentinel_report_${job.id}.html"`);
    const htmlReport = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>CyberSentinel AI - OWASP and WSTG Assessment Report (${job.id})</title>
        <style>
          body { font-family: Inter, -apple-system, sans-serif; background: #0B1020; color: #F8FAFC; margin: 0; padding: 40px; }
          .container { max-width: 900px; margin: 0 auto; background: #111827; padding: 32px; border-radius: 12px; border: 1px solid #1F2937; }
          h1 { color: #22D3EE; margin-top: 0; border-bottom: 2px solid #1F2937; padding-bottom: 16px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 12px; }
          .badge-high { background: #EF4444; color: white; }
          .badge-pass { background: #22C55E; color: white; }
          .badge-warn { background: #F59E0B; color: black; }
          .card { background: #1E293B; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #334155; }
          pre { background: #0B1020; color: #22D3EE; padding: 12px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 13px; overflow-x: auto; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
          .stat-box { background: #0B1020; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #1F2937; }
          .stat-num { font-size: 24px; font-weight: bold; color: #22D3EE; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🛡️ CyberSentinel AI — OWASP and WSTG Security Assessment</h1>
          <p><strong>Scan Job ID:</strong> ${job.id}</p>
          <p><strong>Target:</strong> ${job.target_name} (${job.target_url})</p>
          <p><strong>Status:</strong> ${job.status} | <strong>OWASP Edition:</strong> ${job.owasp_edition}</p>
          <p><strong>Summary:</strong> ${job.summary}</p>
          <div class="summary-grid">
            <div class="stat-box"><div class="stat-num">${job.passed_count}</div>Passed</div>
            <div class="stat-box"><div class="stat-num" style="color: #EF4444">${job.findings_count}</div>Findings</div>
            <div class="stat-box"><div class="stat-num" style="color: #F59E0B">${job.warnings_count}</div>Warnings</div>
            <div class="stat-box"><div class="stat-num" style="color: #8B5CF6">${job.manual_review_count}</div>Manual Review</div>
          </div>
          <h2>Detailed Checks & Evidence</h2>
          ${checks.map((c: any) => `
            <div class="card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${c.category_id}: ${c.category_name} - ${c.check_name}</strong>
                <span class="badge ${c.status === 'PASS' ? 'badge-pass' : c.status === 'FINDING' ? 'badge-high' : 'badge-warn'}">${c.status}</span>
              </div>
              <p><strong>Endpoint:</strong> <code>${c.http_method} ${c.target_endpoint}</code></p>
              <p><strong>Evidence:</strong></p>
              <pre>${c.evidence}</pre>
              <p><strong>Remediation:</strong> ${c.remediation}</p>
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;
    return res.send(htmlReport);
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="cybersentinel_report_${job.id}.json"`);
  return res.json(reportPayload);
});
