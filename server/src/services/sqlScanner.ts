import { db, logAuditEvent } from '../database/db.js';
import crypto from 'crypto';

// Initialize synthetic test dataset inside demo table
db.exec(`
  CREATE TABLE IF NOT EXISTS users_demo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL
  );

  DELETE FROM users_demo;
  INSERT INTO users_demo (username, password_hash, email, role) VALUES 
  ('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'admin@cybersentinel.local', 'Administrator'),
  ('john_doe', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'john@example.local', 'Analyst'),
  ('alice', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', 'alice@example.local', 'User');
`);

export interface SqlScanResult {
  scanId: string;
  targetMode: 'vulnerable' | 'secure';
  timestamp: string;
  status: 'COMPLETED';
  findingsCount: number;
  warningsCount: number;
  passedCount: number;
  summary: string;
  findings: Array<{
    id: string;
    title: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    category: string;
    affectedTarget: string;
    evidence: string;
    riskExplanation: string;
    remediation: string;
    status: 'FAIL' | 'PASS' | 'WARNING';
  }>;
  codeComparison: {
    vulnerableSnippet: string;
    secureSnippet: string;
  };
}

export function testVulnerableDemoEndpoint(usernameInput: string) {
  // Intentional string concatenation vulnerability for safe educational demo
  try {
    const rawQuery = `SELECT id, username, email, role FROM users_demo WHERE username = '${usernameInput}'`;
    const rows = db.prepare(rawQuery).all();
    return { success: true, query: rawQuery, rows, error: null };
  } catch (err: any) {
    return { success: false, query: `SELECT id, username, email, role FROM users_demo WHERE username = '${usernameInput}'`, rows: [], error: err.message };
  }
}

export function testSecureDemoEndpoint(usernameInput: string) {
  // Safe parameterized query implementation
  try {
    const parameterizedQuery = `SELECT id, username, email, role FROM users_demo WHERE username = ?`;
    const rows = db.prepare(parameterizedQuery).all(usernameInput);
    return { success: true, query: parameterizedQuery, rows, error: null };
  } catch (err: any) {
    return { success: false, query: `SELECT id, username, email, role FROM users_demo WHERE username = ?`, rows: [], error: err.message };
  }
}

export function runSqlInjectionAssessment(targetMode: 'vulnerable' | 'secure'): SqlScanResult {
  const scanId = `SQL-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const startTime = new Date().toISOString();

  logAuditEvent('SQL_SCAN_STARTED', `SQL Injection test initiated against local demo (${targetMode} mode).`);

  const payloadTestCases = [
    {
      name: 'Authentication Bypass Injection',
      payload: "' OR '1'='1",
      description: 'Tests if boolean injection forces string comparison to true and leaks records.'
    },
    {
      name: 'SQL Comment Truncation',
      payload: "admin' --",
      description: 'Tests if SQL comment characters (--) truncate trailing query logic.'
    },
    {
      name: 'Syntax Error Leakage',
      payload: "admin' AND 1=CONVERT(int, @@version) --",
      description: 'Tests if invalid SQL syntax triggers raw database error messages back to user.'
    },
    {
      name: 'Standard Legitimate Input',
      payload: "john_doe",
      description: 'Tests normal search input to establish baseline application behavior.'
    }
  ];

  const findings: SqlScanResult['findings'] = [];
  let findingsCount = 0;
  let warningsCount = 0;
  let passedCount = 0;

  for (const testCase of payloadTestCases) {
    const result = targetMode === 'vulnerable'
      ? testVulnerableDemoEndpoint(testCase.payload)
      : testSecureDemoEndpoint(testCase.payload);

    if (testCase.payload === "john_doe") {
      if (result.success && result.rows.length === 1) {
        passedCount++;
        findings.push({
          id: `FIND-${crypto.randomBytes(4).toString('hex')}`,
          title: `Baseline Parameter Test Passed (${testCase.name})`,
          severity: 'INFO',
          category: 'A03:2021 - Injection',
          affectedTarget: `/api/scans/sql-injection/demo-${targetMode}`,
          evidence: `Input '${testCase.payload}' returned 1 expected user record without error.`,
          riskExplanation: 'Normal user queries execute as expected.',
          remediation: 'Continue using parameterized queries.',
          status: 'PASS'
        });
      }
      continue;
    }

    if (targetMode === 'vulnerable') {
      if (result.rows.length > 1 || (testCase.payload.includes("' OR '1'='1") && result.rows.length >= 3)) {
        findingsCount++;
        findings.push({
          id: `FIND-${crypto.randomBytes(4).toString('hex')}`,
          title: `Confirmed SQL Injection Vulnerability (${testCase.name})`,
          severity: 'HIGH',
          category: 'A03:2021 - Injection',
          affectedTarget: `/api/scans/sql-injection/demo-vulnerable`,
          evidence: `Payload '${testCase.payload}' executed raw SQL: "${result.query}" and bypassed logic, returning ${result.rows.length} records.`,
          riskExplanation: 'Unsanitized string concatenation allows attacker payloads to manipulate SQL query logic, bypassing authentication or retrieving unauthorized data.',
          remediation: 'Replace inline string concatenation with prepared parameterized statements (e.g. db.prepare("SELECT * FROM users WHERE username = ?").all(username)).',
          status: 'FAIL'
        });
      } else if (result.error) {
        warningsCount++;
        findings.push({
          id: `FIND-${crypto.randomBytes(4).toString('hex')}`,
          title: `Verbose Database Error Leakage`,
          severity: 'MEDIUM',
          category: 'A05:2021 - Security Misconfiguration',
          affectedTarget: `/api/scans/sql-injection/demo-vulnerable`,
          evidence: `Database error returned to caller: "${result.error}"`,
          riskExplanation: 'Exposing detailed database error tracebacks aids attacker reconnaissance by revealing database structure and query syntax.',
          remediation: 'Catch database errors server-side and present generic error messages to end-users.',
          status: 'WARNING'
        });
      }
    } else {
      // Secure Mode verification
      if (!result.error && (result.rows.length === 0 || testCase.payload === "john_doe")) {
        passedCount++;
        findings.push({
          id: `FIND-${crypto.randomBytes(4).toString('hex')}`,
          title: `SQL Injection Protection Verified (${testCase.name})`,
          severity: 'INFO',
          category: 'A03:2021 - Injection',
          affectedTarget: `/api/scans/sql-injection/demo-secure`,
          evidence: `Payload '${testCase.payload}' was treated safely as a literal string value in query: "${result.query}". 0 records leaked.`,
          riskExplanation: 'Parameterized queries separate SQL code structure from user data inputs.',
          remediation: 'Maintain parameterized query practices across all database queries.',
          status: 'PASS'
        });
      }
    }
  }

  const summary = targetMode === 'vulnerable'
    ? `Completed SQL Injection evaluation against vulnerable demo. Detected ${findingsCount} high-risk injection vulnerabilities and ${warningsCount} warnings.`
    : `Completed SQL Injection evaluation against secure demo. All ${passedCount} security checks passed cleanly using parameterized queries.`;

  // Persist to database
  const insertHistory = db.prepare(`
    INSERT INTO scan_history (id, module_name, target_environment, start_time, completion_time, status, findings_count, warnings_count, passed_count, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertHistory.run(
    scanId,
    'SQL Injection Security Tester',
    `Local Demo (${targetMode.toUpperCase()})`,
    startTime,
    new Date().toISOString(),
    'COMPLETED',
    findingsCount,
    warningsCount,
    passedCount,
    summary
  );

  const insertFinding = db.prepare(`
    INSERT INTO scan_findings (id, scan_id, title, severity, category, affected_target, evidence, risk_explanation, remediation, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const f of findings) {
    insertFinding.run(f.id, scanId, f.title, f.severity, f.category, f.affectedTarget, f.evidence, f.riskExplanation, f.remediation, f.status);
  }

  return {
    scanId,
    targetMode,
    timestamp: startTime,
    status: 'COMPLETED',
    findingsCount,
    warningsCount,
    passedCount,
    summary,
    findings,
    codeComparison: {
      vulnerableSnippet: `// ❌ VULNERABLE CODE (DO NOT USE IN PRODUCTION)
const rawQuery = \`SELECT * FROM users WHERE username = '\${req.body.username}' AND password = '\${req.body.password}'\`;
const results = db.query(rawQuery);`,
      secureSnippet: `// ✅ SECURE CODE (RECOMMENDED BEST PRACTICE)
const parameterizedQuery = 'SELECT * FROM users WHERE username = ? AND password_hash = ?';
const results = db.prepare(parameterizedQuery).all(req.body.username, hashedPassword);`
    }
  };
}
