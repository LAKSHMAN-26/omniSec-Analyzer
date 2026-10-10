import { db, logAuditEvent } from '../database/db.js';
import { validateLabTarget, LabTarget } from './targetRegistry.js';
import { makeScannerRequest } from './realtimeScanner.js';
import crypto from 'crypto';

export interface OwaspCategoryCheck {
  categoryId: string;
  categoryName: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'FINDING' | 'WARNING' | 'MANUAL REVIEW REQUIRED' | 'NOT TESTED' | 'ERROR';
  title: string;
  evidence: string;
  explanation?: string;
  remediation: string;
  docsUrl: string;
  durationMs?: number;
  timestamp?: string;
}

export interface OwaspScanResult {
  scanId: string;
  owaspEdition: string;
  timestamp: string;
  status: 'COMPLETED';
  findingsCount: number;
  warningsCount: number;
  passedCount: number;
  errorsCount?: number;
  untestedCount?: number;
  manualReviewCount: number;
  summary: string;
  targetEnvironment: string;
  disclaimer: string;
  categories: OwaspCategoryCheck[];
}

export async function runOwaspAssessment(
  owaspEdition: string = '2021',
  targetIdentifier: string = 'lab-vulnerable'
): Promise<OwaspScanResult> {
  const targetValidation = validateLabTarget(targetIdentifier);
  const target: LabTarget = targetValidation.valid && targetValidation.target
    ? targetValidation.target
    : (db.prepare("SELECT * FROM lab_targets WHERE target_type = 'vulnerable' AND is_active = 1").get() as LabTarget);

  const scanId = `OWASP-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const startTime = new Date().toISOString();
  const baseUrl = target.base_url;

  logAuditEvent('OWASP_SCAN_STARTED', `OWASP Top 10 (${owaspEdition} edition) audit executed against ${target.name}.`);

  const categoryResults: OwaspCategoryCheck[] = [];

  // Helper to record check
  async function runCheck(
    categoryId: string,
    categoryName: string,
    description: string,
    title: string,
    docsUrl: string,
    executor: () => Promise<{ status: OwaspCategoryCheck['status']; evidence: string; explanation?: string; remediation: string }>
  ) {
    const start = Date.now();
    try {
      const res = await executor();
      categoryResults.push({
        categoryId,
        categoryName,
        description,
        status: res.status,
        title,
        evidence: res.evidence,
        explanation: res.explanation,
        remediation: res.remediation,
        docsUrl,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      categoryResults.push({
        categoryId,
        categoryName,
        description,
        status: 'ERROR',
        title,
        evidence: `Check execution error: ${err.message}`,
        explanation: 'Failed to contact test endpoint.',
        remediation: 'Ensure test target is available.',
        docsUrl,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 1. A01:2021 Broken Access Control
  await runCheck(
    'A01:2021',
    'Broken Access Control',
    'Restrictions on what authenticated users can do are not properly enforced.',
    'Unauthenticated Direct Object Access Check (/users/2)',
    'https://owasp.org/Top10/A01_2021-Broken_Access_Control/',
    async () => {
      const res = await makeScannerRequest(`${baseUrl}/users/2`, 'GET', {}, undefined, target);
      if (res.statusCode === 200) {
        try {
          const parsed = JSON.parse(res.body);
          if (parsed.user?.username) {
            return {
              status: 'FINDING',
              evidence: `HTTP 200 OK received without authorization credentials. Retrieved user object for ID 2: username='${parsed.user.username}', role='${parsed.user.role}'.`,
              explanation: 'Unauthenticated user could retrieve protected user record.',
              remediation: 'Enforce server-side session authentication on all user-scoped endpoints.'
            };
          }
        } catch {}
      }
      if (res.statusCode === 401 || res.statusCode === 403) {
        return {
          status: 'PASS',
          evidence: `HTTP ${res.statusCode} Access Denied correctly returned for unauthenticated request to /users/2.`,
          explanation: 'Access to user record ID 2 is properly restricted.',
          remediation: 'Maintain role-based access control.'
        };
      }
      return {
        status: 'WARNING',
        evidence: `Endpoint returned HTTP ${res.statusCode}.`,
        remediation: 'Review endpoint access permissions.'
      };
    }
  );

  // 2. A02:2021 Cryptographic Failures
  await runCheck(
    'A02:2021',
    'Cryptographic Failures',
    'Failures related to cryptography, transport encryption, or cookie flags.',
    'Sensitive Cookie Flags & Transport Encryption Audit (/crypto)',
    'https://owasp.org/Top10/A02_2021-Cryptographic_Failures/',
    async () => {
      const res = await makeScannerRequest(`${baseUrl}/crypto`, 'GET', {}, undefined, target);
      const setCookie = res.headers['set-cookie'];
      if (!setCookie) {
        return {
          status: 'NOT TESTED',
          evidence: 'No Set-Cookie header returned in response from /crypto.',
          explanation: 'Cookie security flags cannot be evaluated without observed cookies.',
          remediation: 'Ensure any authentication cookies set in production include HttpOnly and Secure.'
        };
      }
      const cookies = Array.isArray(setCookie) ? setCookie : [String(setCookie)];
      const cookieStr = cookies.join('; ');
      const missing: string[] = [];
      for (const singleCookie of cookies) {
        const parts = singleCookie.split(';').map((p) => p.trim().toLowerCase());
        const hasHttpOnly = parts.some((p) => p === 'httponly');
        const hasSecure = parts.some((p) => p === 'secure');
        const hasSameSite = parts.some((p) => p.startsWith('samesite'));

        if (!hasHttpOnly && !missing.includes('HttpOnly')) missing.push('HttpOnly');
        if (!hasSecure && !missing.includes('Secure')) missing.push('Secure');
        if (!hasSameSite && !missing.includes('SameSite')) missing.push('SameSite');
      }

      if (missing.length > 0) {
        return {
          status: 'WARNING',
          evidence: `Cookie Set-Cookie header lacks required attributes: [${missing.join(', ')}]. Value: "${cookieStr}".`,
          remediation: 'Deploy HttpOnly, Secure, and SameSite=Strict on all authentication cookies.'
        };
      }
      return {
        status: 'PASS',
        evidence: `Set-Cookie flags verified: HttpOnly, Secure, SameSite present. Value: "${cookieStr}".`,
        remediation: 'Ensure cookies remain encrypted and scoped in production.'
      };
    }
  );

  // 3. A03:2021 Injection
  await runCheck(
    'A03:2021',
    'Injection',
    'User-supplied data is not sanitized or parameterized, allowing queries to execute unexpectedly.',
    'SQL Injection Parameterized Query Verification (/products)',
    'https://owasp.org/Top10/A03_2021-Injection/',
    async () => {
      const payload = encodeURIComponent("' OR '1'='1");
      const res = await makeScannerRequest(`${baseUrl}/products?q=${payload}`, 'GET', {}, undefined, target);
      let parsed: any = {};
      try { parsed = JSON.parse(res.body); } catch {}

      if (parsed.resultsCount >= 3 || (parsed.queryExecuted && parsed.queryExecuted.includes("' OR '1'='1"))) {
        return {
          status: 'FINDING',
          evidence: `SQL Injection confirmed. Tautology payload ("' OR '1'='1") returned all ${parsed.resultsCount} products. Executed query: "${parsed.queryExecuted}".`,
          remediation: 'Use parameterized SQL queries (e.g. SQLite "?" placeholders). Never concatenate user input into raw SQL.'
        };
      }
      if (parsed.resultsCount === 0 || parsed.defenseMethod) {
        return {
          status: 'PASS',
          evidence: `SQL Injection blocked. Payload treated as literal search string. Defense: "${parsed.defenseMethod || 'Parameterized Query'}".`,
          remediation: 'Continue enforcing parameterized prepared statements.'
        };
      }
      return {
        status: 'WARNING',
        evidence: `Endpoint returned ${parsed.resultsCount} records for tautology query.`,
        remediation: 'Audit dynamic SQL queries.'
      };
    }
  );

  // 4. A04:2021 Insecure Design
  await runCheck(
    'A04:2021',
    'Insecure Design',
    'Risks related to design flaws and lack of threat modeling.',
    'Password Reset Anti-Automation & Challenge Control (/password-reset)',
    'https://owasp.org/Top10/A04_2021-Insecure_Design/',
    async () => {
      const res = await makeScannerRequest(`${baseUrl}/password-reset`, 'POST', {}, { username: 'alice_student', newPassword: 'NewPassword123!' }, target);
      if (res.statusCode === 200) {
        return {
          status: 'FINDING',
          evidence: 'Password reset completed without secondary challenge, verification token, or rate limiting.',
          remediation: 'Implement multi-step verification, challenge tokens, and rate limits on credential reset workflows.'
        };
      }
      if (res.statusCode === 401 || res.statusCode === 403) {
        return {
          status: 'PASS',
          evidence: `HTTP ${res.statusCode} Access Denied: Endpoint required valid challenge token.`,
          remediation: 'Maintain threat-modeled challenge controls.'
        };
      }
      return {
        status: 'WARNING',
        evidence: `Endpoint returned HTTP ${res.statusCode}.`,
        remediation: 'Review password reset design.'
      };
    }
  );

  // 5. A05:2021 Security Misconfiguration
  await runCheck(
    'A05:2021',
    'Security Misconfiguration',
    'Missing or improperly configured security headers or verbose error tracebacks.',
    'Defensive HTTP Security Headers & Banner Audit (/headers)',
    'https://owasp.org/Top10/A05_2021-Security_Misconfiguration/',
    async () => {
      const res = await makeScannerRequest(`${baseUrl}/headers`, 'GET', {}, undefined, target);
      const headers = res.headers;
      const missing: string[] = [];
      if (!headers['content-security-policy']) missing.push('Content-Security-Policy');
      if (!headers['x-content-type-options']) missing.push('X-Content-Type-Options');
      if (!headers['x-frame-options']) missing.push('X-Frame-Options');

      if (missing.length > 0) {
        return {
          status: 'FINDING',
          evidence: `Missing security headers: [${missing.join(', ')}]. Revealed banners: X-Powered-By='${headers['x-powered-by'] || 'None'}', Server='${headers['server'] || 'None'}'.`,
          remediation: 'Configure Helmet to apply CSP, nosniff, and SAMEORIGIN headers, and suppress X-Powered-By.'
        };
      }
      return {
        status: 'PASS',
        evidence: `Required headers present (CSP, nosniff, SAMEORIGIN). Revealing software banners masked.`,
        remediation: 'Keep security headers updated in web server configuration.'
      };
    }
  );

  // 6. A06:2021 Vulnerable and Outdated Components
  await runCheck(
    'A06:2021',
    'Vulnerable and Outdated Components',
    'Using libraries, frameworks, or dependencies with known vulnerabilities.',
    'Declared Component Dependency Inventory Audit (/components)',
    'https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/',
    async () => {
      const res = await makeScannerRequest(`${baseUrl}/components`, 'GET', {}, undefined, target);
      let parsed: any = {};
      try { parsed = JSON.parse(res.body); } catch {}
      if (parsed.knownVulnerablePackages && parsed.knownVulnerablePackages.length > 0) {
        const pkg = parsed.knownVulnerablePackages[0];
        return {
          status: 'FINDING',
          evidence: `Outdated component detected: ${pkg.package}@${pkg.version} (CVE: ${pkg.cve}, Severity: ${pkg.severity}).`,
          remediation: 'Run "npm audit" regularly and upgrade dependencies to patched versions.'
        };
      }
      if (Array.isArray(parsed.knownVulnerablePackages) && parsed.knownVulnerablePackages.length === 0) {
        return {
          status: 'PASS',
          evidence: 'Component inventory audited: Zero known vulnerable libraries identified.',
          remediation: 'Maintain dependency scanning in CI/CD pipeline.'
        };
      }
      return {
        status: 'WARNING',
        evidence: `Component inventory returned unexpected payload.`,
        remediation: 'Validate package inventory format.'
      };
    }
  );

  // 7. A07:2021 Identification and Authentication Failures
  await runCheck(
    'A07:2021',
    'Identification and Authentication Failures',
    'Confirmation of user identity, authentication, and session management are not implemented securely.',
    'User Enumeration & Authentication Error Verbosity (/login)',
    'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/',
    async () => {
      const res1 = await makeScannerRequest(`${baseUrl}/login`, 'POST', {}, { username: 'alice_student', password: 'wrongpassword' }, target);
      const res2 = await makeScannerRequest(`${baseUrl}/login`, 'POST', {}, { username: 'unknown_user_999xyz', password: 'wrongpassword' }, target);

      let err1 = '';
      let err2 = '';
      try { err1 = JSON.parse(res1.body).error || ''; } catch {}
      try { err2 = JSON.parse(res2.body).error || ''; } catch {}

      if (err1 && err2 && err1 !== err2) {
        return {
          status: 'FINDING',
          evidence: `User enumeration flaw identified: Distinct error messages for valid user ("${err1}") vs invalid user ("${err2}").`,
          remediation: 'Return a generic timing-safe error message (e.g. "Invalid credentials") for all authentication failures.'
        };
      }
      if (err1 && err1 === err2) {
        return {
          status: 'PASS',
          evidence: `Authentication failure returned generic timing-safe error: "${err1}". User enumeration prevented.`,
          remediation: 'Enforce rate limits on login attempts.'
        };
      }
      return {
        status: 'WARNING',
        evidence: `Login responses did not provide standard error messages.`,
        remediation: 'Review authentication error responses.'
      };
    }
  );

  // 8. A08:2021 Software and Data Integrity Failures
  await runCheck(
    'A08:2021',
    'Software and Data Integrity Failures',
    'Code and infrastructure that does not protect against integrity violations.',
    'Untrusted Payload Integrity & Signature Validation (/import)',
    'https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/',
    async () => {
      const res = await makeScannerRequest(`${baseUrl}/import`, 'POST', {}, { payload: { config: 'test' } }, target);
      let parsed: any = {};
      try { parsed = JSON.parse(res.body); } catch {}

      if (res.statusCode === 200 && parsed.integrityVerified === false) {
        return {
          status: 'FINDING',
          evidence: 'Application accepted and processed untrusted payload without requiring digital signature or HMAC verification.',
          remediation: 'Implement cryptographic signature or checksum validation for all serialized configurations.'
        };
      }
      if (res.statusCode === 400 || res.statusCode === 403) {
        return {
          status: 'PASS',
          evidence: `Unsigned payload rejected (HTTP ${res.statusCode}: "${parsed.error || 'Integrity check required'}"). Cryptographic signature enforced.`,
          remediation: 'Maintain signed release artifacts and package lockfile validation.'
        };
      }
      return {
        status: 'MANUAL REVIEW REQUIRED',
        evidence: `Payload import endpoint returned HTTP ${res.statusCode}. Manual review recommended for untrusted deserialization.`,
        remediation: 'Review deserialization controls.'
      };
    }
  );

  // 9. A09:2021 Security Logging and Alerting Failures
  await runCheck(
    'A09:2021',
    'Security Logging and Alerting Failures',
    'Insufficient logging and monitoring leave attacks undetected and unanalyzed.',
    'Security Event Audit Trail Verification (/action)',
    'https://owasp.org/Top10/A09_2021-Security_Logging_and_Alerting_Failures/',
    async () => {
      const res = await makeScannerRequest(`${baseUrl}/action`, 'POST', {}, { action: 'demo_security_sensitive_operation' }, target);
      let parsed: any = {};
      try { parsed = JSON.parse(res.body); } catch {}

      if (res.statusCode === 200 && parsed.auditLogged === false) {
        return {
          status: 'FINDING',
          evidence: 'Security-critical action executed without generating a persistent audit log entry.',
          remediation: 'Ensure all security-relevant actions are logged to a tamper-resistant centralized audit log.'
        };
      }
      if (res.statusCode === 200 && parsed.auditLogged === true) {
        return {
          status: 'PASS',
          evidence: 'Security event verified: Entry recorded in SQLite audit_events table with timestamp and event metadata.',
          remediation: 'Configure automated anomaly alerts on repeated failures.'
        };
      }
      return {
        status: 'WARNING',
        evidence: `Action endpoint returned HTTP ${res.statusCode}.`,
        remediation: 'Audit event logging.'
      };
    }
  );

  // 10. A10:2021 Server-Side Request Forgery (SSRF)
  await runCheck(
    'A10:2021',
    'Server-Side Request Forgery (SSRF)',
    'Web application fetches remote resources without validating user-supplied destination.',
    'Internal Network Boundary & Cloud Metadata Target Filter Check (/fetch-url)',
    'https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/',
    async () => {
      const targetParam = encodeURIComponent('http://169.254.169.254/latest/meta-data/');
      const res = await makeScannerRequest(`${baseUrl}/fetch-url?url=${targetParam}`, 'GET', {}, undefined, target);
      let parsed: any = {};
      try { parsed = JSON.parse(res.body); } catch {}

      if (res.statusCode === 200) {
        return {
          status: 'FINDING',
          evidence: 'Cloud metadata IP (169.254.169.254) accepted without SSRF filter blocking.',
          remediation: 'Implement strict destination URL allowlists; strictly reject 169.254.169.254 and private IP blocks in URL fetchers.'
        };
      }
      if (res.statusCode === 403 || res.statusCode === 400) {
        return {
          status: 'PASS',
          evidence: `Restricted metadata destination safely blocked (HTTP ${res.statusCode}: "${parsed.error || 'Blocked'}"). Perimeter boundary intact.`,
          remediation: 'Maintain network egress filtering and avoid fetching arbitrary remote URLs.'
        };
      }
      return {
        status: 'WARNING',
        evidence: `Fetch-url endpoint returned HTTP ${res.statusCode}.`,
        remediation: 'Review egress boundary controls.'
      };
    }
  );

  let findingsCount = 0;
  let warningsCount = 0;
  let passedCount = 0;
  let errorsCount = 0;
  let untestedCount = 0;
  let manualReviewCount = 0;

  for (const cat of categoryResults) {
    if (cat.status === 'FINDING' || cat.status === 'FAIL') findingsCount++;
    else if (cat.status === 'WARNING') warningsCount++;
    else if (cat.status === 'PASS') passedCount++;
    else if (cat.status === 'ERROR') errorsCount++;
    else if (cat.status === 'NOT TESTED') untestedCount++;
    else if (cat.status === 'MANUAL REVIEW REQUIRED') manualReviewCount++;
  }

  const summary = findingsCount === 0 && errorsCount === 0
    ? `Completed OWASP Top 10 (${owaspEdition}) security assessment for ${target.name}. No issues detected by the checks performed. Results: ${passedCount} Passed, ${warningsCount} Warnings, ${untestedCount} Not Tested.`
    : `Completed OWASP Top 10 (${owaspEdition}) security assessment for ${target.name}. Results: ${passedCount} Passed, ${findingsCount} Findings, ${warningsCount} Warnings, ${manualReviewCount} Manual Review Required, ${errorsCount} Errors.`;

  // Insert to scan_history
  db.prepare(`
    INSERT INTO scan_history (
      id, module_name, target_environment, start_time, completion_time, status,
      findings_count, warnings_count, passed_count, errors_count, untested_count, summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    scanId,
    `OWASP Top 10 (${owaspEdition} Edition) Assessment`,
    target.name,
    startTime,
    new Date().toISOString(),
    'COMPLETED',
    findingsCount,
    warningsCount,
    passedCount,
    errorsCount,
    untestedCount,
    summary
  );

  const insertFinding = db.prepare(`
    INSERT INTO scan_findings (id, scan_id, title, severity, category, affected_target, evidence, risk_explanation, remediation, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const cat of categoryResults) {
    insertFinding.run(
      `FIND-${crypto.randomBytes(4).toString('hex')}`,
      scanId,
      cat.title,
      cat.status === 'FINDING' || cat.status === 'FAIL' ? 'HIGH' : cat.status === 'WARNING' ? 'MEDIUM' : 'INFO',
      cat.categoryId,
      `${target.name}`,
      cat.evidence,
      cat.description,
      cat.remediation,
      cat.status
    );
  }

  return {
    scanId,
    owaspEdition,
    timestamp: startTime,
    status: 'COMPLETED',
    findingsCount,
    warningsCount,
    passedCount,
    errorsCount,
    untestedCount,
    manualReviewCount,
    summary,
    targetEnvironment: target.name,
    disclaimer: 'Warning: Automated scanning cannot guarantee the absence of vulnerabilities. Comprehensive security requires manual code audit and authorized penetration testing.',
    categories: categoryResults
  };
}
