import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/database/db.js';
import { validateLabTarget, validateRedirectTarget, isBlockedOrPrivateIp, LabTarget } from '../src/services/targetRegistry.js';
import {
  owaspChecksList,
  setCustomScannerRequester,
  executeRealtimeScan,
  cancelRealtimeScan,
  runChecksLoop,
  registerActiveJob
} from '../src/services/realtimeScanner.js';
import { runOwaspAssessment } from '../src/services/owaspScanner.js';

describe('OWASP Evidence-Based Checks & Safe Authorization Test Suite', () => {
  const mockTarget: LabTarget = {
    id: 'lab-secure',
    name: 'Secure Demo Application (Defensive Reference)',
    target_type: 'secure',
    base_url: 'http://127.0.0.1:5000/api/lab/secure',
    description: 'Hardened defensive implementation',
    is_active: 1
  };

  beforeEach(() => {
    setCustomScannerRequester(null);
  });

  afterEach(() => {
    setCustomScannerRequester(null);
  });

  // 1. Missing Security Header Check
  it('1. A missing security header produces a finding (FAIL), not a pass', async () => {
    const headersCheck = owaspChecksList.find((c) => c.checkName === 'Defensive HTTP Response Headers Audit');
    expect(headersCheck).toBeDefined();

    // Mock response missing Content-Security-Policy and X-Frame-Options
    setCustomScannerRequester(async () => ({
      statusCode: 200,
      headers: {
        'x-content-type-options': 'nosniff',
        'x-powered-by': 'Express'
      },
      body: '{"status":"ok"}',
      durationMs: 10
    }));

    const result = await headersCheck!.run(mockTarget.base_url, mockTarget);
    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('Missing security headers');
    expect(result.evidence).toContain('Content-Security-Policy');
    expect(result.evidence).toContain('X-Frame-Options');
    expect(result.explanation).toContain('omitted standard defensive HTTP response headers');
  });

  // 2. Present Security Headers Evaluation
  it('2. Present security headers are evaluated according to the defined check and pass', async () => {
    const headersCheck = owaspChecksList.find((c) => c.checkName === 'Defensive HTTP Response Headers Audit');
    expect(headersCheck).toBeDefined();

    // Mock response containing all required defensive headers
    setCustomScannerRequester(async () => ({
      statusCode: 200,
      headers: {
        'content-security-policy': "default-src 'self'",
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN'
      },
      body: '{"status":"ok"}',
      durationMs: 12
    }));

    const result = await headersCheck!.run(mockTarget.base_url, mockTarget);
    expect(result.status).toBe('PASS');
    expect(result.evidence).toContain('All required security headers present');
    expect(result.evidence).toContain('Content-Security-Policy');
  });

  // 3. Cookie Flags Evaluation & Missing Evidence Rule
  it('3. Cookie check: Missing Set-Cookie header returns NOT_TESTED, not a false pass', async () => {
    const cookieCheck = owaspChecksList.find((c) => c.checkName === 'Sensitive Data Exposure & Cookie Security Flag Inspection');
    expect(cookieCheck).toBeDefined();

    // Mock response with NO cookies
    setCustomScannerRequester(async () => ({
      statusCode: 200,
      headers: {
        'content-type': 'application/json'
      },
      body: '{"status":"ok"}',
      durationMs: 8
    }));

    const result = await cookieCheck!.run(mockTarget.base_url, mockTarget);
    expect(result.status).toBe('NOT_TESTED');
    expect(result.evidence).toContain('No Set-Cookie response header');
    expect(result.explanation).toContain('cannot be evaluated because no cookies were issued');
  });

  it('3b. Cookie check: Cookie without HttpOnly/SameSite produces FAIL with observed evidence', async () => {
    const cookieCheck = owaspChecksList.find((c) => c.checkName === 'Sensitive Data Exposure & Cookie Security Flag Inspection');
    expect(cookieCheck).toBeDefined();

    setCustomScannerRequester(async () => ({
      statusCode: 200,
      headers: {
        'set-cookie': ['session_id=insecure123; Path=/']
      },
      body: '{"status":"ok"}',
      durationMs: 9
    }));

    const result = await cookieCheck!.run(mockTarget.base_url, mockTarget);
    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('Missing required attributes: [HttpOnly, Secure, SameSite]');
  });

  // 4. Unimplemented Check Returns NOT_TESTED
  it('4. An unimplemented check returns NOT_TESTED with honest reasoning', async () => {
    const unimplementedCheck = owaspChecksList.find((c) => c.checkName.includes('Multi-Factor Hardware Token'));
    expect(unimplementedCheck).toBeDefined();

    const result = await unimplementedCheck!.run(mockTarget.base_url, mockTarget);
    expect(result.status).toBe('NOT_TESTED');
    expect(result.evidence).toContain('Automated software scanners cannot simulate physical FIDO2/WebAuthn');
    expect(result.limitations).toContain('unsupported by automated API scans');
  });

  // 5. Network Failure Returns ERROR
  it('5. A network connection failure returns ERROR, not PASS or silent success', async () => {
    const accessCheck = owaspChecksList.find((c) => c.checkName === 'Unauthenticated Object Access Verification');
    expect(accessCheck).toBeDefined();

    setCustomScannerRequester(async () => {
      throw new Error('ECONNREFUSED: Connection refused at 127.0.0.1:5000');
    });

    const result = await accessCheck!.run(mockTarget.base_url, mockTarget);
    expect(result.status).toBe('ERROR');
    expect(result.evidence).toContain('Connection error');
    expect(result.evidence).toContain('ECONNREFUSED');
    expect(result.explanation).toContain('scanner was unable to complete the HTTP request');
  });

  // 6. Invalid URLs are Rejected
  it('6. Invalid URLs are rejected by target validation', () => {
    expect(validateLabTarget('').valid).toBe(false);
    expect(validateLabTarget('   ').valid).toBe(false);
    expect(validateLabTarget('not_a_valid_url').valid).toBe(false);
    expect(validateLabTarget('ftp://127.0.0.1/test').valid).toBe(false);
    expect(validateLabTarget('file:///etc/passwd').valid).toBe(false);
    expect(validateLabTarget('javascript:alert(1)').valid).toBe(false);
  });

  // 7. Unauthorized Public Targets Cannot Trigger Active Scans
  it('7. Unauthorized public targets and arbitrary IPs are blocked from active scans', async () => {
    expect(validateLabTarget('https://api.github.com').valid).toBe(false);
    expect(validateLabTarget('https://google.com').valid).toBe(false);
    expect(validateLabTarget('http://192.168.1.1/admin').valid).toBe(false);
    expect(validateLabTarget('http://10.0.0.1:8080/api').valid).toBe(false);
    expect(validateLabTarget('http://169.254.169.254/latest/meta-data/').valid).toBe(false);

    // API route rejection
    const res = await request(app)
      .post('/api/scans/realtime/start')
      .send({ targetId: 'https://arbitrary-public-site.com' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
    expect(res.body.message).toContain('Target rejected');
  });

  // 8. SSRF IP Boundary Helper
  it('8. isBlockedOrPrivateIp detects private, loopback, and cloud metadata IPs', () => {
    expect(isBlockedOrPrivateIp('127.0.0.1')).toBe(true);
    expect(isBlockedOrPrivateIp('127.0.0.2')).toBe(true);
    expect(isBlockedOrPrivateIp('10.0.0.1')).toBe(true);
    expect(isBlockedOrPrivateIp('172.16.0.1')).toBe(true);
    expect(isBlockedOrPrivateIp('192.168.1.1')).toBe(true);
    expect(isBlockedOrPrivateIp('169.254.169.254')).toBe(true);
    expect(isBlockedOrPrivateIp('0.0.0.0')).toBe(true);
    expect(isBlockedOrPrivateIp('::1')).toBe(true);
    expect(isBlockedOrPrivateIp('fe80::1')).toBe(true);
    // Public IP is not in private block
    expect(isBlockedOrPrivateIp('93.184.216.34')).toBe(false);
  });

  // 9. Redirects to Blocked Addresses are Rejected
  it('9. Redirects to blocked cloud metadata or external addresses are rejected', () => {
    const target = mockTarget;

    // Redirect to cloud metadata
    const r1 = validateRedirectTarget('http://169.254.169.254/latest/meta-data/', target);
    expect(r1.valid).toBe(false);
    expect(r1.error).toContain('cloud metadata');

    // Redirect to external domain
    const r2 = validateRedirectTarget('https://evil-attacker-site.com/steal', target);
    expect(r2.valid).toBe(false);
    expect(r2.error).toContain('outside authorized lab perimeter');

    // Redirect to prohibited protocol
    const r3 = validateRedirectTarget('file:///C:/Windows/win.ini', target);
    expect(r3.valid).toBe(false);
    expect(r3.error).toContain('Prohibited scheme');

    // Safe redirect within authorized lab
    const r4 = validateRedirectTarget('/api/lab/secure/headers', target);
    expect(r4.valid).toBe(true);
    expect(r4.url?.pathname).toBe('/api/lab/secure/headers');
  });

  // 10. One Failed Check Does Not Incorrectly Mark Other Checks as Passed
  it('10. Checks are evaluated independently without cascading false passes', async () => {
    const accessCheck = owaspChecksList.find((c) => c.checkName === 'Unauthenticated Object Access Verification');
    const sqlCheck = owaspChecksList.find((c) => c.checkName === 'SQL Injection Dynamic Query Tautology Test');

    expect(accessCheck).toBeDefined();
    expect(sqlCheck).toBeDefined();

    // Mock access check to fail (HTTP 200 with user data)
    setCustomScannerRequester(async (url) => {
      if (url.includes('/users/2')) {
        return {
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ user: { id: 2, username: 'bob_faculty', role: 'faculty', email: 'bob@lab.internal' } }),
          durationMs: 15
        };
      }
      if (url.includes('/products')) {
        return {
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ resultsCount: 0, defenseMethod: 'Parameterized Prepared Statement' }),
          durationMs: 14
        };
      }
      return {
        statusCode: 404,
        headers: {},
        body: 'Not found',
        durationMs: 5
      };
    });

    const accessResult = await accessCheck!.run(mockTarget.base_url, mockTarget);
    const sqlResult = await sqlCheck!.run(mockTarget.base_url, mockTarget);

    expect(accessResult.status).toBe('FAIL');
    expect(sqlResult.status).toBe('PASS');
  });

  // 11. Directory Listing Check
  it('11. Directory listing check detects exposed file indexing (FAIL) vs disabled (PASS)', async () => {
    const dirCheck = owaspChecksList.find((c) => c.checkName === 'Directory Listing & Static Indexing Audit');
    expect(dirCheck).toBeDefined();

    // Vulnerable response
    setCustomScannerRequester(async () => ({
      statusCode: 200,
      headers: { 'content-type': 'text/html' },
      body: '<html><head><title>Index of /files/</title></head><body><a href="database.sqlite">database.sqlite</a></body></html>',
      durationMs: 10
    }));

    const vulnResult = await dirCheck!.run(mockTarget.base_url, mockTarget);
    expect(vulnResult.status).toBe('FAIL');
    expect(vulnResult.evidence).toContain('Directory listing is enabled');

    // Secure response (403 Forbidden)
    setCustomScannerRequester(async () => ({
      statusCode: 403,
      headers: { 'content-type': 'application/json' },
      body: '{"error":"Directory indexing is disabled."}',
      durationMs: 8
    }));

    const secResult = await dirCheck!.run(mockTarget.base_url, mockTarget);
    expect(secResult.status).toBe('PASS');
    expect(secResult.evidence).toContain('Directory indexing is disabled');
  });

  // 12. Scan Cancellation and Timeout Behavior
  it('12. Scan job cancellation marks job as CANCELLED', async () => {
    const startRes = await request(app)
      .post('/api/scans/realtime/start')
      .send({ targetId: 'lab-secure' });
    expect(startRes.status).toBe(201);
    const jobId = startRes.body.jobId;

    const cancelled = cancelRealtimeScan(jobId);
    expect(cancelled).toBe(true);

    const jobInDb = db.prepare('SELECT status FROM scan_jobs WHERE id = ?').get(jobId) as any;
    expect(jobInDb.status).toBe('CANCELLED');
  });

  // 13. Accurate Scan Summary Counts
  it('13. Accurate summary counts reflect genuine check outcomes', async () => {
    // Run direct scan loop with mocked requester where:
    // - Check 0: PASS
    // - Check 1: FAIL
    // - Check 2: NOT_TESTED
    // - Check 3: ERROR
    setCustomScannerRequester(async (url) => {
      if (url.includes('/users/2')) {
        return { statusCode: 401, headers: {}, body: '{"error":"Unauthorized"}', durationMs: 5 }; // PASS
      }
      if (url.includes('/headers')) {
        return { statusCode: 200, headers: {}, body: '{}', durationMs: 5 }; // FAIL (missing headers)
      }
      if (url.includes('/crypto')) {
        return { statusCode: 200, headers: {}, body: '{}', durationMs: 5 }; // NOT_TESTED (no cookies)
      }
      throw new Error('Connection failed');
    });

    const testJobId = `SCAN-TEST-COUNTS-${Date.now()}`;
    const startTime = new Date().toISOString();
    db.prepare(`
      INSERT INTO scan_jobs (
        id, target_id, target_name, target_url, owasp_edition, status, start_time,
        total_checks, completed_checks, findings_count, warnings_count, passed_count,
        errors_count, untested_count, manual_review_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(testJobId, mockTarget.id, mockTarget.name, mockTarget.base_url, '2021', 'RUNNING', startTime, owaspChecksList.length, 0, 0, 0, 0, 0, 0, 0);

    // Also insert into scan_history — scan_findings has FK referencing scan_history(id)
    db.prepare(`
      INSERT INTO scan_history (
        id, module_name, target_environment, start_time, status,
        findings_count, warnings_count, passed_count, errors_count, untested_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(testJobId, 'OWASP Top 10 Assessment', mockTarget.name, startTime, 'IN_PROGRESS', 0, 0, 0, 0, 0);

    registerActiveJob(testJobId);
    await runChecksLoop(testJobId, mockTarget, '2021');

    const job = db.prepare('SELECT * FROM scan_jobs WHERE id = ?').get(testJobId) as any;
    expect(job.status).toBe('COMPLETED');
    expect(job.completed_checks).toBe(owaspChecksList.length);
    expect(job.passed_count).toBeGreaterThan(0);
    expect(job.findings_count).toBeGreaterThan(0);
    expect(job.untested_count).toBeGreaterThan(0);

    // Verify sum of counts equals total completed checks
    const totalCounted = job.passed_count + job.findings_count + job.warnings_count + job.errors_count + job.untested_count;
    expect(totalCounted).toBe(job.completed_checks);
  });

  // 14. Real OWASP Assessment (owaspScanner.ts) Evaluates Real Evidence
  it('14. runOwaspAssessment executes real evidence-based checks against lab target', async () => {
    // Point to lab-vulnerable
    setCustomScannerRequester(async (url) => {
      if (url.includes('/users/2')) {
        return {
          statusCode: 200,
          headers: {},
          body: JSON.stringify({ user: { username: 'bob_faculty', role: 'faculty' } }),
          durationMs: 10
        };
      }
      if (url.includes('/headers')) {
        return {
          statusCode: 200,
          headers: { 'x-powered-by': 'Express' }, // missing headers
          body: '{}',
          durationMs: 8
        };
      }
      return {
        statusCode: 200,
        headers: {},
        body: JSON.stringify({ resultsCount: 0, defenseMethod: 'Parameterized' }),
        durationMs: 5
      };
    });

    const result = await runOwaspAssessment('2021', 'lab-vulnerable');
    expect(result.status).toBe('COMPLETED');
    expect(result.categories).toHaveLength(10);
    expect(result.findingsCount).toBeGreaterThanOrEqual(1);

    const a01 = result.categories.find((c) => c.categoryId === 'A01:2021');
    expect(a01?.status).toBe('FINDING');
    expect(a01?.evidence).toContain('HTTP 200 OK received without authorization');

    const a05 = result.categories.find((c) => c.categoryId === 'A05:2021');
    expect(a05?.status).toBe('FINDING');
    expect(a05?.evidence).toContain('Missing security headers');
  });
});
