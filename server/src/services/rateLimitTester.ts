import { db, logAuditEvent } from '../database/db.js';
import crypto from 'crypto';

export interface RateLimitTestConfig {
  targetEndpoint: 'protected' | 'unprotected';
  httpMethod: 'GET' | 'POST';
  requestLimit: number; // e.g. 50 requests
  configuredThreshold: number; // e.g., 20 requests per window
}

export interface RateLimitTestResult {
  scanId: string;
  timestamp: string;
  targetEndpoint: string;
  totalRequests: number;
  successfulCount: number; // 200 OK
  rateLimitedCount: number; // 429 Too Many Requests
  errorCount: number;
  averageResponseTimeMs: number;
  thresholdReached: boolean;
  statusDistribution: Record<string, number>;
  summary: string;
  recommendation: string;
}

// In-memory request counters for target endpoints simulation
let protectedEndpointHits: number[] = [];

export function handleProtectedDemoEndpoint(): { status: number; message: string; remaining: number } {
  const now = Date.now();
  // Keep hits in last 10 seconds
  protectedEndpointHits = protectedEndpointHits.filter(t => now - t < 10000);

  if (protectedEndpointHits.length >= 20) {
    return {
      status: 429,
      message: 'Too Many Requests - Rate Limit Exceeded (429)',
      remaining: 0
    };
  }

  protectedEndpointHits.push(now);
  return {
    status: 200,
    message: 'Request Successful (200 OK)',
    remaining: 20 - protectedEndpointHits.length
  };
}

export function handleUnprotectedDemoEndpoint(): { status: number; message: string; remaining: number } {
  return {
    status: 200,
    message: 'Request Successful - No Limit Enforced (200 OK)',
    remaining: 9999
  };
}

export async function runRateLimitTest(config: RateLimitTestConfig): Promise<RateLimitTestResult> {
  const scanId = `RL-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const startTime = new Date().toISOString();

  // Enforce strict safety upper bounds
  const totalRequests = Math.min(Math.max(config.requestLimit || 30, 5), 100);
  const targetName = config.targetEndpoint === 'protected' ? '/api/scans/rate-limit/target-protected' : '/api/scans/rate-limit/target-unprotected';

  logAuditEvent('RATE_LIMIT_TEST_STARTED', `Rate limiting test executed against ${targetName} with ${totalRequests} requests.`);

  let successfulCount = 0;
  let rateLimitedCount = 0;
  let errorCount = 0;
  let totalTimeMs = 0;
  const statusDistribution: Record<string, number> = {};

  // Reset protected window for clean test run
  protectedEndpointHits = [];

  for (let i = 0; i < totalRequests; i++) {
    const reqStart = performance.now();
    const res = config.targetEndpoint === 'protected' 
      ? handleProtectedDemoEndpoint() 
      : handleUnprotectedDemoEndpoint();
    const reqEnd = performance.now();

    const duration = reqEnd - reqStart;
    totalTimeMs += duration;

    const statusStr = res.status.toString();
    statusDistribution[statusStr] = (statusDistribution[statusStr] || 0) + 1;

    if (res.status === 200) {
      successfulCount++;
    } else if (res.status === 429) {
      rateLimitedCount++;
    } else {
      errorCount++;
    }
  }

  const averageResponseTimeMs = Math.round((totalTimeMs / totalRequests) * 100) / 100;
  const thresholdReached = rateLimitedCount > 0;

  const summary = config.targetEndpoint === 'protected'
    ? `Rate limiting successfully activated after threshold. Out of ${totalRequests} requests: ${successfulCount} succeeded (200 OK), ${rateLimitedCount} were safely blocked with HTTP 429.`
    : `Unprotected endpoint accepted all ${totalRequests} requests without throttling (0 blocked). High vulnerability risk under high-volume traffic.`;

  const recommendation = config.targetEndpoint === 'protected'
    ? 'Rate limiting is properly configured. Maintain Express express-rate-limit middleware or reverse proxy throttling.'
    : 'Crucial Recommendation: Protect this endpoint with express-rate-limit or API Gateway throttling rules to mitigate automated abuse and Denial of Service.';

  // Save scan result to SQLite
  const insertHistory = db.prepare(`
    INSERT INTO scan_history (id, module_name, target_environment, start_time, completion_time, status, findings_count, warnings_count, passed_count, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertHistory.run(
    scanId,
    'API Rate Limiting Tester',
    `Local Demo Endpoint (${config.targetEndpoint})`,
    startTime,
    new Date().toISOString(),
    'COMPLETED',
    config.targetEndpoint === 'unprotected' ? 1 : 0,
    0,
    config.targetEndpoint === 'protected' ? 1 : 0,
    summary
  );

  const insertFinding = db.prepare(`
    INSERT INTO scan_findings (id, scan_id, title, severity, category, affected_target, evidence, risk_explanation, remediation, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertFinding.run(
    `FIND-${crypto.randomBytes(4).toString('hex')}`,
    scanId,
    config.targetEndpoint === 'protected' ? 'API Rate Throttling Active' : 'Missing API Rate Limiting Protection',
    config.targetEndpoint === 'protected' ? 'INFO' : 'HIGH',
    'A04:2021 - Insecure Design',
    targetName,
    `Tested ${totalRequests} requests. 200 OK: ${successfulCount}, 429 Throttled: ${rateLimitedCount}. Avg Latency: ${averageResponseTimeMs}ms`,
    config.targetEndpoint === 'protected' ? 'Endpoint resists automated request spam.' : 'Unthrottled APIs are vulnerable to brute-force credential stuffing and resource exhaustion.',
    recommendation,
    config.targetEndpoint === 'protected' ? 'PASS' : 'FAIL'
  );

  return {
    scanId,
    timestamp: startTime,
    targetEndpoint: targetName,
    totalRequests,
    successfulCount,
    rateLimitedCount,
    errorCount,
    averageResponseTimeMs,
    thresholdReached,
    statusDistribution,
    summary,
    recommendation
  };
}
