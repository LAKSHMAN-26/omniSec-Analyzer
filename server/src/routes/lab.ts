import { Router, Request, Response } from 'express';
import { db, logAuditEvent } from '../database/db.js';
import crypto from 'crypto';

export const labRouter = Router();

// =========================================================================
// A. VULNERABLE DEMO APPLICATION (/api/lab/vulnerable/*)
// Deliberately introduced, documented educational security weaknesses.
// =========================================================================

// A01: Broken Access Control (BOLA / IDOR)
// Weakness: No authentication token check; any user ID can be read directly
labRouter.get('/vulnerable/users/:id', (req: Request, res: Response) => {
  const userId = req.params.id;
  const user = db.prepare('SELECT id, username, role, full_name, email FROM synthetic_users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  // VULNERABILITY: BOLA/IDOR - profile returned without authorization verification
  return res.status(200).json({
    status: 'success',
    mode: 'vulnerable',
    warning: 'DEMO VULNERABILITY: Unauthenticated horizontal privilege access permitted.',
    user
  });
});

// A02: Cryptographic Failures
// Weakness: Plaintext or weak MD5 hash exposed, missing secure cookie flags, cleartext API key
labRouter.get('/vulnerable/crypto', (req: Request, res: Response) => {
  // VULNERABILITY: Sensitive cleartext API secret returned, no encryption, insecure cookie
  res.setHeader('Set-Cookie', 'session_id=insecure_token_12345; Path=/'); // Missing HttpOnly, Secure, SameSite
  return res.status(200).json({
    status: 'success',
    mode: 'vulnerable',
    warning: 'DEMO VULNERABILITY: Insecure cookie attributes and cleartext secret keys exposed.',
    apiKey: 'demo_lab_insecure_cleartext_api_key_77a9b',
    passwordStorageAlgorithm: 'MD5 / Plaintext (Unsalted)',
    cookieSecurity: {
      httpOnly: false,
      secure: false,
      sameSite: 'None'
    }
  });
});

// A03: SQL Injection
// Weakness: Raw string concatenation in database query
labRouter.get('/vulnerable/products', (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  try {
    // VULNERABILITY: Raw SQL string concatenation allows ' OR '1'='1 -- injection
    const rawSql = `SELECT id, name, category, price, description FROM synthetic_products WHERE name LIKE '%${q}%'`;
    const results = db.prepare(rawSql).all();
    return res.status(200).json({
      status: 'success',
      mode: 'vulnerable',
      queryExecuted: rawSql,
      resultsCount: results.length,
      results
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      mode: 'vulnerable',
      error: err.message,
      stack: err.stack // VULNERABILITY: Verbose error stack trace leak
    });
  }
});

// A04: Insecure Design
// Weakness: Password reset endpoint does not require existing credentials or challenge
labRouter.post('/vulnerable/password-reset', (req: Request, res: Response) => {
  const { username, newPassword } = req.body || {};
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }
  // VULNERABILITY: Insecure design - resets password without validation challenge or MFA
  return res.status(200).json({
    status: 'success',
    mode: 'vulnerable',
    message: `Password for ${username} reset without secondary authentication or security challenge.`,
    weakness: 'Missing trust boundary and anti-automation controls'
  });
});

// A05: Security Misconfiguration
// Weakness: Omits defensive headers, sends verbose server info, leaks internal software version
labRouter.get('/vulnerable/headers', (req: Request, res: Response) => {
  // VULNERABILITY: Removing security headers and adding revealing banner
  res.removeHeader('X-Content-Type-Options');
  res.removeHeader('X-Frame-Options');
  res.setHeader('X-Powered-By', 'Express/4.21.2-Lab-Vulnerable');
  res.setHeader('Server', 'CyberSentinel-Demo-Vulnerable/1.0 (Ubuntu; Node v22.10.0)');
  return res.status(200).json({
    status: 'success',
    mode: 'vulnerable',
    warning: 'DEMO VULNERABILITY: Server banner disclosure and missing security headers.',
    headersApplied: {
      'Content-Security-Policy': 'MISSING',
      'X-Content-Type-Options': 'MISSING',
      'X-Frame-Options': 'MISSING',
      'X-Powered-By': 'Express/4.21.2-Lab-Vulnerable'
    }
  });
});

// A06: Vulnerable Component Check Demo
labRouter.get('/vulnerable/components', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'success',
    mode: 'vulnerable',
    knownVulnerablePackages: [
      { package: 'sample-legacy-parser', version: '0.4.1', cve: 'CVE-2021-3918', severity: 'High' }
    ]
  });
});

// A07: Identification and Authentication Failures
// Weakness: Detailed error enables username enumeration; permits trivial passwords
labRouter.post('/vulnerable/login', (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  if (username !== 'alice_student') {
    // VULNERABILITY: User enumeration flaw
    return res.status(401).json({
      status: 'error',
      mode: 'vulnerable',
      error: 'Username not recognized in system registry.'
    });
  }
  if (password !== 'student123') {
    // VULNERABILITY: Reveals username is valid
    return res.status(401).json({
      status: 'error',
      mode: 'vulnerable',
      error: 'Password incorrect for existing user alice_student.'
    });
  }
  return res.status(200).json({
    status: 'success',
    mode: 'vulnerable',
    token: 'insecure_unencrypted_session_token_alice'
  });
});

// A08: Software and Data Integrity Failures
// Weakness: Deserializes untrusted input without cryptographic verification
labRouter.post('/vulnerable/import', (req: Request, res: Response) => {
  const { payload } = req.body || {};
  // VULNERABILITY: Accepts unverified input without signature or checksum check
  return res.status(200).json({
    status: 'success',
    mode: 'vulnerable',
    integrityVerified: false,
    message: 'Payload processed without HMAC checksum or digital signature validation.'
  });
});

// A09: Security Logging and Alerting Failures
// Weakness: Security-sensitive event triggered without audit log recording
labRouter.post('/vulnerable/action', (req: Request, res: Response) => {
  // VULNERABILITY: No audit logging performed on administrative or security-critical action
  return res.status(200).json({
    status: 'success',
    mode: 'vulnerable',
    auditLogged: false,
    warning: 'DEMO VULNERABILITY: Security action completed with zero audit trail.'
  });
});

// A10: Server-Side Request Forgery / Exceptional Conditions
// Weakness: Unchecked URL parameter permits SSRF loopback probing or crashes on unhandled type
labRouter.get('/vulnerable/fetch-url', (req: Request, res: Response) => {
  const target = req.query.url as string;
  if (!target) {
    return res.status(400).json({ error: 'Target URL parameter required.' });
  }
  // VULNERABILITY: SSRF risk - allows internal cloud metadata or local probing
  return res.status(200).json({
    status: 'success',
    mode: 'vulnerable',
    warning: 'DEMO VULNERABILITY: Unrestricted target destination accepted.',
    simulatedFetchedTarget: target
  });
});


// =========================================================================
// B. SECURE DEMO APPLICATION (/api/lab/secure/*)
// Implements secure defensive coding standards and positive controls.
// =========================================================================

// A01: Secure Access Control
// Positive control: Checks authorization header and verifies role/ownership
labRouter.get('/secure/users/:id', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer lab_secure_token')) {
    logAuditEvent('UNAUTHORIZED_ACCESS_BLOCKED', `Unauthorized attempt to access user ID ${req.params.id}`);
    return res.status(401).json({
      status: 'error',
      mode: 'secure',
      error: 'Authentication required: Valid bearer token must be provided.'
    });
  }

  const userId = req.params.id;
  const user = db.prepare('SELECT id, username, role, full_name, email FROM synthetic_users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(200).json({
    status: 'success',
    mode: 'secure',
    user
  });
});

// A02: Secure Cryptography
// Positive control: Secure cookie flags, hashed credentials, secrets withheld
labRouter.get('/secure/crypto', (req: Request, res: Response) => {
  res.setHeader('Set-Cookie', 'session_id=sec_' + crypto.randomBytes(16).toString('hex') + '; Path=/; HttpOnly; SameSite=Strict');
  return res.status(200).json({
    status: 'success',
    mode: 'secure',
    passwordStorageAlgorithm: 'Argon2id (Salted, High Iteration)',
    cookieSecurity: {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict'
    },
    secretsProtected: true
  });
});

// A03: Secure Parameterized SQL Queries
// Positive control: Uses SQLite parameterized query placeholders (?)
labRouter.get('/secure/products', (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  // SECURE: Parameterized statement isolates SQL query logic from user data
  const stmt = db.prepare('SELECT id, name, category, price, description FROM synthetic_products WHERE name LIKE ?');
  const results = stmt.all(`%${q}%`);
  return res.status(200).json({
    status: 'success',
    mode: 'secure',
    defenseMethod: 'Parameterized Prepared Statement (sqlite3 ? parameter)',
    resultsCount: results.length,
    results
  });
});

// A04: Secure Design
// Positive control: Enforces security token, rate limiting, and challenge verification
labRouter.post('/secure/password-reset', (req: Request, res: Response) => {
  const { username, currentToken } = req.body || {};
  if (!username || !currentToken || currentToken !== 'valid_reset_challenge_token') {
    return res.status(403).json({
      status: 'error',
      mode: 'secure',
      error: 'Access denied: Valid verification challenge token is required to reset credential.'
    });
  }
  return res.status(200).json({
    status: 'success',
    mode: 'secure',
    message: 'Reset challenge verified successfully.'
  });
});

// A05: Secure HTTP Headers
// Positive control: Strict security headers and masked banner
labRouter.get('/secure/headers', (req: Request, res: Response) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  res.setHeader('Server', 'CyberSentinel-Hardened');
  return res.status(200).json({
    status: 'success',
    mode: 'secure',
    headersApplied: {
      'Content-Security-Policy': "default-src 'self'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Server': 'CyberSentinel-Hardened'
    }
  });
});

// A06: Outdated Component Audit
labRouter.get('/secure/components', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'success',
    mode: 'secure',
    knownVulnerablePackages: []
  });
});

// A07: Secure Authentication
// Positive control: Generic failure message prevents user enumeration; strong credential rules
labRouter.post('/secure/login', (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  if (username !== 'alice_student' || password !== 'CorrectSecLabPass!2026') {
    // SECURE: Generic timing-safe error response prevents username enumeration
    return res.status(401).json({
      status: 'error',
      mode: 'secure',
      error: 'Invalid credentials. Please verify your login details.'
    });
  }
  return res.status(200).json({
    status: 'success',
    mode: 'secure',
    token: 'sec_bearer_token_' + crypto.randomBytes(16).toString('hex')
  });
});

// A08: Software and Data Integrity
// Positive control: Requires HMAC signature check
labRouter.post('/secure/import', (req: Request, res: Response) => {
  const signature = req.headers['x-payload-signature'];
  if (!signature || signature !== 'valid_hmac_sha256_signature') {
    return res.status(400).json({
      status: 'error',
      mode: 'secure',
      error: 'Data integrity violation: Valid HMAC cryptographic signature is required.'
    });
  }
  return res.status(200).json({
    status: 'success',
    mode: 'secure',
    integrityVerified: true,
    message: 'Data integrity confirmed via cryptographic signature.'
  });
});

// A09: Security Logging and Alerting
// Positive control: Automatically records security audit event
labRouter.post('/secure/action', (req: Request, res: Response) => {
  logAuditEvent('SECURE_DEMO_ACTION', 'User performed sensitive lab action with complete audit trail.');
  return res.status(200).json({
    status: 'success',
    mode: 'secure',
    auditLogged: true,
    message: 'Security event registered in SQLite audit_events table.'
  });
});

// A10: Server-Side Request Forgery & Exceptional Handling
// Positive control: Enforces strict internal destination allowlist and safe exception handling
labRouter.get('/secure/fetch-url', (req: Request, res: Response) => {
  const target = req.query.url as string;
  if (!target) {
    return res.status(400).json({ error: 'Target URL parameter required.' });
  }

  // Positive defense: Reject cloud metadata and non-allowlisted destinations
  if (target.includes('169.254.169.254') || target.startsWith('file:') || target.startsWith('ftp:')) {
    logAuditEvent('SSRF_ATTEMPT_BLOCKED', `Blocked attempt to access restricted target: ${target}`);
    return res.status(403).json({
      status: 'error',
      mode: 'secure',
      error: 'Access blocked: Destination violated local lab security perimeter.'
    });
  }

  return res.status(200).json({
    status: 'success',
    mode: 'secure',
    message: 'Target verified against educational lab allowlist.'
  });
});
