# CyberSentinel AI — Technical Documentation
### Detect. Analyze. Protect.
**Version:** 1.0.0 | **Architecture:** Decoupled Client-Server (React 18 + Node.js/Express + SQLite) | **Target Environment:** Loopback Educational Sandbox (127.0.0.1)

---

## 1. System Overview & Architecture

CyberSentinel AI is an educational cybersecurity analysis platform designed for project expos and hackathons. It integrates passive structural URL risk analysis with an active, real-time OWASP Top 10 automated testing engine operating exclusively within an isolated local loopback environment.

```
+---------------------------------------------------------------------------------------+
|                                    CYBERSENTINEL AI                                   |
|                                                                                       |
|   +------------------------------------+    +-------------------------------------+   |
|   |         REACT 18 FRONTEND          |    |          NODE.JS EXPRESS API        |   |
|   |        (http://localhost:5173)     |    |        (http://localhost:5000)      |   |
|   +------------------------------------+    +-------------------------------------+   |
|         |                        ^                        ^                     ^     |
|         | REST / JSON            | SSE Stream             | Local Engine        | SQL |
|         v                        |                        v                     v     |
|   [ Passive URL Safety ]   [ Live Progress ]      [ Local Target Registry ] [ SQLite] |
|   - Syntax & RFC 3986      - check_start          - lab-vulnerable (Port 5000)        |
|   - Brand Lookalike Check  - check_result         - lab-secure     (Port 5000)        |
|   - Private IP Detection   - job_complete         - Strict 127.0.0.1 Boundary         |
+---------------------------------------------------------------------------------------+
```

### Core Security Guarantees
1. **Zero External Network Traffic for Analyzed URLs**: URL safety analysis is strictly local and passive. It evaluates syntax, schemes, and domain formatting without performing DNS resolution or issuing HTTP requests to third-party destinations.
2. **Strict Loopback Target Boundary**: The active OWASP assessment engine connects exclusively to registered educational demo targets hosted on `127.0.0.1` (`localhost`). Outbound traffic to public IPs or arbitrary domains is rejected with `403 Forbidden`.
3. **Synthetic Data Isolation**: All database operations in demo endpoints use mock records (`synthetic_users`, `synthetic_products`). No production credentials or personally identifiable information (PII) are stored.

---

## 2. Technology Stack & Component Specifications

| Layer | Component | Version | Role / Justification |
|---|---|---|---|
| **Frontend** | React | 18.3.1 | Component-based UI with fast re-renders |
| | Vite | 8.3.4 | HMR dev server and ES module bundler |
| | TypeScript | 5.6.3 | Compile-time type safety (`verbatimModuleSyntax`) |
| | Tailwind CSS | 4.x | Dark cybersecurity theme styling |
| | Lucide React | 1.16.0 | Vector iconography for security indicators |
| | Recharts | 2.15.1 | Interactive telemetry and response distribution charts |
| **Backend** | Node.js | 22.x | Asynchronous JavaScript runtime |
| | Express | 4.21.2 | HTTP routing, middleware, and SSE streaming |
| | better-sqlite3 | 11.8.0 | Synchronous, high-performance WAL SQLite engine |
| | Helmet | 8.0.0 | HTTP response header hardening |
| | CORS | 2.8.5 | Local development cross-origin configuration |
| | Express Rate Limit | 7.5.0 | Defensive API throttling mechanism |
| | Zod | 3.24.1 | Schema validation for all API inputs |
| **Testing** | Vitest | 2.1.9 | Fast unit, integration, and security assertion runner |
| | Supertest | 7.0.0 | End-to-end HTTP request testing |

---

## 3. Directory Structure

```
c:\hackthon2
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # Top navigation and demo indicator
│   │   │   ├── Sidebar.tsx            # Module navigation sidebar
│   │   │   ├── CodeCompare.tsx        # Vulnerable vs secure snippet comparison
│   │   │   ├── RiskBadge.tsx          # Severity indicator badges
│   │   │   ├── StatCard.tsx           # Telemetry metrics cards
│   │   │   ├── TooltipInfo.tsx        # Interactive terminology explainer
│   │   │   └── pages/
│   │   │       ├── Overview.tsx       # SOC metrics dashboard
│   │   │       ├── OwaspAssessment.tsx# URL safety analyzer & OWASP engine UI
│   │   │       ├── SqlInjection.tsx   # SQL injection sandbox & test suite
│   │   │       ├── RateLimiter.tsx    # API throttling simulation
│   │   │       ├── Geolocation.tsx    # IP network intelligence lookup
│   │   │       ├── ScanHistory.tsx    # Historical audit logs
│   │   │       ├── ReportViewer.tsx   # Report download viewer
│   │   │       ├── Settings.tsx       # Platform configuration
│   │   │       └── HelpDoc.tsx        # Technical glossary & documentation
│   │   ├── services/
│   │   │   ├── api.ts                 # Typed HTTP client & error handler
│   │   │   └── urlAnalyzer.ts         # Client-side passive URL parsing engine
│   │   ├── types/                     # Shared TypeScript interface models
│   │   ├── App.tsx                    # Root routing container
│   │   └── main.tsx                   # Client entrypoint
│   └── package.json
├── server/
│   ├── src/
│   │   ├── database/
│   │   │   ├── db.ts                  # SQLite connection & schema loader
│   │   │   └── schema.sql             # Relational DDL & seed data
│   │   ├── middleware/
│   │   │   ├── security.ts            # CORS, Helmet, and rate-limiting
│   │   │   └── errorHandler.ts        # Centralized HTTP error handler
│   │   ├── routes/
│   │   │   ├── health.ts              # /api/health database diagnostics
│   │   │   ├── lab.ts                 # /api/lab (vulnerable & secure endpoints)
│   │   │   ├── realtimeScans.ts       # /api/scans/realtime (SSE engine)
│   │   │   ├── urlAnalyzer.ts         # /api/url-analyzer (safety check)
│   │   │   ├── geolocation.ts         # /api/geolocation
│   │   │   ├── sqlInjection.ts        # /api/scans/sql-injection
│   │   │   ├── rateLimit.ts           # /api/scans/rate-limit
│   │   │   ├── scans.ts               # /api/scans
│   │   │   ├── reports.ts             # /api/reports
│   │   │   └── settings.ts            # /api/settings
│   │   ├── services/
│   │   │   ├── urlAnalyzer.ts         # Server-side passive URL risk engine
│   │   │   ├── targetRegistry.ts      # Allowlist boundary validator
│   │   │   ├── realtimeScanner.ts     # OWASP test runner & cancellation
│   │   │   └── owaspScanner.ts        # Static category reference mapper
│   │   ├── app.ts                     # Express pipeline definition
│   │   └── index.ts                   # Server bootstrap (Port 5000)
│   ├── tests/
│   │   ├── api.test.ts                # API & component tests (27 tests)
│   │   ├── realtime_owasp.test.ts     # Lab & scanner tests (22 tests)
│   │   └── url_analyzer.test.ts       # Passive URL safety tests (20 tests)
│   ├── cybersentinel.db               # SQLite database file
│   └── package.json
└── README.md
```

---

## 4. Database Schema Design (SQLite)

The database engine is configured with WAL (Write-Ahead Logging) mode enabled via `db.pragma('journal_mode = WAL')` for concurrent read/write stability.

### Tables Specification

#### 1. `lab_targets`
Maintains the fixed registry of permitted local educational targets.
```sql
CREATE TABLE IF NOT EXISTS lab_targets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'vulnerable' | 'secure'
    base_url TEXT NOT NULL,
    description TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);
```

#### 2. `scan_jobs`
Stores metadata and real-time execution telemetry for security audits.
```sql
CREATE TABLE IF NOT EXISTS scan_jobs (
    id TEXT PRIMARY KEY,
    target_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    target_url TEXT NOT NULL,
    owasp_edition TEXT NOT NULL DEFAULT '2021',
    status TEXT NOT NULL, -- 'PENDING', 'RUNNING', 'COMPLETED', 'CANCELLED', 'FAILED'
    start_time TEXT NOT NULL,
    completion_time TEXT,
    total_checks INTEGER DEFAULT 0,
    completed_checks INTEGER DEFAULT 0,
    findings_count INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    passed_count INTEGER DEFAULT 0,
    manual_review_count INTEGER DEFAULT 0,
    summary TEXT,
    FOREIGN KEY(target_id) REFERENCES lab_targets(id)
);
```

#### 3. `scan_checks`
Stores granular evidence and remediation guidance for each executed check.
```sql
CREATE TABLE IF NOT EXISTS scan_checks (
    id TEXT PRIMARY KEY,
    scan_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    check_name TEXT NOT NULL,
    target_endpoint TEXT NOT NULL,
    http_method TEXT NOT NULL,
    status TEXT NOT NULL, -- 'PASS', 'FINDING', 'WARNING', 'MANUAL REVIEW REQUIRED', 'NOT TESTED', 'INCONCLUSIVE'
    severity TEXT NOT NULL, -- 'Critical', 'High', 'Medium', 'Low', 'Informational', 'None'
    confidence TEXT NOT NULL, -- 'High', 'Medium', 'Low'
    evidence TEXT,
    remediation TEXT,
    limitations TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(scan_id) REFERENCES scan_jobs(id) ON DELETE CASCADE
);
```

#### 4. `scan_findings` & `scan_history`
Maintains compatibility with legacy dashboard telemetry and historical trend views.

#### 5. `audit_events`
Tamper-resistant audit log capturing critical events (`SCAN_STARTED`, `SCAN_COMPLETED`, `SCAN_CANCELLED`, `SSRF_ATTEMPT_BLOCKED`).
```sql
CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL,
    details TEXT NOT NULL
);
```

---

## 5. Core Engines & Implementation Details

### A. Passive URL Safety Analyzer Engine
Implemented in `server/src/services/urlAnalyzer.ts` and mirrored in `client/src/services/urlAnalyzer.ts`.

#### Analytical Pipeline
1. **RFC 3986 Syntax Parsing**: Parsed using the standard `URL` constructor.
2. **Scheme Filtering**: Restricts schemes strictly to `http:` and `https:`. Schemes like `javascript:`, `file:`, `data:`, and `ftp:` are assigned a `BLOCKED` verdict.
3. **Userinfo / Credential Embedding Check**: Flags URLs containing `username:password@authority`.
4. **Private IP & Loopback Perimeter Filter**: Detects destinations targeting RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopbacks (`127.0.0.0/8`, `::1`), and cloud link-local metadata (`169.254.169.254`). Verdict: `BLOCKED`.
5. **Brand Typosquatting & Lookalike Heuristics**: Evaluates target hostnames against regex patterns for high-value targets (e.g., `paypal`, `google`, `microsoft`, `apple`, `amazon`).
6. **Obfuscation Detection**: Identifies multi-layer URL encoding (`%25`), null bytes (`%00`), and Punycode (`xn--`).
7. **Dangerous Resource Verification**: Flags executable extensions (`.exe`, `.bat`, `.scr`, `.sh`) and open-redirect query parameters (`?redirect=http...`).

#### Verdict Classification
- **`VALIDATION PASSED`**: Conforms to standard web formatting without warning indicators.
- **`SUSPICIOUS`**: Demonstrates one or more risky structural patterns requiring review.
- **`BLOCKED`**: Targets internal network space, cloud metadata, or prohibited schemes.
- **`UNVERIFIED`**: Empty input or malformed syntax.

---

### B. Real-Time Educational OWASP Top 10 Assessment Engine
Implemented in `server/src/services/realtimeScanner.ts`.

#### Live Streaming & Concurrency Architecture
- **Server-Sent Events (SSE)**: The client listens via `GET /api/scans/realtime/stream/:jobId`.
- **Event Lifecycle**:
  - `job_start`: Broadcasts total checks, target URL, and timestamp.
  - `check_start`: Notifies UI of the currently executing test and endpoint.
  - `check_result`: Delivers status, severity, confidence, sanitized evidence, and remediation.
  - `job_complete` / `job_cancelled`: Finalizes summary counts and closes the connection.
- **Thread-Safe Cancellation**: A shared `activeJobs` tracking map allows immediate cancellation via `POST /api/scans/realtime/cancel/:jobId`, halting subsequent checks and marking the database record as `CANCELLED`.

#### OWASP Top 10 Check Definitions

| ID | Category | Check Implementation | Vulnerable vs. Secure Behavior |
|---|---|---|---|
| **A01** | Broken Access Control | BOLA / IDOR probe to `/users/2` | Vulnerable: returns unauthorized profile. Secure: returns `401 Unauthorized`. |
| **A02** | Cryptographic Failures | Cookie attributes & secret exposure | Vulnerable: plaintext API key, missing HttpOnly/Secure flags. Secure: Argon2id hash, HttpOnly & SameSite=Strict. |
| **A03** | Injection | SQL tautology payload (`' OR '1'='1`) | Vulnerable: returns all products via string concat. Secure: parameterized binding returns 0 rows. |
| **A04** | Insecure Design | Password reset verification | Vulnerable: unauthenticated reset accepted. Secure: requires challenge verification token. |
| **A05** | Security Misconfiguration | Defensive HTTP headers audit | Vulnerable: leaks `X-Powered-By`, missing CSP. Secure: enforces Helmet CSP, nosniff, and masks server banner. |
| **A06** | Outdated Components | Declared dependencies CVE audit | Vulnerable: simulates unpatched advisory. Secure: zero known vulnerabilities detected. |
| **A07** | Auth Failures | User enumeration verbosity | Vulnerable: distinguishes between wrong user and wrong pass. Secure: returns generic "Invalid credentials". |
| **A08** | Integrity Failures | Untrusted deserialization import | Vulnerable: accepts raw JSON without signature. Secure: rejects payloads lacking HMAC signature. |
| **A09** | Logging Failures | Security audit trail check | Vulnerable: administrative action unlogged. Secure: writes persistent entry to `audit_events`. |
| **A10** | SSRF / Exceptions | Metadata perimeter boundary probe | Vulnerable: allows `169.254.169.254`. Secure: enforces perimeter block and returns `403 Forbidden`. |

---

## 6. REST API Reference

### Health & Diagnostics
#### `GET /api/health`
Returns live system health and database connectivity.
- **Response (200 OK)**:
```json
{
  "status": "ok",
  "service": "CyberSentinel AI API",
  "uptime": 345.12,
  "databaseConnected": true,
  "totalScansInDb": 14,
  "version": "1.0.0"
}
```

### URL Safety Analyzer
#### `POST /api/url-analyzer/check`
Performs passive local safety inspection on a submitted URL.
- **Request Body**:
```json
{
  "url": "https://example.com"
}
```
- **Response (200 OK)**:
```json
{
  "submittedUrl": "https://example.com",
  "parsedHostname": "example.com",
  "protocol": "https",
  "port": "443",
  "verdict": "VALIDATION PASSED",
  "warnings": [],
  "recommendedNextSteps": ["The URL format matches standard web specifications."],
  "checksPerformed": [
    "Syntactic URL validity (RFC 3986 parser)",
    "Scheme validation (HTTP / HTTPS allowed)",
    "Hostname presence check",
    "Embedded credentials inspection (RFC 3986 userinfo)",
    "Lookalike and brand typosquatting heuristic",
    "IP address hostname vs Domain format check",
    "Loopback and private-network IP boundary check",
    "Unusual encoding inspection (%25, %00, hex/octal)",
    "Transport encryption verification (HTTPS vs plain HTTP)",
    "Suspicious file extensions and open-redirect pattern check"
  ],
  "checksNotPerformed": [
    "Live DNS resolution (A / AAAA / CNAME records)",
    "Outbound HTTP / TLS connection handshake (No network traffic sent)",
    "Live domain reputation and threat-intelligence feed lookup",
    "Web page content inspection and DOM analysis",
    "Dynamic sandbox binary execution or detonation"
  ],
  "liveReputation": {
    "status": "Live reputation check unavailable.",
    "details": "No external threat intelligence provider configured in educational lab mode."
  },
  "disclaimer": "URL analysis is not a guarantee that a website is safe. This tool does not visit the submitted URL or verify its live reputation."
}
```

### Real-Time Scans & Educational Lab
#### `GET /api/scans/realtime/targets`
Retrieves registered educational lab targets.
- **Response (200 OK)**:
```json
{
  "targets": [
    {
      "id": "lab-vulnerable",
      "name": "Vulnerable Demo Application",
      "target_type": "vulnerable",
      "base_url": "http://127.0.0.1:5000/api/lab/vulnerable"
    },
    {
      "id": "lab-secure",
      "name": "Secure Demo Application",
      "target_type": "secure",
      "base_url": "http://127.0.0.1:5000/api/lab/secure"
    }
  ]
}
```

#### `POST /api/scans/realtime/start`
Starts a real-time assessment against a registered target.
- **Request Body**: `{"targetId": "lab-vulnerable", "owaspEdition": "2021"}`
- **Response (201 Created)**: `{"status": "started", "jobId": "SCAN-179152..."}`

#### `GET /api/scans/realtime/stream/:jobId`
Server-Sent Events (SSE) streaming endpoint emitting `check_start`, `check_result`, and `job_complete`.

#### `POST /api/scans/realtime/cancel/:jobId`
Halts execution of an in-progress scan job.
- **Response (200 OK)**: `{"status": "cancelled", "message": "Scan job was cancelled."}`

#### `GET /api/scans/realtime/reports/:jobId/download?format=json|html`
Downloads an assessment report formatted as structured JSON or printable HTML.

---

## 7. Verification & Automated Test Suites

The test suite is built on Vitest and Supertest. All security assertions run against memory and loopback fixtures without external internet dependencies.

### Test Execution Command
```powershell
cd C:\hackthon2\server
npm test
```

### Summary of Passing Suites (69/69 PASSED)

```
 Test Files  3 passed (3)
       Tests  69 passed (69)
    Duration  ~3.3s
```

1. **`server/tests/url_analyzer.test.ts` (20 Tests Passed)**:
   - Valid HTTPS validation (`VALIDATION PASSED`)
   - Unencrypted transport detection (`SUSPICIOUS`)
   - Malformed URLs, empty input, and missing hostname handling (`UNVERIFIED`)
   - Prohibited schemes: `javascript:`, `file:`, `data:` (`BLOCKED`)
   - Embedded credentials: `http://user:pass@host` (`BLOCKED`)
   - Private networks: `localhost`, `127.0.0.1`, `192.168.1.1`, `10.0.0.1`, `169.254.169.254` (`BLOCKED`)
   - Brand lookalike detection: `paypa1-verification.com` (`SUSPICIOUS`)
   - Dangerous encoding (`%25`, `%00`) & executable downloads (`.exe`)
   - **Zero-Request Verification**: Verified with `vi.spyOn(http, 'request')` that analyzing a URL triggers 0 outbound network requests.
   - Diagnostic validation of `GET /api/health`.

2. **`server/tests/realtime_owasp.test.ts` (22 Tests Passed)**:
   - Target allowlist boundary enforcement (blocks external destinations with `403 Forbidden`).
   - Vulnerable vs secure behavior across A01-A10 OWASP endpoints.
   - Real-time SSE lifecycle, job cancellation, and SQLite persistence.
   - JSON and HTML downloadable report generation.

3. **`server/tests/api.test.ts` (27 Tests Passed)**:
   - Geolocation IP validation (IPv4, IPv6, loopback, Cloudflare).
   - SQL injection sandbox and parameterized query protection.
   - Rate limiting threshold enforcement (`429 Too Many Requests`).
   - Zod schema validation and error-handling pipelines.

---

## 8. Deployment & Execution Guide

### Prerequisites
- Node.js version 18.x, 20.x, or 22.x
- Windows PowerShell

### Step 1: Start Backend API Server
```powershell
cd C:\hackthon2\server
npm run dev
```
- **Service Port**: `http://localhost:5000`
- **Health Diagnostic**: `http://localhost:5000/api/health`

### Step 2: Start Frontend Application
```powershell
cd C:\hackthon2\client
npm run dev
```
- **Application URL**: `http://localhost:5173`

### Operational Notes
- Ensure both PowerShell windows remain running concurrently during demonstration.
- To produce a production build, run `npm run build` in `client/` and `server/`.
