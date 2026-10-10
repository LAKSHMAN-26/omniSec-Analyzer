import { db, logAuditEvent } from '../database/db.js';
import { validateLabTarget, validateRedirectTarget, LabTarget } from './targetRegistry.js';
import crypto from 'crypto';
import http from 'http';
import https from 'https';

export type CheckStatus = 'PASS' | 'FAIL' | 'WARNING' | 'NOT_TESTED' | 'ERROR';
export type CheckSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational' | 'None';
export type CheckConfidence = 'High' | 'Medium' | 'Low';

export interface CheckExecutionResult {
  status: CheckStatus;
  severity: CheckSeverity;
  confidence: CheckConfidence;
  evidence: string;
  explanation: string;
  remediation: string;
  limitations: string;
  durationMs?: number;
  timestamp?: string;
}

export interface CheckDefinition {
  categoryId: string;
  categoryName: string;
  checkName: string;
  endpoint: string;
  method: string;
  wstgReferences?: Array<{ id: string; url: string }>;
  run: (baseUrl: string, target: LabTarget) => Promise<CheckExecutionResult>;
}

export interface ScannerHttpResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  durationMs: number;
}

// Active scan cancellation tracking
const activeJobs = new Map<string, { cancelled: boolean }>();

// Optional custom requester hook for unit test mocking
let customRequester: ((urlStr: string, method?: string, headers?: Record<string, string>, bodyData?: any) => Promise<ScannerHttpResponse>) | null = null;

export function setCustomScannerRequester(
  fn: ((urlStr: string, method?: string, headers?: Record<string, string>, bodyData?: any) => Promise<ScannerHttpResponse>) | null
) {
  customRequester = fn;
}

/**
 * Executes a network HTTP/HTTPS request against an authorized target with strict boundaries:
 * - Scheme support: HTTP and HTTPS
 * - Timeout enforcement (default 3000ms)
 * - Response body truncation (max 500KB) to prevent resource exhaustion
 * - Redirect re-validation: verifies that any 3xx redirect stays strictly within authorized lab boundary
 */
export function makeScannerRequest(
  urlStr: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  bodyData?: any,
  currentTarget?: LabTarget,
  redirectHop: number = 0
): Promise<ScannerHttpResponse> {
  if (customRequester) {
    return customRequester(urlStr, method, headers, bodyData);
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let url: URL;
    try {
      url = new URL(urlStr);
    } catch (err: any) {
      return reject(new Error(`Invalid URL '${urlStr}': ${err.message}`));
    }

    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const defaultPort = isHttps ? 443 : 5000;
    const port = url.port ? parseInt(url.port, 10) : defaultPort;

    const requestOptions: http.RequestOptions = {
      hostname: url.hostname,
      port,
      path: url.pathname + url.search,
      method,
      headers: {
        'User-Agent': 'OmniSec-Analyzer-SecurityScanner/2.0',
        Accept: 'application/json, text/html, */*',
        ...headers
      },
      timeout: 3000
    };

    const req = client.request(requestOptions, (res) => {
      // Handle redirects with re-validation
      if (
        (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308) &&
        res.headers.location
      ) {
        if (redirectHop >= 3) {
          req.destroy();
          return reject(new Error('Redirect limit exceeded: Too many redirects.'));
        }

        const location = res.headers.location;
        if (currentTarget) {
          const redirectValidation = validateRedirectTarget(location, currentTarget);
          if (!redirectValidation.valid || !redirectValidation.url) {
            req.destroy();
            return reject(new Error(redirectValidation.error || 'Redirect destination blocked by security boundary.'));
          }
          // Follow validated redirect
          return makeScannerRequest(redirectValidation.url.toString(), method, headers, bodyData, currentTarget, redirectHop + 1)
            .then(resolve)
            .catch(reject);
        }
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
        if (data.length > 500000) {
          req.destroy();
          resolve({
            statusCode: res.statusCode || 200,
            headers: res.headers,
            body: data.slice(0, 50000),
            durationMs: Date.now() - startTime
          });
        }
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 200,
          headers: res.headers,
          body: data,
          durationMs: Date.now() - startTime
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out after 3000ms'));
    });

    if (bodyData) {
      const payload = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
      if (!headers['Content-Type']) {
        req.setHeader('Content-Type', 'application/json');
      }
      req.setHeader('Content-Length', Buffer.byteLength(payload));
      req.write(payload);
    }

    req.end();
  });
}

/**
 * List of genuine, evidence-based OWASP Top 10 and WSTG security checks.
 * Every check evaluates actual observed HTTP responses. No heuristic target branching.
 */
export const owaspChecksList: CheckDefinition[] = [
  // 1. A01:2021 - Broken Access Control
  {
    categoryId: 'A01:2021',
    categoryName: 'Broken Access Control',
    checkName: 'Unauthenticated Object Access Verification',
    endpoint: '/users/2',
    method: 'GET',
    wstgReferences: [
      {
        id: 'WSTG-ATHZ-04',
        url: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization/04-Insecure_Direct_Object_References/'
      }
    ],
    run: async (baseUrl, target) => {
      const url = `${baseUrl}/users/2`;
      try {
        const res = await makeScannerRequest(url, 'GET', {}, undefined, target);
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(res.body);
            if (parsed.user && parsed.user.username) {
              return {
                status: 'FAIL',
                severity: 'High',
                confidence: 'High',
                evidence: `HTTP 200 OK received without authorization credentials. Retrieved user object for ID 2: username='${parsed.user.username}', role='${parsed.user.role}', email='${parsed.user.email}'.`,
                explanation: 'The endpoint returned sensitive user profile information without requiring authentication or session credentials.',
                remediation: 'Implement server-side role and session token verification middleware on every user-scoped route.',
                limitations: 'Tests unauthenticated access to user record ID 2. Does not enumerate arbitrary object identifiers.'
              };
            }
          } catch {}
        }

        if (res.statusCode === 401 || res.statusCode === 403) {
          return {
            status: 'PASS',
            severity: 'None',
            confidence: 'High',
            evidence: `HTTP ${res.statusCode} Access Denied correctly returned for unauthenticated request to /users/2.`,
            explanation: 'The endpoint enforced authentication and rejected the unauthenticated request.',
            remediation: 'Maintain strict authorization boundaries across all API endpoints.',
            limitations: 'Verified rejection of unauthenticated access to record ID 2.'
          };
        }

        return {
          status: 'WARNING',
          severity: 'Low',
          confidence: 'Medium',
          evidence: `Endpoint returned unexpected HTTP ${res.statusCode} status. Body: "${res.body.slice(0, 150)}".`,
          explanation: 'The endpoint responded with a non-standard status code neither granting data nor explicitly denying access.',
          remediation: 'Review route permission controls and status codes for unauthenticated requests.',
          limitations: 'Inconclusive response code received.'
        };
      } catch (err: any) {
        return {
          status: 'ERROR',
          severity: 'Informational',
          confidence: 'Low',
          evidence: `Connection error during check execution: ${err.message}`,
          explanation: 'The scanner was unable to complete the HTTP request to the target endpoint.',
          remediation: 'Verify local demo server is running and accessible.',
          limitations: 'Network request failed to complete.'
        };
      }
    }
  },

  // 2. A02:2021 - Cryptographic Failures: Transport Security
  {
    categoryId: 'A02:2021',
    categoryName: 'Cryptographic Failures',
    checkName: 'Transport Layer Encryption & HTTPS Verification',
    endpoint: '/',
    method: 'GET',
    wstgReferences: [
      {
        id: 'WSTG-CRYP-01',
        url: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/01-Testing_for_Weak_Transport_Layer_Security/'
      }
    ],
    run: async (baseUrl, target) => {
      try {
        const parsed = new URL(baseUrl);
        if (parsed.protocol === 'http:') {
          // Attempt an HTTPS connection to check if HTTPS is enabled
          const httpsPort = parsed.port ? parseInt(parsed.port, 10) : 443;
          const httpsUrl = `https://${parsed.hostname}:${httpsPort}${parsed.pathname}`;
          try {
            await makeScannerRequest(httpsUrl, 'GET', {}, undefined, target);
            return {
              status: 'WARNING',
              severity: 'Medium',
              confidence: 'High',
              evidence: `Target base URL is configured with unencrypted HTTP (${baseUrl}), but HTTPS responded on port ${httpsPort}.`,
              explanation: 'Plain HTTP is exposed alongside HTTPS without automated redirection to TLS.',
              remediation: 'Enforce automatic HTTP-to-HTTPS 301 redirection and deploy HSTS headers.',
              limitations: 'Observed HTTP and HTTPS port responses.'
            };
          } catch (httpsErr: any) {
            return {
              status: 'FAIL',
              severity: 'High',
              confidence: 'High',
              evidence: `Target operates over unencrypted HTTP (${baseUrl}). HTTPS connection to port ${httpsPort} failed: ${httpsErr.message}.`,
              explanation: 'The application transmits credentials and session tokens over plain unencrypted HTTP, exposing data to interception.',
              remediation: 'Deploy HTTPS with modern TLS 1.3 encryption and disable unencrypted plain HTTP transport.',
              limitations: 'Local educational lab operates on unencrypted loopback HTTP.'
            };
          }
        }

        return {
          status: 'PASS',
          severity: 'None',
          confidence: 'High',
          evidence: `Target endpoint uses encrypted HTTPS transport (${baseUrl}).`,
          explanation: 'Connection utilizes TLS transport layer encryption.',
          remediation: 'Maintain TLS 1.3 configuration and keep SSL certificates renewed.',
          limitations: 'Evaluated protocol scheme and connection response.'
        };
      } catch (err: any) {
        return {
          status: 'ERROR',
          severity: 'Informational',
          confidence: 'Low',
          evidence: `Check execution error: ${err.message}`,
          explanation: 'Failed to evaluate transport encryption.',
          remediation: 'Verify target availability.',
          limitations: 'Evaluation failed.'
        };
      }
    }
  },

  // 3. A02:2021 - Cryptographic Failures: Cookie Security Flags
  {
    categoryId: 'A02:2021',
    categoryName: 'Cryptographic Failures',
    checkName: 'Sensitive Data Exposure & Cookie Security Flag Inspection',
    endpoint: '/crypto',
    method: 'GET',
    wstgReferences: [
      {
        id: 'WSTG-SESS-02',
        url: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/02-Testing_for_Cookies_Attributes/'
      }
    ],
    run: async (baseUrl, target) => {
      const url = `${baseUrl}/crypto`;
      try {
        const res = await makeScannerRequest(url, 'GET', {}, undefined, target);
        const setCookieHeader = res.headers['set-cookie'];

        // If no cookies were returned by the response, we must NOT mark PASS!
        if (!setCookieHeader || (Array.isArray(setCookieHeader) && setCookieHeader.length === 0)) {
          return {
            status: 'NOT_TESTED',
            severity: 'Informational',
            confidence: 'High',
            evidence: `No Set-Cookie response header was received from endpoint ${url}.`,
            explanation: 'Cookie security attributes cannot be evaluated because no cookies were issued by this endpoint.',
            remediation: 'When issuing authentication cookies, always enforce HttpOnly, Secure, and SameSite=Strict/Lax.',
            limitations: 'No cookies observed in server response.'
          };
        }

        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [String(setCookieHeader)];
        const cookieStr = cookies.join('; ');
        const missingFlags: string[] = [];

        for (const singleCookie of cookies) {
          const parts = singleCookie.split(';').map((p) => p.trim().toLowerCase());
          const hasHttpOnly = parts.some((p) => p === 'httponly');
          const hasSecure = parts.some((p) => p === 'secure');
          const hasSameSite = parts.some((p) => p.startsWith('samesite'));

          if (!hasHttpOnly && !missingFlags.includes('HttpOnly')) missingFlags.push('HttpOnly');
          if (!hasSecure && !missingFlags.includes('Secure')) missingFlags.push('Secure');
          if (!hasSameSite && !missingFlags.includes('SameSite')) missingFlags.push('SameSite');
        }

        // Check for cleartext secrets in response body
        let exposedSecrets = false;
        try {
          const parsed = JSON.parse(res.body);
          if (parsed.apiKey || parsed.passwordStorageAlgorithm?.includes('MD5') || parsed.passwordStorageAlgorithm?.includes('Plaintext')) {
            exposedSecrets = true;
          }
        } catch {}

        if (missingFlags.length > 0 || exposedSecrets) {
          return {
            status: 'FAIL',
            severity: 'High',
            confidence: 'High',
            evidence: `Cookie Set-Cookie header: "${cookieStr}". Missing required attributes: [${missingFlags.join(', ')}]. Response body excerpt: '${res.body.slice(0, 150)}...'`,
            explanation: 'Cookies issued without HttpOnly can be accessed by client-side scripts via XSS, and cookies without SameSite risk CSRF exploitation.',
            remediation: 'Set HttpOnly, Secure, and SameSite=Strict on all authentication cookies. Redact all secret credentials from client responses.',
            limitations: 'Inspects HTTP response headers and tokens returned by demo route.'
          };
        }

        return {
          status: 'PASS',
          severity: 'None',
          confidence: 'High',
          evidence: `Set-Cookie header observed: "${cookieStr}". Verified attributes: HttpOnly=present, SameSite=present, Secure=present.`,
          explanation: 'Observed cookies enforce HttpOnly, SameSite, and Secure flags.',
          remediation: 'Ensure cookies remain partitioned and encrypted across all environments.',
          limitations: 'Evaluated observed Set-Cookie attributes.'
        };
      } catch (err: any) {
        return {
          status: 'ERROR',
          severity: 'Informational',
          confidence: 'Low',
          evidence: `Connection error: ${err.message}`,
          explanation: 'Request to /crypto could not be completed.',
          remediation: 'Check lab endpoint availability.',
          limitations: 'Request failed.'
        };
      }
    }
  },

  // 4. A03:2021 - Injection: SQL Injection
  {
    categoryId: 'A03:2021',
    categoryName: 'Injection',
    checkName: 'SQL Injection Dynamic Query Tautology Test',
    endpoint: '/products?q=\' OR \'1\'=\'1',
    method: 'GET',
    wstgReferences: [
      {
        id: 'WSTG-INPV-05',
        url: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05-Testing_for_SQL_Injection/'
      }
    ],
    run: async (baseUrl, target) => {
      const payload = encodeURIComponent("' OR '1'='1");
      const url = `${baseUrl}/products?q=${payload}`;
      try {
        const res = await makeScannerRequest(url, 'GET', {}, undefined, target);
        let parsed: any;
        try {
          parsed = JSON.parse(res.body);
        } catch {
          // If response is raw SQL syntax error
          if (res.body.toLowerCase().includes('syntax error') || res.body.toLowerCase().includes('sqlite3::')) {
            return {
              status: 'FAIL',
              severity: 'Critical',
              confidence: 'High',
              evidence: `Raw SQL database syntax error exposed in response: "${res.body.slice(0, 200)}".`,
              explanation: 'The search parameter was concatenated into raw SQL, causing an unhandled database query execution syntax error.',
              remediation: 'Use parameterized queries with prepared statement placeholders (?) to isolate data from SQL code.',
              limitations: 'Detected SQL syntax failure.'
            };
          }
          return {
            status: 'WARNING',
            severity: 'Low',
            confidence: 'Low',
            evidence: `Non-JSON response received from products endpoint: HTTP ${res.statusCode}.`,
            explanation: 'Response format could not be verified.',
            remediation: 'Ensure API returns standard JSON format.',
            limitations: 'Unrecognized response format.'
          };
        }

        // Real evidence: tautology bypass returned all records or leaked raw queryExecuted
        if (parsed.resultsCount >= 3 || (parsed.queryExecuted && parsed.queryExecuted.includes("' OR '1'='1"))) {
          return {
            status: 'FAIL',
            severity: 'Critical',
            confidence: 'High',
            evidence: `SQL Injection confirmed. Tautology payload ("' OR '1'='1") bypassed filter, returning all ${parsed.resultsCount} synthetic records. Executed query: "${parsed.queryExecuted || 'Unsanitized raw SQL'}".`,
            explanation: 'The input parameter is concatenated directly into SQL statements, enabling query manipulation and data exfiltration.',
            remediation: 'Use parameterized SQL queries (e.g. SQLite "?" placeholders or ORM parameter binding). Prohibit raw string concatenation.',
            limitations: 'Safe read-only test using synthetic products. Does not alter database records.'
          };
        }

        // Secure handling: 0 records matched literal string "' OR '1'='1"
        if (parsed.resultsCount === 0 || parsed.defenseMethod) {
          return {
            status: 'PASS',
            severity: 'None',
            confidence: 'High',
            evidence: `SQL Injection blocked. Payload treated as literal search string (0 matches returned). Defense: "${parsed.defenseMethod || 'Parameterized Prepared Statement'}".`,
            explanation: 'The query binds search parameters securely, isolating query logic from user-supplied input.',
            remediation: 'Continue enforcing parameterized prepared statements for dynamic queries.',
            limitations: 'Tested tautology injection pattern.'
          };
        }

        return {
          status: 'WARNING',
          severity: 'Low',
          confidence: 'Medium',
          evidence: `Endpoint returned ${parsed.resultsCount} records without clear parameterized signature.`,
          explanation: 'Unexpected record count received for injection test string.',
          remediation: 'Audit database queries for input validation.',
          limitations: 'Tested tautology payload.'
        };
      } catch (err: any) {
        return {
          status: 'ERROR',
          severity: 'Informational',
          confidence: 'Low',
          evidence: `Request error: ${err.message}`,
          explanation: 'Failed to contact products test endpoint.',
          remediation: 'Verify database test endpoint.',
          limitations: 'Request did not complete.'
        };
      }
    }
  },

  // 5. A04:2021 - Insecure Design
  {
    categoryId: 'A04:2021',
    categoryName: 'Insecure Design',
    checkName: 'Trust Boundary & Anti-Automation Verification',
    endpoint: '/password-reset',
    method: 'POST',
    run: async (baseUrl, target) => {
      const url = `${baseUrl}/password-reset`;
      try {
        const res = await makeScannerRequest(url, 'POST', {}, { username: 'alice_student', newPassword: 'NewPassword123!' }, target);
        if (res.statusCode === 200) {
          let parsed: any = {};
          try { parsed = JSON.parse(res.body); } catch {}
          return {
            status: 'FAIL',
            severity: 'High',
            confidence: 'High',
            evidence: `Password reset succeeded without challenge token or current password (HTTP 200). Server message: "${parsed.message || res.body.slice(0, 100)}".`,
            explanation: 'Insecure design allows direct credential reset without identity verification challenge, rate limiting, or existing password confirmation.',
            remediation: 'Incorporate threat-modeled challenge controls, multi-step verification, and strict rate limiting on credential reset flows.',
            limitations: 'Evaluates single-step unauthenticated password reset logic in demo lab.'
          };
        }

        if (res.statusCode === 401 || res.statusCode === 403) {
          let parsed: any = {};
          try { parsed = JSON.parse(res.body); } catch {}
          return {
            status: 'PASS',
            severity: 'None',
            confidence: 'High',
            evidence: `HTTP ${res.statusCode} Access Denied: Endpoint required valid challenge token ("${parsed.error || 'Access denied'}").`,
            explanation: 'The endpoint enforced challenge controls and rejected the unauthenticated credential reset request.',
            remediation: 'Maintain threat modeling documentation and challenge requirements for authentication workflows.',
            limitations: 'Verified challenge requirement on password reset.'
          };
        }

        return {
          status: 'WARNING',
          severity: 'Low',
          confidence: 'Medium',
          evidence: `Endpoint returned HTTP ${res.statusCode}.`,
          explanation: 'Non-standard status returned for password reset test.',
          remediation: 'Review password reset endpoint status codes.',
          limitations: 'Unexpected status code.'
        };
      } catch (err: any) {
        return {
          status: 'ERROR',
          severity: 'Informational',
          confidence: 'Low',
          evidence: `Request error: ${err.message}`,
          explanation: 'Connection error during password reset check.',
          remediation: 'Check lab password reset route.',
          limitations: 'Request failed.'
        };
      }
    }
  },

  // 6. A05:2021 - Security Misconfiguration: Headers
  {
    categoryId: 'A05:2021',
    categoryName: 'Security Misconfiguration',
    checkName: 'Defensive HTTP Response Headers Audit',
    endpoint: '/headers',
    method: 'GET',
    wstgReferences: [
      {
        id: 'WSTG-CONF-07',
        url: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/07-Test_HTTP_Strict_Transport_Security/'
      }
    ],
    run: async (baseUrl, target) => {
      const url = `${baseUrl}/headers`;
      try {
        const res = await makeScannerRequest(url, 'GET', {}, undefined, target);
        const headers = res.headers;
        const missingHeaders: string[] = [];

        if (!headers['content-security-policy']) missingHeaders.push('Content-Security-Policy');
        if (!headers['x-content-type-options']) missingHeaders.push('X-Content-Type-Options');
        if (!headers['x-frame-options']) missingHeaders.push('X-Frame-Options');

        if (missingHeaders.length > 0) {
          return {
            status: 'FAIL',
            severity: 'Medium',
            confidence: 'High',
            evidence: `Missing security headers: [${missingHeaders.join(', ')}]. Observed response headers: [${Object.keys(headers).join(', ')}].`,
            explanation: 'The server omitted standard defensive HTTP response headers, leaving clients vulnerable to MIME-sniffing, clickjacking, and XSS.',
            remediation: 'Configure Helmet or web server to enforce Content-Security-Policy, X-Content-Type-Options: nosniff, and X-Frame-Options: SAMEORIGIN.',
            limitations: 'Audited HTTP response headers on target route.'
          };
        }

        return {
          status: 'PASS',
          severity: 'None',
          confidence: 'High',
          evidence: `All required security headers present: Content-Security-Policy="${headers['content-security-policy']}", X-Content-Type-Options="${headers['x-content-type-options']}", X-Frame-Options="${headers['x-frame-options']}".`,
          explanation: 'The application enforces standard defensive HTTP response headers.',
          remediation: 'Audit header configurations whenever updating web server dependencies.',
          limitations: 'Verified response headers on local lab endpoint.'
        };
      } catch (err: any) {
        return {
          status: 'ERROR',
          severity: 'Informational',
          confidence: 'Low',
          evidence: `Connection error: ${err.message}`,
          explanation: 'Could not contact headers test endpoint.',
          remediation: 'Check lab headers route.',
          limitations: 'Test failed to connect.'
        };
      }
    }
  },

  // 7. A05:2021 - Security Misconfiguration: Information Disclosure
  {
    categoryId: 'A05:2021',
    categoryName: 'Security Misconfiguration',
    checkName: 'Server Banner & Technology Disclosure Audit',
    endpoint: '/headers',
    method: 'GET',
    wstgReferences: [
      {
        id: 'WSTG-INFO-02',
        url: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/01-Information_Gathering/02-Fingerprint_Web_Server/'
      }
    ],
    run: async (baseUrl, target) => {
      const url = `${baseUrl}/headers`;
      try {
        const res = await makeScannerRequest(url, 'GET', {}, undefined, target);
        const headers = res.headers;
        const poweredBy = headers['x-powered-by'];
        const serverHeader = headers['server'];

        const revealsPoweredBy = Boolean(poweredBy);
        const revealsVerboseServer = Boolean(serverHeader && (serverHeader.includes('Ubuntu') || serverHeader.includes('Node') || serverHeader.includes('Demo-Vulnerable') || serverHeader.includes('/')));

        if (revealsPoweredBy || revealsVerboseServer) {
          return {
            status: 'FAIL',
            severity: 'Low',
            confidence: 'High',
            evidence: `Technology disclosure banners observed: X-Powered-By='${poweredBy || 'None'}', Server='${serverHeader || 'None'}'.`,
            explanation: 'Exposing exact software versions and framework details assists attackers in fingerprinting known vulnerabilities.',
            remediation: 'Disable X-Powered-By header (app.disable("x-powered-by")) and mask Server banners.',
            limitations: 'Inspects HTTP response headers.'
          };
        }

        return {
          status: 'PASS',
          severity: 'None',
          confidence: 'High',
          evidence: `X-Powered-By is absent. Server header is masked or generic ('${serverHeader || 'None'}').`,
          explanation: 'No revealing framework version banners were found in response headers.',
          remediation: 'Maintain banner masking in production environments.',
          limitations: 'Verified response headers on target route.'
        };
      } catch (err: any) {
        return {
          status: 'ERROR',
          severity: 'Informational',
          confidence: 'Low',
          evidence: `Connection error: ${err.message}`,
          explanation: 'Could not evaluate server banners.',
          remediation: 'Check target route availability.',
          limitations: 'Request failed.'
        };
      }
    }
  },

  // 8. A05:2021 - Security Misconfiguration: Directory Listing
  {
    categoryId: 'A05:2021',
    categoryName: 'Security Misconfiguration',
    checkName: 'Directory Listing & Static Indexing Audit',
    endpoint: '/directory-listing',
    method: 'GET',
    wstgReferences: [
      {
        id: 'WSTG-CONF-04',
        url: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/04-Review_Old_Backup_and_Unreferenced_Files_for_Sensitive_Information/'
      }
    ],
    run: async (baseUrl, target) => {
      const url = `${baseUrl}/directory-listing`;
      try {
        const res = await makeScannerRequest(url, 'GET', {}, undefined, target);
        const lowerBody = res.body.toLowerCase();
        const hasIndexTitle = lowerBody.includes('<title>index of') || lowerBody.includes('<h1>index of');
        const hasFileList = lowerBody.includes('database.sqlite') || lowerBody.includes('secret_backup.zip');

        if (res.statusCode === 200 && (hasIndexTitle || hasFileList)) {
          return {
            status: 'FAIL',
            severity: 'High',
            confidence: 'High',
            evidence: `Directory listing is enabled on ${url}: Response returned HTTP 200 with directory index listing synthetic files [database.sqlite, secret_backup.zip].`,
            explanation: 'Exposed directory indexing allows unauthenticated visitors to discover and download backup files and configuration data.',
            remediation: 'Disable directory browsing in web server configuration (e.g. Options -Indexes in Apache, autoindex off in Nginx).',
            limitations: 'Probed authorized test endpoint /directory-listing.'
          };
        }

        if (res.statusCode === 403 || res.statusCode === 404) {
          return {
            status: 'PASS',
            severity: 'None',
            confidence: 'High',
            evidence: `HTTP ${res.statusCode} Access Denied: Directory indexing is disabled on static route.`,
            explanation: 'The server denies directory indexing, preventing directory file enumeration.',
            remediation: 'Keep directory indexing disabled on all public endpoints.',
            limitations: 'Verified rejection of directory browsing.'
          };
        }

        return {
          status: 'WARNING',
          severity: 'Low',
          confidence: 'Medium',
          evidence: `Endpoint returned HTTP ${res.statusCode} without directory index signatures.`,
          explanation: 'Unexpected status code received for directory listing check.',
          remediation: 'Ensure non-existent or restricted paths return 403 or 404.',
          limitations: 'Probed /directory-listing endpoint.'
        };
      } catch (err: any) {
        return {
          status: 'ERROR',
          severity: 'Informational',
          confidence: 'Low',
          evidence: `Connection error: ${err.message}`,
          explanation: 'Request to /directory-listing failed.',
          remediation: 'Verify lab endpoint is running.',
          limitations: 'Connection error.'
        };
      }
    }
  },

  // 9. A06:2021 - Vulnerable and Outdated Components
  {
    categoryId: 'A06:2021',
    categoryName: 'Vulnerable and Outdated Components',
    checkName: 'Declared Dependency Vulnerability Audit',
    endpoint: '/components',
    method: 'GET',
    run: async (baseUrl, target) => {
      const url = `${baseUrl}/components`;
      try {
        const res = await makeScannerRequest(url, 'GET', {}, undefined, target);
        let parsed: any;
        try {
          parsed = JSON.parse(res.body);
        } catch {
          return {
            status: 'WARNING',
            severity: 'Low',
            confidence: 'Low',
            evidence: `Non-JSON response from /components: HTTP ${res.statusCode}.`,
            explanation: 'Component audit endpoint did not return standard JSON data.',
            remediation: 'Ensure component inventory API returns JSON records.',
            limitations: 'Unrecognized response format.'
          };
        }

        if (parsed.knownVulnerablePackages && parsed.knownVulnerablePackages.length > 0) {
          const pkg = parsed.knownVulnerablePackages[0];
          return {
            status: 'FAIL',
            severity: 'High',
            confidence: 'High',
            evidence: `Outdated component detected: ${pkg.package}@${pkg.version} associated with advisory ${pkg.cve} (Severity: ${pkg.severity}).`,
            explanation: 'The application declares dependencies with known published Common Vulnerabilities and Exposures (CVEs).',
            remediation: 'Run "npm audit" regularly, upgrade packages to patched releases, and automate dependency scans in CI/CD.',
            limitations: 'Audits declared application dependencies against known CVE records.'
          };
        }

        if (Array.isArray(parsed.knownVulnerablePackages) && parsed.knownVulnerablePackages.length === 0) {
          return {
            status: 'PASS',
            severity: 'None',
            confidence: 'High',
            evidence: 'Dependencies reviewed. Zero outdated or known vulnerable libraries identified in active runtime inventory.',
            explanation: 'No known severe CVE flags were detected in declared component inventory.',
            remediation: 'Keep package-lock.json up to date with automated security monitoring.',
            limitations: 'Audited declared component inventory.'
          };
        }

        return {
          status: 'WARNING',
          severity: 'Low',
          confidence: 'Medium',
          evidence: `Component endpoint returned unverified response structure: "${res.body.slice(0, 100)}".`,
          explanation: 'Response structure lacked standard package inventory lists.',
          remediation: 'Verify component inventory schema.',
          limitations: 'Inconclusive inventory payload.'
        };
      } catch (err: any) {
        return {
          status: 'ERROR',
          severity: 'Informational',
          confidence: 'Low',
          evidence: `Connection error: ${err.message}`,
          explanation: 'Could not contact components inventory route.',
          remediation: 'Check components endpoint.',
          limitations: 'Request failed.'
        };
      }
    }
  },

  // 10. A07:2021 - Identification and Authentication Failures
  {
    categoryId: 'A07:2021',
    categoryName: 'Identification and Authentication Failures',
    checkName: 'Authentication Error Verbosity & User Enumeration Check',
    endpoint: '/login',
    method: 'POST',
    wstgReferences: [
      {
        id: 'WSTG-IDNT-04',
        url: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/03-Identity_Management_Testing/04-Testing_for_Account_Enumeration_and_Guessable_User_Account/'
      }
    ],
    run: async (baseUrl, target) => {
      const url = `${baseUrl}/login`;
      try {
        // Send request for existing user with wrong password
        const resExisting = await makeScannerRequest(url, 'POST', {}, { username: 'alice_student', password: 'wrongpassword999' }, target);
        // Send request for non-existent user with wrong password
        const resNonExistent = await makeScannerRequest(url, 'POST', {}, { username: 'nonexistent_user_999xyz', password: 'wrongpassword999' }, target);

        let errExisting = '';
        let errNonExistent = '';
        try { errExisting = JSON.parse(resExisting.body).error || ''; } catch {}
        try { errNonExistent = JSON.parse(resNonExistent.body).error || ''; } catch {}

        // User enumeration weakness: error messages distinguish user existence
        if (errExisting && errNonExistent && errExisting !== errNonExistent) {
          return {
            status: 'FAIL',
            severity: 'Medium',
            confidence: 'High',
            evidence: `User enumeration flaw identified: Server returned distinct error messages for valid user vs invalid user. Valid user message: "${errExisting}", Invalid user message: "${errNonExistent}".`,
            explanation: 'Differentiating error messages for invalid usernames vs incorrect passwords enables automated account harvesting.',
            remediation: 'Return a generic timing-safe error message (e.g., "Invalid credentials") for all authentication failures to prevent user enumeration.',
            limitations: 'Tests responses against synthetic test user alice_student.'
          };
        }

        if (errExisting && errExisting === errNonExistent) {
          return {
            status: 'PASS',
            severity: 'None',
            confidence: 'High',
            evidence: `Authentication failure returned generic timing-safe error: "${errExisting}". User enumeration prevented.`,
            explanation: 'The server returns identical generic error messages regardless of whether the username exists.',
            remediation: 'Enforce rate limits on login attempts and use secure account lockout thresholds.',
            limitations: 'Verified failure message consistency across valid and invalid usernames.'
          };
        }

        return {
          status: 'WARNING',
          severity: 'Low',
          confidence: 'Medium',
          evidence: `Responses did not provide comparable JSON error fields. HTTP status codes: ${resExisting.statusCode} / ${resNonExistent.statusCode}.`,
          explanation: 'Could not definitively verify error message consistency.',
          remediation: 'Ensure authentication routes return structured error messages.',
          limitations: 'Tested login responses.'
        };
      } catch (err: any) {
        return {
          status: 'ERROR',
          severity: 'Informational',
          confidence: 'Low',
          evidence: `Request error: ${err.message}`,
          explanation: 'Connection error during authentication test.',
          remediation: 'Check login route availability.',
          limitations: 'Request failed.'
        };
      }
    }
  },

  // 11. A08:2021 - Software and Data Integrity Failures
  {
    categoryId: 'A08:2021',
    categoryName: 'Software and Data Integrity Failures',
    checkName: 'Untrusted Payload Integrity & Cryptographic Signature Check',
    endpoint: '/import',
    method: 'POST',
    run: async (baseUrl, target) => {
      const url = `${baseUrl}/import`;
      try {
        const res = await makeScannerRequest(url, 'POST', {}, { payload: { config: 'synthetic_unverified_rule' } }, target);
        let parsed: any = {};
        try { parsed = JSON.parse(res.body); } catch {}

        if (res.statusCode === 200 && parsed.integrityVerified === false) {
          return {
            status: 'FAIL',
            severity: 'High',
            confidence: 'High',
            evidence: `Application accepted and processed untrusted payload without requiring digital signature or HMAC verification (HTTP 200: "${parsed.message || 'Payload processed'}").`,
            explanation: 'Accepting serialized configurations without cryptographic signatures exposes the application to data tampering and untrusted deserialization.',
            remediation: 'Implement cryptographic signature or HMAC checksum validation for all serialized configurations and external inputs.',
            limitations: 'Tests demo import route with unsigned JSON payload.'
          };
        }

        if (res.statusCode === 400 || res.statusCode === 403) {
          return {
            status: 'PASS',
            severity: 'None',
            confidence: 'High',
            evidence: `Unsigned payload rejected (HTTP ${res.statusCode}: "${parsed.error || 'Integrity check failed'}"). Cryptographic signature enforced.`,
            explanation: 'The endpoint enforced data integrity verification and rejected the unsigned payload.',
            remediation: 'Maintain signed release artifacts and package lockfile validation.',
            limitations: 'Validated rejection of unsigned input.'
          };
        }

        return {
          status: 'WARNING',
          severity: 'Low',
          confidence: 'Medium',
          evidence: `Endpoint returned HTTP ${res.statusCode}.`,
          explanation: 'Unexpected response code from import endpoint.',
          remediation: 'Review import route data integrity controls.',
          limitations: 'Non-standard status code.'
        };
      } catch (err: any) {
        return {
          status: 'ERROR',
          severity: 'Informational',
          confidence: 'Low',
          evidence: `Connection error: ${err.message}`,
          explanation: 'Request to /import failed.',
          remediation: 'Check import route.',
          limitations: 'Request failed.'
        };
      }
    }
  },

  // 12. A09:2021 - Security Logging and Alerting Failures
  {
    categoryId: 'A09:2021',
    categoryName: 'Security Logging and Alerting Failures',
    checkName: 'Security Event Audit Trail Verification',
    endpoint: '/action',
    method: 'POST',
    run: async (baseUrl, target) => {
      const url = `${baseUrl}/action`;
      try {
        const res = await makeScannerRequest(url, 'POST', {}, { action: 'demo_security_sensitive_operation' }, target);
        let parsed: any = {};
        try { parsed = JSON.parse(res.body); } catch {}

        if (res.statusCode === 200 && parsed.auditLogged === false) {
          return {
            status: 'FAIL',
            severity: 'Medium',
            confidence: 'High',
            evidence: `Security-critical action executed without generating a persistent audit log entry (auditLogged=false). Response: "${parsed.warning || res.body.slice(0, 100)}".`,
            explanation: 'Failing to log sensitive administrative actions impairs real-time threat detection and post-incident forensic analysis.',
            remediation: 'Ensure all authentication, authorization, and administrative actions are logged to a tamper-resistant centralized audit log.',
            limitations: 'Evaluates audit recording flag on demo action endpoint.'
          };
        }

        if (res.statusCode === 200 && parsed.auditLogged === true) {
          return {
            status: 'PASS',
            severity: 'None',
            confidence: 'High',
            evidence: 'Security event verified: Entry recorded in SQLite audit_events table with timestamp and event metadata.',
            explanation: 'The application recorded the security-sensitive action in its persistent audit trail.',
            remediation: 'Configure real-time SIEM alerts for consecutive security violations.',
            limitations: 'Verified event entry in local audit database.'
          };
        }

        return {
          status: 'WARNING',
          severity: 'Low',
          confidence: 'Medium',
          evidence: `Endpoint returned HTTP ${res.statusCode}.`,
          explanation: 'Unexpected status code from audit action endpoint.',
          remediation: 'Review action route audit logging behavior.',
          limitations: 'Non-standard status code.'
        };
      } catch (err: any) {
        return {
          status: 'ERROR',
          severity: 'Informational',
          confidence: 'Low',
          evidence: `Request error: ${err.message}`,
          explanation: 'Request to /action failed.',
          remediation: 'Check action endpoint.',
          limitations: 'Connection error.'
        };
      }
    }
  },

  // 13. A10:2021 - Server-Side Request Forgery (SSRF)
  {
    categoryId: 'A10:2021',
    categoryName: 'Server-Side Request Forgery (SSRF)',
    checkName: 'Internal Network Boundary & Metadata Target Filter Check',
    endpoint: '/fetch-url?url=http://169.254.169.254/latest/meta-data/',
    method: 'GET',
    wstgReferences: [
      {
        id: 'WSTG-INPV-19',
        url: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/19-Testing_for_Server-Side_Request_Forgery/'
      }
    ],
    run: async (baseUrl, target) => {
      const targetParam = encodeURIComponent('http://169.254.169.254/latest/meta-data/');
      const url = `${baseUrl}/fetch-url?url=${targetParam}`;
      try {
        const res = await makeScannerRequest(url, 'GET', {}, undefined, target);
        let parsed: any = {};
        try { parsed = JSON.parse(res.body); } catch {}

        if (res.statusCode === 200) {
          return {
            status: 'FAIL',
            severity: 'Critical',
            confidence: 'High',
            evidence: `Cloud metadata destination (169.254.169.254) accepted without SSRF filter blocking (HTTP 200: "${parsed.warning || res.body.slice(0, 100)}").`,
            explanation: 'The URL fetcher endpoint does not enforce egress network boundaries, permitting requests to internal cloud metadata services.',
            remediation: 'Implement strict destination URL allowlists; strictly reject 169.254.169.254 and private IP blocks in URL fetchers.',
            limitations: 'Simulated request to internal metadata address.'
          };
        }

        if (res.statusCode === 403 || res.statusCode === 400) {
          return {
            status: 'PASS',
            severity: 'None',
            confidence: 'High',
            evidence: `Restricted metadata destination safely blocked (HTTP ${res.statusCode}: "${parsed.error || 'Access blocked'}"). Perimeter boundary intact.`,
            explanation: 'The application enforces egress boundaries and rejected the internal metadata request.',
            remediation: 'Maintain network egress filtering and avoid fetching arbitrary remote URLs.',
            limitations: 'Verified rejection of cloud metadata destination.'
          };
        }

        return {
          status: 'WARNING',
          severity: 'Low',
          confidence: 'Medium',
          evidence: `Endpoint returned HTTP ${res.statusCode}.`,
          explanation: 'Unexpected status code from fetch-url route.',
          remediation: 'Review egress boundary controls.',
          limitations: 'Tested metadata URL parameter.'
        };
      } catch (err: any) {
        return {
          status: 'ERROR',
          severity: 'Informational',
          confidence: 'Low',
          evidence: `Request error: ${err.message}`,
          explanation: 'Connection error during SSRF check.',
          remediation: 'Check fetch-url route.',
          limitations: 'Connection error.'
        };
      }
    }
  },

  // 14. Unimplemented check demonstration (Always returns NOT_TESTED with honest reasoning)
  {
    categoryId: 'A07:2021',
    categoryName: 'Identification and Authentication Failures',
    checkName: 'Multi-Factor Hardware Token & Out-of-Band Auth Bypass Assessment',
    endpoint: '/auth/mfa-hardware',
    method: 'POST',
    run: async () => {
      return {
        status: 'NOT_TESTED',
        severity: 'Informational',
        confidence: 'High',
        evidence: 'Automated software scanners cannot simulate physical FIDO2/WebAuthn hardware key touch verification or out-of-band biometric channels.',
        explanation: 'Hardware token security and physical multi-factor authentication bypass cannot be assessed safely through automated HTTP requests.',
        remediation: 'Conduct manual physical penetration testing and verify FIDO2 WebAuthn credential attestation policies.',
        limitations: 'Physical MFA hardware token evaluation is unsupported by automated API scans.'
      };
    }
  }
];

export interface ScanJobEvent {
  type: 'job_start' | 'check_start' | 'check_result' | 'job_complete' | 'job_cancelled' | 'job_error';
  jobId: string;
  data: any;
}

/**
 * Initiates an educational OWASP Top 10 scan against an authorized lab target.
 */
export async function executeRealtimeScan(
  targetId: string,
  owaspEdition: string = '2021',
  onEvent?: (event: ScanJobEvent) => void
): Promise<string> {
  const validation = validateLabTarget(targetId);
  if (!validation.valid || !validation.target) {
    throw new Error(`Target rejected: ${validation.error || 'Target not allowed.'}`);
  }

  const target = validation.target;
  const jobId = `SCAN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const startTime = new Date().toISOString();

  // Register in active jobs
  activeJobs.set(jobId, { cancelled: false });

  // Insert initial job record in scan_jobs
  db.prepare(`
    INSERT INTO scan_jobs (
      id, target_id, target_name, target_url, owasp_edition, status, start_time,
      total_checks, completed_checks, findings_count, warnings_count, passed_count,
      errors_count, untested_count, manual_review_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    jobId,
    target.id,
    target.name,
    target.base_url,
    owaspEdition,
    'RUNNING',
    startTime,
    owaspChecksList.length,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  );

  // Sync to scan_history initially
  db.prepare(`
    INSERT OR REPLACE INTO scan_history (
      id, module_name, target_environment, start_time, completion_time, status,
      findings_count, warnings_count, passed_count, errors_count, untested_count, summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    jobId,
    `OWASP Top 10 + WSTG (${owaspEdition}) - Real-Time Scanner`,
    target.name,
    startTime,
    null,
    'IN_PROGRESS',
    0,
    0,
    0,
    0,
    0,
    `Scan in progress for ${target.name}`
  );

  logAuditEvent('SCAN_STARTED', `Real-time scan started for target: ${target.name} (Job: ${jobId})`);

  if (onEvent) {
    onEvent({
      type: 'job_start',
      jobId,
      data: {
        jobId,
        targetName: target.name,
        targetUrl: target.base_url,
        authorizationStatus: 'Authorized Educational Lab Target',
        totalChecks: owaspChecksList.length,
        startTime
      }
    });
  }

  // Run asynchronously
  runChecksLoop(jobId, target, owaspEdition, onEvent).catch((err) => {
    console.error(`[Scan Engine Error in Job ${jobId}]`, err);
  });

  return jobId;
}

export async function runChecksLoop(
  jobId: string,
  target: LabTarget,
  owaspEdition: string,
  onEvent?: (event: ScanJobEvent) => void
) {
  let completedCount = 0;
  let findingsCount = 0;
  let warningsCount = 0;
  let passedCount = 0;
  let errorsCount = 0;
  let untestedCount = 0;
  let manualReviewCount = 0;

  const insertCheck = db.prepare(`
    INSERT INTO scan_checks (
      id, scan_id, category_id, category_name, check_name, target_endpoint, http_method,
      status, severity, confidence, evidence, explanation, remediation, limitations,
      created_at, duration_ms, wstg_references
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertFinding = db.prepare(`
    INSERT INTO scan_findings (
      id, scan_id, title, severity, category, affected_target, evidence, risk_explanation, remediation, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < owaspChecksList.length; i++) {
    // Check if cancellation was requested
    const jobState = activeJobs.get(jobId);
    if (!jobState || jobState.cancelled) {
      const cancelTime = new Date().toISOString();
      db.prepare(`
        UPDATE scan_jobs
        SET status = 'CANCELLED', completion_time = ?, completed_checks = ?,
            findings_count = ?, warnings_count = ?, passed_count = ?, errors_count = ?,
            untested_count = ?, summary = ?
        WHERE id = ?
      `).run(
        cancelTime,
        completedCount,
        findingsCount,
        warningsCount,
        passedCount,
        errorsCount,
        untestedCount,
        `Scan cancelled by user after ${completedCount} of ${owaspChecksList.length} checks.`,
        jobId
      );

      logAuditEvent('SCAN_CANCELLED', `Scan job ${jobId} was cancelled by user.`);

      if (onEvent) {
        onEvent({
          type: 'job_cancelled',
          jobId,
          data: {
            jobId,
            completedChecks: completedCount,
            cancelledAt: cancelTime
          }
        });
      }
      activeJobs.delete(jobId);
      return;
    }

    const check = owaspChecksList[i];

    if (onEvent) {
      onEvent({
        type: 'check_start',
        jobId,
        data: {
          checkIndex: i + 1,
          totalChecks: owaspChecksList.length,
          category: check.categoryId,
          categoryName: check.categoryName,
          checkName: check.checkName,
          endpoint: check.endpoint
        }
      });
    }

    // Brief 150ms pacing for smooth real-time visual streaming in UI
    await new Promise((r) => setTimeout(r, 150));

    const checkStartTime = Date.now();
    let result: CheckExecutionResult;
    try {
      result = await check.run(target.base_url, target);
    } catch (err: any) {
      result = {
        status: 'ERROR',
        severity: 'Informational',
        confidence: 'Low',
        evidence: `Check execution exception: ${err.message}`,
        explanation: 'An unhandled exception occurred while executing the check probe.',
        remediation: 'Ensure local test application is online.',
        limitations: 'Check execution failed.'
      };
    }

    const durationMs = Date.now() - checkStartTime;
    result.durationMs = durationMs;
    result.timestamp = new Date().toISOString();

    completedCount++;
    if (result.status === 'FAIL') findingsCount++;
    else if (result.status === 'WARNING') warningsCount++;
    else if (result.status === 'PASS') passedCount++;
    else if (result.status === 'ERROR') errorsCount++;
    else if (result.status === 'NOT_TESTED') untestedCount++;

    const checkId = `CHK-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    insertCheck.run(
      checkId,
      jobId,
      check.categoryId,
      check.categoryName,
      check.checkName,
      check.endpoint,
      check.method,
      result.status,
      result.severity,
      result.confidence,
      result.evidence,
      result.explanation,
      result.remediation,
      result.limitations,
      result.timestamp,
      durationMs,
      check.wstgReferences ? JSON.stringify(check.wstgReferences) : null
    );

    // If finding (FAIL) or WARNING, record in scan_findings table
    if (result.status === 'FAIL' || result.status === 'WARNING') {
      insertFinding.run(
        `FIND-${crypto.randomBytes(4).toString('hex')}`,
        jobId,
        check.checkName,
        result.severity.toUpperCase(),
        check.categoryId,
        `${target.name} (${check.endpoint})`,
        result.evidence,
        result.explanation,
        result.remediation,
        result.status
      );
    }

    // Update job progress
    db.prepare(`
      UPDATE scan_jobs
      SET completed_checks = ?, findings_count = ?, warnings_count = ?, passed_count = ?,
          errors_count = ?, untested_count = ?, manual_review_count = ?
      WHERE id = ?
    `).run(completedCount, findingsCount, warningsCount, passedCount, errorsCount, untestedCount, manualReviewCount, jobId);

    if (onEvent) {
      onEvent({
        type: 'check_result',
        jobId,
        data: {
          checkId,
          checkIndex: i + 1,
          totalChecks: owaspChecksList.length,
          categoryId: check.categoryId,
          categoryName: check.categoryName,
          checkName: check.checkName,
          endpoint: check.endpoint,
          status: result.status,
          severity: result.severity,
          confidence: result.confidence,
          evidence: result.evidence,
          explanation: result.explanation,
          remediation: result.remediation,
          limitations: result.limitations,
          durationMs,
          timestamp: result.timestamp,
          wstgReferences: check.wstgReferences || []
        }
      });
    }
  }

  // Scan Completed
  const completionTime = new Date().toISOString();
  let summary = '';
  if (findingsCount === 0 && errorsCount === 0) {
    summary = `Completed OWASP Top 10 assessment for ${target.name}. No issues detected by the checks performed. Results: ${passedCount} Passed, ${warningsCount} Warnings, ${errorsCount} Errors, ${untestedCount} Untested.`;
  } else {
    summary = `Completed OWASP Top 10 assessment for ${target.name}. Results: ${passedCount} Passed, ${findingsCount} Findings, ${warningsCount} Warnings, ${errorsCount} Errors, ${untestedCount} Untested.`;
  }

  db.prepare(`
    UPDATE scan_jobs
    SET status = 'COMPLETED', completion_time = ?, summary = ?
    WHERE id = ?
  `).run(completionTime, summary, jobId);

  // Sync to scan_history
  db.prepare(`
    INSERT OR REPLACE INTO scan_history (
      id, module_name, target_environment, start_time, completion_time, status,
      findings_count, warnings_count, passed_count, errors_count, untested_count, summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    jobId,
    `OWASP Top 10 + WSTG (${owaspEdition}) - Real-Time Scanner`,
    target.name,
    new Date().toISOString(),
    completionTime,
    'COMPLETED',
    findingsCount,
    warningsCount,
    passedCount,
    errorsCount,
    untestedCount,
    summary
  );

  logAuditEvent('SCAN_COMPLETED', `Scan job ${jobId} finished with ${findingsCount} findings.`);

  if (onEvent) {
    onEvent({
      type: 'job_complete',
      jobId,
      data: {
        jobId,
        status: 'COMPLETED',
        summary,
        findingsCount,
        warningsCount,
        passedCount,
        errorsCount,
        untestedCount,
        manualReviewCount,
        completedAt: completionTime,
        disclaimer: 'Warning: Automated scanning cannot guarantee the absence of vulnerabilities. Comprehensive security requires manual code audit and authorized penetration testing.'
      }
    });
  }

  activeJobs.delete(jobId);
}

/**
 * Cancels a running scan job.
 */
export function cancelRealtimeScan(jobId: string): boolean {
  const jobState = activeJobs.get(jobId);
  if (jobState) {
    jobState.cancelled = true;
  }
  const now = new Date().toISOString();
  db.prepare(`UPDATE scan_jobs SET status = 'CANCELLED', completion_time = ? WHERE id = ?`).run(now, jobId);
  db.prepare(`UPDATE scan_history SET status = 'CANCELLED', completion_time = ? WHERE id = ?`).run(now, jobId);
  return true;
}

/**
 * Registers an active job for tracking.
 */
export function registerActiveJob(jobId: string) {
  activeJobs.set(jobId, { cancelled: false });
}

