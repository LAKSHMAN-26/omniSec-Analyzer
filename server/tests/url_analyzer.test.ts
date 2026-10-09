import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { analyzeUrlSafety } from '../src/services/urlAnalyzer.js';
import http from 'http';
import https from 'https';

// =========================================================================
// CyberSentinel AI — Local URL Safety Analyzer Tests
// =========================================================================

describe('1. URL Safety Analyzer — Syntax & Scheme Validation', () => {
  it('should validate a standard HTTPS URL as VALIDATION PASSED', () => {
    const result = analyzeUrlSafety('https://example.com');
    expect(result.verdict).toBe('VALIDATION PASSED');
    expect(result.parsedHostname).toBe('example.com');
    expect(result.protocol).toBe('https');
    expect(result.warnings.length).toBe(0);
    expect(result.disclaimer).toBeTruthy();
    expect(result.liveReputation.status).toContain('unavailable');
  });

  it('should flag an unencrypted HTTP URL as SUSPICIOUS with warning', () => {
    const result = analyzeUrlSafety('http://example.org/about');
    expect(result.verdict).toBe('SUSPICIOUS');
    expect(result.protocol).toBe('http');
    const warning = result.warnings.find((w) => w.code === 'INSECURE_HTTP_SCHEME');
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe('MEDIUM');
  });

  it('should return UNVERIFIED for empty input', () => {
    const result = analyzeUrlSafety('');
    expect(result.verdict).toBe('UNVERIFIED');
    expect(result.warnings.some((w) => w.code === 'EMPTY_INPUT')).toBe(true);
  });

  it('should return UNVERIFIED for malformed syntax URL', () => {
    const result = analyzeUrlSafety('not a valid url at all');
    expect(result.verdict).toBe('UNVERIFIED');
    expect(result.warnings.some((w) => w.code === 'SYNTAX_INVALID')).toBe(true);
  });

  it('should return BLOCKED for prohibited schemes (e.g. javascript:)', () => {
    const result = analyzeUrlSafety('javascript:alert(1)');
    expect(result.verdict).toBe('BLOCKED');
    expect(result.warnings.some((w) => w.code === 'PROHIBITED_SCHEME')).toBe(true);
  });

  it('should return BLOCKED for prohibited file: scheme', () => {
    const result = analyzeUrlSafety('file:///C:/Windows/System32');
    expect(result.verdict).toBe('BLOCKED');
    expect(result.warnings.some((w) => w.code === 'PROHIBITED_SCHEME')).toBe(true);
  });
});

describe('2. Embedded Credentials & Authority Tricks', () => {
  it('should return BLOCKED for URLs with embedded username and password', () => {
    const result = analyzeUrlSafety('https://admin:SuperSecretPass123@mybank.com/account');
    expect(result.verdict).toBe('BLOCKED');
    const warning = result.warnings.find((w) => w.code === 'EMBEDDED_CREDENTIALS');
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe('HIGH');
  });
});

describe('3. Localhost & Private-Network IP Address Boundaries', () => {
  it('should return BLOCKED for localhost loopback target', () => {
    const result = analyzeUrlSafety('http://localhost:8080/internal-panel');
    expect(result.verdict).toBe('BLOCKED');
    expect(result.warnings.some((w) => w.code === 'PRIVATE_NETWORK_DESTINATION')).toBe(true);
  });

  it('should return BLOCKED for 127.0.0.1 loopback IP', () => {
    const result = analyzeUrlSafety('http://127.0.0.1/admin');
    expect(result.verdict).toBe('BLOCKED');
    expect(result.warnings.some((w) => w.code === 'PRIVATE_NETWORK_DESTINATION')).toBe(true);
  });

  it('should return BLOCKED for private 192.168.x.x network address', () => {
    const result = analyzeUrlSafety('http://192.168.1.1/router-login');
    expect(result.verdict).toBe('BLOCKED');
    expect(result.warnings.some((w) => w.code === 'PRIVATE_NETWORK_DESTINATION')).toBe(true);
  });

  it('should return BLOCKED for private 10.x.x.x network address', () => {
    const result = analyzeUrlSafety('http://10.0.0.5:3000/db');
    expect(result.verdict).toBe('BLOCKED');
    expect(result.warnings.some((w) => w.code === 'PRIVATE_NETWORK_DESTINATION')).toBe(true);
  });

  it('should return BLOCKED for link-local cloud metadata 169.254.169.254', () => {
    const result = analyzeUrlSafety('http://169.254.169.254/latest/meta-data/');
    expect(result.verdict).toBe('BLOCKED');
    expect(result.warnings.some((w) => w.code === 'PRIVATE_NETWORK_DESTINATION')).toBe(true);
  });
});

describe('4. Brand Typosquatting, Lookalikes & Suspicious Patterns', () => {
  it('should detect lookalike brand typosquatting (e.g. paypa1-verification.com)', () => {
    const result = analyzeUrlSafety('https://paypa1-verification.com/login');
    expect(result.verdict).toBe('SUSPICIOUS');
    const warning = result.warnings.find((w) => w.code === 'LOOKALIKE_BRAND_TYPOSQUATTING');
    expect(warning).toBeDefined();
    expect(warning?.title).toContain('paypal');
  });

  it('should detect double URL encoding (%25) and null bytes (%00)', () => {
    const result = analyzeUrlSafety('https://safe-domain.org/view?file=%252e%252e%2fetc%00');
    expect(result.verdict).toBe('SUSPICIOUS');
    expect(result.warnings.some((w) => w.code === 'UNUSUAL_ENCODING')).toBe(true);
  });

  it('should detect executable file download in path (.exe)', () => {
    const result = analyzeUrlSafety('https://cdn-download-site.com/updates/setup_patch.exe');
    expect(result.verdict).toBe('SUSPICIOUS');
    expect(result.warnings.some((w) => w.code === 'EXECUTABLE_DOWNLOAD_PATH')).toBe(true);
  });

  it('should detect open-redirect query parameter', () => {
    const result = analyzeUrlSafety('https://legitimate-site.org/login?redirect=https://evil-phishing.com');
    expect(result.verdict).toBe('SUSPICIOUS');
    expect(result.warnings.some((w) => w.code === 'POSSIBLE_OPEN_REDIRECT_PARAM')).toBe(true);
  });
});

describe('5. Passive Verification — NO Network Requests Made to Target', () => {
  it('should complete analysis without calling http.request or https.request to destination', async () => {
    const httpSpy = vi.spyOn(http, 'request');
    const httpsSpy = vi.spyOn(https, 'request');

    const externalUrl = 'https://some-untrusted-external-site-12345.org/path';
    analyzeUrlSafety(externalUrl);

    // Verify spy was NOT called with the external URL
    const httpCallsToTarget = httpSpy.mock.calls.filter((args: any) => {
      const urlArg = typeof args[0] === 'string' ? args[0] : args[0]?.href || args[0]?.hostname;
      return urlArg && String(urlArg).includes('some-untrusted-external-site-12345');
    });

    const httpsCallsToTarget = httpsSpy.mock.calls.filter((args: any) => {
      const urlArg = typeof args[0] === 'string' ? args[0] : args[0]?.href || args[0]?.hostname;
      return urlArg && String(urlArg).includes('some-untrusted-external-site-12345');
    });

    expect(httpCallsToTarget.length).toBe(0);
    expect(httpsCallsToTarget.length).toBe(0);

    httpSpy.mockRestore();
    httpsSpy.mockRestore();
  });
});

describe('6. API Endpoint /api/url-analyzer/check', () => {
  it('should analyze valid URL via POST /api/url-analyzer/check', async () => {
    const res = await request(app)
      .post('/api/url-analyzer/check')
      .send({ url: 'https://example.com' });

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe('VALIDATION PASSED');
    expect(res.body.parsedHostname).toBe('example.com');
    expect(res.body.checksPerformed.length).toBeGreaterThan(5);
    expect(res.body.checksNotPerformed.length).toBeGreaterThan(3);
    expect(res.body.disclaimer).toBeTruthy();
  });

  it('should return BLOCKED via API for internal metadata URL', async () => {
    const res = await request(app)
      .post('/api/url-analyzer/check')
      .send({ url: 'http://169.254.169.254/latest/meta-data/' });

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe('BLOCKED');
  });
});

describe('7. Backend Health Endpoint Verification', () => {
  it('should return ok status and service CyberSentinel AI API', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('CyberSentinel AI API');
    expect(res.body.databaseConnected).toBe(true);
    expect(typeof res.body.uptime).toBe('number');
  });
});
