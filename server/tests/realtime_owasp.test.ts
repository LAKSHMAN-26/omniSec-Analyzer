import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/database/db.js';
import { validateLabTarget } from '../src/services/targetRegistry.js';
import { cancelRealtimeScan } from '../src/services/realtimeScanner.js';

// =========================================================================
// CyberSentinel AI — Real-Time OWASP Educational Lab Test Suite
// =========================================================================

describe('1. Local Target Scope & Restriction Enforcement', () => {
  it('should accept registered lab target lab-vulnerable', () => {
    const res = validateLabTarget('lab-vulnerable');
    expect(res.valid).toBe(true);
    expect(res.target?.id).toBe('lab-vulnerable');
  });

  it('should accept registered lab target lab-secure', () => {
    const res = validateLabTarget('lab-secure');
    expect(res.valid).toBe(true);
    expect(res.target?.id).toBe('lab-secure');
  });

  it('should REJECT external targets (e.g. google.com)', () => {
    const res = validateLabTarget('https://google.com');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('boundary violation');
  });

  it('should REJECT public IPs and arbitrary hosts', () => {
    const res = validateLabTarget('http://93.184.216.34/api/lab');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('boundary violation');
  });

  it('should return 403 Forbidden when starting scan against external target', async () => {
    const res = await request(app)
      .post('/api/scans/realtime/start')
      .send({ targetId: 'https://evil-external-site.com' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
    expect(res.body.disclaimer).toContain('local educational lab');
  });
});

describe('2. Vulnerable vs Secure Demo Endpoints Comparison', () => {
  // A01 Broken Access Control
  it('A01: Vulnerable endpoint should permit unauthenticated access to user profile', async () => {
    const res = await request(app).get('/api/lab/vulnerable/users/2');
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.warning).toContain('horizontal privilege');
  });

  it('A01: Secure endpoint should enforce authentication token and return 401', async () => {
    const res = await request(app).get('/api/lab/secure/users/2');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('A01: Secure endpoint should grant access when valid Bearer token provided', async () => {
    const res = await request(app)
      .get('/api/lab/secure/users/2')
      .set('Authorization', 'Bearer lab_secure_token');
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('bob_faculty');
  });

  // A03 SQL Injection
  it('A03: Vulnerable products search should be bypassed by SQL injection tautology', async () => {
    const res = await request(app).get("/api/lab/vulnerable/products?q=' OR '1'='1");
    expect(res.status).toBe(200);
    expect(res.body.resultsCount).toBeGreaterThanOrEqual(3);
    expect(res.body.queryExecuted).toContain("' OR '1'='1");
  });

  it('A03: Secure products search should safely parameterize and block tautology bypass', async () => {
    const res = await request(app).get("/api/lab/secure/products?q=' OR '1'='1");
    expect(res.status).toBe(200);
    expect(res.body.resultsCount).toBe(0); // No product literally named "' OR '1'='1"
    expect(res.body.defenseMethod).toContain('Parameterized Prepared Statement');
  });

  // A05 Security Headers & Information Disclosure
  it('A05: Vulnerable headers should reveal server banner and lack security headers', async () => {
    const res = await request(app).get('/api/lab/vulnerable/headers');
    expect(res.status).toBe(200);
    expect(res.headers['x-powered-by']).toContain('Express');
    expect(res.headers['server']).toContain('CyberSentinel-Demo-Vulnerable');
    expect(res.headers['content-security-policy']).toBeUndefined();
  });

  it('A05: Secure headers should provide Content-Security-Policy and mask server info', async () => {
    const res = await request(app).get('/api/lab/secure/headers');
    expect(res.status).toBe(200);
    expect(res.headers['content-security-policy']).toBe("default-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  // A07 Authentication & User Enumeration
  it('A07: Vulnerable login should reveal existing username in error message', async () => {
    const res = await request(app)
      .post('/api/lab/vulnerable/login')
      .send({ username: 'alice_student', password: 'badpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('alice_student');
  });

  it('A07: Secure login should return generic timing-safe error preventing enumeration', async () => {
    const res = await request(app)
      .post('/api/lab/secure/login')
      .send({ username: 'alice_student', password: 'badpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials. Please verify your login details.');
  });

  // A08 Software & Data Integrity
  it('A08: Vulnerable import should accept unsigned payload', async () => {
    const res = await request(app)
      .post('/api/lab/vulnerable/import')
      .send({ payload: { config: 'test' } });
    expect(res.status).toBe(200);
    expect(res.body.integrityVerified).toBe(false);
  });

  it('A08: Secure import should reject unsigned payload with 400', async () => {
    const res = await request(app)
      .post('/api/lab/secure/import')
      .send({ payload: { config: 'test' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Data integrity violation');
  });

  // A10 SSRF
  it('A10: Secure fetch-url should block cloud metadata 169.254.169.254 with 403', async () => {
    const res = await request(app)
      .get('/api/lab/secure/fetch-url?url=http://169.254.169.254/latest/meta-data/');
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('security perimeter');
  });
});

describe('3. Real-Time Scan Engine, Database Persistence & Reports', () => {
  it('should list registered educational lab targets', async () => {
    const res = await request(app).get('/api/scans/realtime/targets');
    expect(res.status).toBe(200);
    expect(res.body.targets.length).toBeGreaterThanOrEqual(2);
    expect(res.body.targets.some((t: any) => t.id === 'lab-vulnerable')).toBe(true);
    expect(res.body.targets.some((t: any) => t.id === 'lab-secure')).toBe(true);
  });

  it('should start a real-time scan job and persist to database', async () => {
    const res = await request(app)
      .post('/api/scans/realtime/start')
      .send({ targetId: 'lab-secure', owaspEdition: '2021' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('started');
    expect(res.body.jobId).toBeTruthy();

    // Verify persisted in scan_jobs table
    const jobInDb = db.prepare('SELECT * FROM scan_jobs WHERE id = ?').get(res.body.jobId) as any;
    expect(jobInDb).toBeDefined();
    expect(jobInDb.target_id).toBe('lab-secure');
  });

  it('should cancel an in-progress scan and mark status as CANCELLED', async () => {
    const startRes = await request(app)
      .post('/api/scans/realtime/start')
      .send({ targetId: 'lab-vulnerable', owaspEdition: '2021' });
    const jobId = startRes.body.jobId;

    const cancelRes = await request(app).post(`/api/scans/realtime/cancel/${jobId}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe('cancelled');

    // Wait a brief tick and check DB status
    await new Promise((r) => setTimeout(r, 400));
    const jobInDb = db.prepare('SELECT status FROM scan_jobs WHERE id = ?').get(jobId) as any;
    expect(jobInDb.status).toBe('CANCELLED');
  });

  it('should generate downloadable JSON security report', async () => {
    // Insert a completed mock scan job for report testing
    const testJobId = 'SCAN-TEST-REPORT-1';
    db.prepare(`
      INSERT OR REPLACE INTO scan_jobs (
        id, target_id, target_name, target_url, owasp_edition, status, start_time, completion_time,
        total_checks, completed_checks, findings_count, warnings_count, passed_count, summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testJobId, 'lab-vulnerable', 'Vulnerable Demo Application', 'http://127.0.0.1:5000/api/lab/vulnerable',
      '2021', 'COMPLETED', new Date().toISOString(), new Date().toISOString(), 10, 10, 4, 1, 5, 'Test scan completed.'
    );

    const res = await request(app).get(`/api/scans/realtime/reports/${testJobId}/download?format=json`);
    expect(res.status).toBe(200);
    expect(res.body.scanId).toBe(testJobId);
    expect(res.body.statistics.findingsCount).toBe(4);
    expect(res.body.disclaimer).toContain('educational purposes');
  });

  it('should generate downloadable HTML report', async () => {
    const res = await request(app).get('/api/scans/realtime/reports/SCAN-TEST-REPORT-1/download?format=html');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('CyberSentinel AI — Security Assessment Report');
  });
});
