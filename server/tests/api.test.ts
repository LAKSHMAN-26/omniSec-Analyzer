import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

// ============================================================
// CyberSentinel AI - Automated API Test Suite (Vitest + Supertest)
// ============================================================

describe('GET /api/health', () => {
  it('should return healthy status with database connected flag', async () => {
    const res = await request(app).get('/api/health');
    expect(['ok', 'healthy']).toContain(res.body.status);
    expect(res.body.service).toBe('CyberSentinel AI API');
    expect(res.body.databaseConnected).toBe(true);
    expect(typeof res.body.uptime).toBe('number');
  });
});

describe('GET /api/geolocation/:ip - IP Validation Tests', () => {
  it('should accept and resolve a valid IPv4 address', async () => {
    const res = await request(app).get('/api/geolocation/8.8.8.8');
    expect(res.status).toBe(200);
    expect(res.body.ip).toBe('8.8.8.8');
    expect(res.body.version).toBe('IPv4');
    expect(res.body.isValid).toBe(true);
    expect(res.body.country).toBeTruthy();
    expect(res.body.disclaimer).toBeTruthy();
  });

  it('should accept and resolve a valid IPv6 address', async () => {
    const res = await request(app).get('/api/geolocation/2001%3A4860%3A4860%3A%3A8888');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe('IPv6');
    expect(res.body.isValid).toBe(true);
  });

  it('should return invalid result for a garbage IP string', async () => {
    const res = await request(app).get('/api/geolocation/not-an-ip');
    expect(res.status).toBe(200);
    expect(res.body.isValid).toBe(false);
    expect(res.body.version).toBe('Invalid');
  });

  it('should identify localhost address as private network', async () => {
    const res = await request(app).get('/api/geolocation/127.0.0.1');
    expect(res.status).toBe(200);
    expect(res.body.country).toContain('Private');
  });

  it('should handle IPv4 address 1.1.1.1 (Cloudflare) correctly', async () => {
    const res = await request(app).get('/api/geolocation/1.1.1.1');
    expect(res.status).toBe(200);
    expect(res.body.isp).toContain('Cloudflare');
  });
});

describe('POST /api/scans/sql-injection/scan - SQL Injection Tests', () => {
  it('should complete vulnerable scan and detect injection findings', async () => {
    const res = await request(app)
      .post('/api/scans/sql-injection/scan')
      .send({ targetMode: 'vulnerable' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.targetMode).toBe('vulnerable');
    expect(res.body.findingsCount).toBeGreaterThan(0);
    expect(res.body.findings).toBeInstanceOf(Array);
    expect(res.body.codeComparison).toBeDefined();
  });

  it('should complete secure scan and have no injection findings', async () => {
    const res = await request(app)
      .post('/api/scans/sql-injection/scan')
      .send({ targetMode: 'secure' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.targetMode).toBe('secure');
    expect(res.body.passedCount).toBeGreaterThan(0);
    // Secure mode should have zero FAIL findings
    const failFindings = res.body.findings.filter((f: any) => f.status === 'FAIL');
    expect(failFindings.length).toBe(0);
  });

  it('should reject invalid targetMode values', async () => {
    const res = await request(app)
      .post('/api/scans/sql-injection/scan')
      .send({ targetMode: 'malicious' });
    expect(res.status).toBe(400);
  });

  it('should demonstrate SQL injection bypass on vulnerable demo endpoint', async () => {
    const res = await request(app)
      .post('/api/scans/sql-injection/demo-vulnerable')
      .send({ username: "' OR '1'='1" });
    expect(res.status).toBe(200);
    expect(res.body.rows.length).toBeGreaterThanOrEqual(3); // Auth bypass returns all rows
  });

  it('should safely block injection on secure demo endpoint', async () => {
    const res = await request(app)
      .post('/api/scans/sql-injection/demo-secure')
      .send({ username: "' OR '1'='1" });
    expect(res.status).toBe(200);
    expect(res.body.rows.length).toBe(0); // Safe — no bypass
  });
});

describe('POST /api/scans/owasp/scan - OWASP Assessment Tests', () => {
  it('should complete OWASP 2021 assessment with 10 categories', async () => {
    const res = await request(app)
      .post('/api/scans/owasp/scan')
      .send({ owaspEdition: '2021' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.owaspEdition).toBe('2021');
    expect(res.body.categories).toHaveLength(10);
  });

  it('should return valid status for every OWASP category', async () => {
    const res = await request(app)
      .post('/api/scans/owasp/scan')
      .send({ owaspEdition: '2021' });
    const validStatuses = ['PASS', 'FINDING', 'WARNING', 'NOT TESTED', 'MANUAL REVIEW REQUIRED'];
    for (const cat of res.body.categories) {
      expect(validStatuses).toContain(cat.status);
    }
  });

  it('should include links to official OWASP documentation', async () => {
    const res = await request(app)
      .post('/api/scans/owasp/scan')
      .send({ owaspEdition: '2021' });
    for (const cat of res.body.categories) {
      expect(cat.docsUrl).toContain('owasp.org');
    }
  });
});

describe('POST /api/scans/rate-limit/scan - Rate Limit Tests', () => {
  it('should confirm rate limiter activates on protected endpoint', async () => {
    const res = await request(app)
      .post('/api/scans/rate-limit/scan')
      .send({ targetEndpoint: 'protected', requestLimit: 40 });
    expect(res.status).toBe(200);
    expect(res.body.thresholdReached).toBe(true);
    expect(res.body.rateLimitedCount).toBeGreaterThan(0);
    expect(res.body.successfulCount).toBe(20); // threshold is 20
  });

  it('should show no throttling on unprotected endpoint', async () => {
    const res = await request(app)
      .post('/api/scans/rate-limit/scan')
      .send({ targetEndpoint: 'unprotected', requestLimit: 30 });
    expect(res.status).toBe(200);
    expect(res.body.thresholdReached).toBe(false);
    expect(res.body.successfulCount).toBe(30); // all succeed
    expect(res.body.rateLimitedCount).toBe(0);
  });

  it('should reject request limits exceeding 100', async () => {
    const res = await request(app)
      .post('/api/scans/rate-limit/scan')
      .send({ targetEndpoint: 'protected', requestLimit: 999 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/scans/history - Persistence Tests', () => {
  it('should return scan history from SQLite database', async () => {
    const res = await request(app).get('/api/scans/history');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('should return scan details with findings for an existing scan', async () => {
    // First create a scan
    const scanRes = await request(app)
      .post('/api/scans/sql-injection/scan')
      .send({ targetMode: 'vulnerable' });
    const scanId = scanRes.body.scanId;

    // Fetch details
    const detailRes = await request(app).get(`/api/scans/${scanId}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.scan.id).toBe(scanId);
    expect(detailRes.body.data.findings).toBeInstanceOf(Array);
  });

  it('should return 404 for non-existent scan ID', async () => {
    const res = await request(app).get('/api/scans/NONEXISTENT-SCAN-123');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/reports/:id - Report Generation Tests', () => {
  it('should generate a valid JSON report for an existing scan', async () => {
    const scanRes = await request(app)
      .post('/api/scans/owasp/scan')
      .send({ owaspEdition: '2021' });
    const scanId = scanRes.body.scanId;

    const reportRes = await request(app).get(`/api/reports/${scanId}?format=json`);
    expect(reportRes.status).toBe(200);
    expect(reportRes.body.data.projectName).toBe('CyberSentinel AI');
    expect(reportRes.body.data.scanDetails.scanId).toBe(scanId);
    expect(reportRes.body.data.findings).toBeInstanceOf(Array);
  });

  it('should generate a valid HTML report for an existing scan', async () => {
    const scanRes = await request(app)
      .post('/api/scans/owasp/scan')
      .send({ owaspEdition: '2021' });
    const scanId = scanRes.body.scanId;

    const reportRes = await request(app).get(`/api/reports/${scanId}?format=html`);
    expect(reportRes.status).toBe(200);
    expect(reportRes.headers['content-type']).toContain('text/html');
    expect(reportRes.text).toContain('CyberSentinel AI');
    expect(reportRes.text).toContain(scanId);
  });

  it('should return 404 for a non-existent report', async () => {
    const res = await request(app).get('/api/reports/FAKE-ID?format=json');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/settings - Settings Tests', () => {
  it('should return application settings from database', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.owasp_edition).toBeDefined();
  });

  it('should update settings via PUT request', async () => {
    const res = await request(app)
      .put('/api/settings')
      .send({ owasp_edition: '2017' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });
});

describe('Input Validation & Error Handling Tests', () => {
  it('should return 400 for malformed JSON request body', async () => {
    const res = await request(app)
      .post('/api/scans/sql-injection/scan')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');
    expect(res.status).toBe(400);
  });

  it('should never expose stack traces in production error responses', async () => {
    const res = await request(app).get('/api/scans/nonexistent');
    expect(res.body.stack).toBeUndefined();
  });
});
