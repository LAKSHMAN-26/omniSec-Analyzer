# Omnisec Analyzer
### Detect. Analyze. Protect.

A complete, beginner-friendly cybersecurity testing and defensive analysis platform built for college hackathons and project expos.

---

## Table of Contents

1. What is  Omnisec Analyzer?
2. Problem Statement
3. Project Objectives
4. Features at a Glance
5. Technology Stack
6. Application Architecture
7. Project Folder Structure
8. Prerequisites
9. Installation Steps for Windows
10. Configure Environment Variables
11. Initialize the Database
12. Start the Backend Server
13. Start the Frontend
14. Run Automated Tests
15. How to Use Each Module
16. Sample Demo Workflow
17. Troubleshooting Guide
18. Known Limitations
19. Deployment Instructions
20. Future Enhancements

---

## 1. What is Omnisec Analyzer?

Omnisec Analyzer is a Security Operations Center (SOC) style dashboard that lets students learn cybersecurity hands-on.


Modules:
- IP Geolocation Intelligence
- SQL Injection Security Tester
- OWASP Top 10 Security Assessment
- API Rate Limiting Tester

**Safety Note:** This platform is for educational and demonstration purposes ONLY. It only tests its own built-in demo environment and does NOT attack real external systems.

---

## 2. Problem Statement

Many CS students learn cybersecurity only from textbooks. They never see:
- How an actual SQL Injection attack looks in real time
- Why missing security headers are dangerous
- How rate limiting protects an API

Omnisec Analyzer provides a safe, hands-on learning environment right in your browser.

---

## 3. Project Objectives

| Objective | Description |
|-----------|-------------|
| Education | Teach web security through interactive demonstrations |
| Analysis | Show the difference between vulnerable and secure code |
| Reporting | Generate professional security assessment reports |
| Safety | Never test real external systems without authorization |

---

## 4. Features at a Glance

### Module 1: Geolocation Intelligence
- Enter any public IPv4 or IPv6 address
- See country, city, ISP, and ASN details
- Clear disclaimer about geolocation accuracy

### Module 2: SQL Injection Tester
- Switch between a vulnerable and secure demo database
- Type payloads and see real SQL queries run
- Full findings report with remediation steps
- Before-and-after code comparison

### Module 3: Real-Time OWASP Top 10 Security Scanner
- **Target Restriction**: Communicates strictly with registered local educational lab applications (`127.0.0.1` loopback only). External sites, public IPs, and arbitrary URLs are blocked.
- **Vulnerable vs Secure Lab**: Test `lab-vulnerable` (deliberately weakened demo) vs `lab-secure` (defensive reference implementation).
- **Live SSE Streaming**: Watch each check execute in real time with Server-Sent Events, live check count, and cancellation support.
- **Official OWASP Categories (A01 - A10)**:
  - A01: Broken Access Control (BOLA / IDOR)
  - A02: Cryptographic Failures (Cookie flags & cleartext secret inspection)
  - A03: Injection (SQL injection tautology bypass vs parameterized queries)
  - A04: Insecure Design (Password reset anti-automation challenge)
  - A05: Security Misconfiguration (Helmet headers, CSP, banner disclosure)
  - A06: Vulnerable and Outdated Components (Dependency CVE audit)
  - A07: Identification and Authentication Failures (User enumeration prevention)
  - A08: Software and Data Integrity Failures (HMAC cryptographic signature)
  - A09: Security Logging and Alerting Failures (Tamper-resistant audit trails)
  - A10: Server-Side Request Forgery / Exceptions (Loopback perimeter boundary)
- Color-coded results: `PASS`, `FINDING`, `WARNING`, `MANUAL REVIEW REQUIRED`, `INCONCLUSIVE`
- Downloadable security reports in JSON and printable HTML.

### Module 4: API Rate Limiting Tester
- Compare rate-limited vs unprotected endpoints
- Adjustable request count (10-100)
- Live results: HTTP 200 OK vs HTTP 429 Too Many Requests
- Bar chart showing response distribution

### Dashboard
- Real-time statistics from SQLite database
- Scan history table with charts

### Reports
- Download printable HTML reports
- Export structured JSON reports

---

## 5. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript | UI components |
| Build Tool | Vite 8 | Fast development server |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Icons | Lucide React | Clean SVG icons |
| Charts | Recharts | Data visualization |
| Backend | Node.js + Express.js + TypeScript | REST API server |
| Database | SQLite (better-sqlite3) | Persistent local storage |
| Security | Helmet.js, Express Rate Limit, Zod | Headers, limiting, validation |
| Testing | Vitest + Supertest | Automated API tests (27 tests) |
| Fonts | Inter + JetBrains Mono | UI and code readability |

---

## 6. Application Architecture

```
Browser (React Frontend) <-> Vite Dev Server (port 5173)
         |
         | HTTP Requests (via fetch)
         |
Express Backend API (port 5000)
         |
         | Parameterized SQL queries
         |
SQLite Database (cybersentinel.db)
```

**Simple Explanation:**
- Your browser runs the React app
- React app talks to the Express server via HTTP
- Express server reads/writes to a local SQLite database file
- All scan results survive restarts because they are stored in the database

---

## 7. Project Folder Structure

```
c:\hackthon2\
|-- client\                    <- React Frontend (web interface)
|   |-- src\
|   |   |-- components\        <- Reusable UI components
|   |   |   |-- Navbar.tsx     <- Top navigation bar
|   |   |   |-- Sidebar.tsx    <- Left navigation sidebar
|   |   |   |-- StatCard.tsx   <- Dashboard metric cards
|   |   |   |-- RiskBadge.tsx  <- Colored severity badges
|   |   |   |-- CodeCompare.tsx<- Side-by-side code comparison
|   |   |   |-- TooltipInfo.tsx<- Hover tooltips
|   |   |   |-- pages\         <- Full page components
|   |   |       |-- Overview.tsx
|   |   |       |-- Geolocation.tsx
|   |   |       |-- SqlInjection.tsx
|   |   |       |-- OwaspAssessment.tsx
|   |   |       |-- RateLimiter.tsx
|   |   |       |-- ScanHistory.tsx
|   |   |       |-- ReportViewer.tsx
|   |   |       |-- Settings.tsx
|   |   |       |-- HelpDoc.tsx
|   |   |-- services\
|   |   |   |-- api.ts         <- API client for backend
|   |   |-- types\
|   |   |   |-- index.ts       <- TypeScript interfaces
|   |   |-- App.tsx            <- Main app with routing
|   |   |-- main.tsx           <- App entry point
|   |   |-- index.css          <- Tailwind CSS + fonts
|   |-- vite.config.ts         <- Vite build configuration
|   |-- .env                   <- VITE_API_BASE_URL setting
|
|-- server\                    <- Node.js Express Backend
|   |-- src\
|   |   |-- database\
|   |   |   |-- db.ts          <- SQLite connection + table init
|   |   |-- middleware\
|   |   |   |-- security.ts    <- Helmet, CORS, rate limiting
|   |   |   |-- errorHandler.ts<- Global error handling
|   |   |-- routes\
|   |   |   |-- health.ts      <- GET /api/health
|   |   |   |-- geolocation.ts <- GET /api/geolocation/:ip
|   |   |   |-- sqlInjection.ts<- POST /api/scans/sql-injection/...
|   |   |   |-- owasp.ts       <- POST /api/scans/owasp/scan
|   |   |   |-- rateLimit.ts   <- POST /api/scans/rate-limit/scan
|   |   |   |-- scans.ts       <- GET /api/scans/history
|   |   |   |-- reports.ts     <- GET /api/reports/:id
|   |   |   |-- settings.ts    <- GET/PUT /api/settings
|   |   |-- services\
|   |   |   |-- ipService.ts   <- IP lookup logic
|   |   |   |-- sqlScanner.ts  <- SQL injection test engine
|   |   |   |-- owaspScanner.ts<- OWASP assessment engine
|   |   |   |-- rateLimitTester.ts <- Rate limit test engine
|   |   |   |-- reportGenerator.ts <- HTML+JSON report builder
|   |   |-- app.ts             <- Express app composition
|   |   |-- index.ts           <- Server startup entry point
|   |-- tests\
|   |   |-- api.test.ts        <- 27 automated API tests (Vitest)
|   |-- .env                   <- Server config
|   |-- package.json           <- Backend dependencies
|   |-- tsconfig.json          <- TypeScript compiler config
|
|-- .gitignore                 <- Files excluded from git
|-- README.md                  <- This file!
```

---

## 8. Prerequisites

Before you start, install Node.js on your Windows laptop.

**Telugu:** Node.js antey mee computerlo JavaScript run chesey software. Deeniki install cheysthe NPM kuda vasthundi.

1. Visit: https://nodejs.org/
2. Download the **LTS version** (recommended)
3. Run the installer and accept all defaults
4. Verify by opening PowerShell and running:

```powershell
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
```

---

## 9. Installation Steps for Windows

Open PowerShell (search "PowerShell" in Start menu) and run these commands:

### Install client (frontend) packages

```powershell
cd C:\hackthon2\client
npm install
cd ..
```

> **Telugu:** "npm install" command anni library files ni internet nundi download chesi node_modules folder lo save chestundi.

### Install server (backend) packages

```powershell
cd C:\hackthon2\server
npm install
cd ..
```

---

## 10. Configure Environment Variables

Environment variables are settings that apps read at startup. They keep secrets out of code files.

### Backend (`server\.env`) — already created:

```
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
DATABASE_PATH=./cybersentinel.db
GEO_API_KEY=
```

> **Telugu:** PORT=5000 antey backend server port number 5000 pai run avuthundi. DATABASE_PATH antey database file ekkada save avuthundho cheptundi.

**Optional — Add a real Geolocation API key:**
1. Sign up free at https://ipapi.co/
2. Open `server\.env` and set `GEO_API_KEY=your_key_here`
3. Restart the backend (app works without it using local demo data)

### Frontend (`client\.env`) — already created:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 11. Initialize the Database

**Good news! You do NOT need to do anything manually.**

The SQLite database (`cybersentinel.db`) is automatically created when you start the backend.

> **Telugu:** Database automatically tayaravuthundi - meeru emi manually cheyyakkarledu!

The backend will automatically:
1. Create `server/cybersentinel.db` file
2. Create 4 tables: `scan_history`, `scan_findings`, `application_settings`, `audit_events`
3. Insert default settings (OWASP edition = 2021, rate limit = 100)

---

## 12. Start the Backend Server

Open a **NEW PowerShell window** and run:

```powershell
cd C:\hackthon2\server
npm run dev
```

You should see:
```
CyberSentinel AI Backend API - running at http://localhost:5000
Database: connected
```

> **Telugu:** Backend server start ayindante API endpoints ready ga unnayi. Ee window ni close cheyyakandi!

**Keep this window open!**

Verify at: http://localhost:5000/api/health
You should see: `{"status":"healthy","databaseConnected":true}`

---

## 13. Start the Frontend

Open a **SECOND, SEPARATE PowerShell window** and run:

```powershell
cd C:\hackthon2\client
npm run dev
```

You should see:
```
VITE v8.x.x  ready in ~500ms
Local: http://localhost:5173/
```

> **Telugu:** Frontend server start ayna tarvatha browser lo http://localhost:5173 open cheyyandi.

Open your browser and visit: **http://localhost:5173**

**CyberSentinel AI is now running!**

---

## 14. Run Automated Tests

Run the full automated test suite using Vitest and Supertest:

```powershell
cd C:\hackthon2\server
npm test
```

Expected result:
```
 Test Files  3 passed (3)
       Tests  69 passed (69)
    Duration  ~3.3s
```

> **Telugu:** Tests antey application pani chestundho leedo automatically check chese scripts. Anni 69 tests pass ayithe application sarigga undani artham.

**What the 69 tests cover:**
- **URL Safety Analyzer (Passive, zero-request inspection)**:
  - Valid HTTPS / HTTP syntax and scheme checking
  - Malformed URL and missing hostname handling
  - Prohibited schemes (`javascript:`, `file:`, `data:`) marked as `BLOCKED`
  - Embedded credentials in authority (`http://user:pass@host`) marked as `BLOCKED`
  - Localhost and private RFC 1918 addresses (`127.0.0.1`, `192.168.x.x`, `10.x.x.x`, `169.254.169.254`) marked as `BLOCKED`
  - Brand typosquatting / lookalike heuristics (`paypa1-security.com`, etc.) marked as `SUSPICIOUS`
  - Double URL encoding (`%25`) and null bytes (`%00`) marked as `SUSPICIOUS`
  - Executable file download targets (`.exe`, `.scr`, `.bat`) marked as `SUSPICIOUS`
  - Open redirect query parameters (`?redirect=http...`) marked as `SUSPICIOUS`
  - Verification that analyzing a URL NEVER makes an outbound network request to that URL
- **Backend Health & Diagnostic Status**:
  - `GET /api/health` returning `status: "ok"`, service identifier, and live SQLite database check
- **Local Target Scope Restrictions (127.0.0.1 / localhost only)**: Rejection of external targets (`google.com`, public IPs, redirects) with 403 Forbidden boundary warnings
- **Vulnerable vs Secure Demo Endpoints Comparison**:
  - A01: Broken access control (unauthenticated profile access vs Bearer auth requirement)
  - A03: SQL injection tautology bypass vs parameterized query binding
  - A05: Security headers & information disclosure (missing vs Content-Security-Policy & nosniff)
  - A07: Authentication & user enumeration (revealing vs timing-safe generic errors)
  - A08: Software & data integrity (unsigned vs HMAC-signed payload verification)
  - A10: SSRF boundary protection (blocking 169.254.169.254 metadata probes)
- **Real-Time Scanning Engine & Persistence**:
  - Target registry discovery
  - Job creation and SQLite persistence in `scan_jobs` and `scan_checks`
  - Real-time job cancellation and `CANCELLED` status recording
  - Report generation in structured JSON and printable HTML formats
- **IP Validation & Geolocation**: IPv4, IPv6, loopback, Cloudflare, Google DNS
- **Rate Limiting**: Throttling thresholds, 429 Too Many Requests, limit validation
- OWASP 2021 all 10 categories assessed
- Rate limiter activates at correct threshold (20 requests)
- Database scan history persistence across requests
- HTML and JSON report generation
- Zod input validation correctly rejects bad inputs
- Error handling for malformed JSON requests

---

## 15. How to Use Each Module

### Module 1: Geolocation Intelligence

1. Click **"Geolocation Intel"** in the left sidebar
2. Type an IP address (e.g. `8.8.8.8`)
3. Click the **"Lookup IP Intel"** button
4. Or click one of the **Demo Sample** buttons
5. Results: Country, Region, City, ISP, ASN, Coordinates
6. Read the yellow disclaimer about geolocation accuracy

> **Telugu:** IP address ni enter chesi "Lookup" button click cheyyandi. Adi country, city, ISP details choodavachchu.

### Module 2: SQL Injection Tester

1. Click **"SQL Injection Tester"** in the sidebar
2. Choose **"Vulnerable Demo Endpoint"** or **"Secure Demo Endpoint"**
3. Click **"Run Automated Security Test"** for a full scan
4. OR use the Interactive Sandbox:
   - Type: `' OR '1'='1`
   - Click **"Execute Payload"**
   - See the exact SQL query and results
5. Study the Code Comparison section
6. Each finding shows: severity, evidence, and how to fix it

> **Telugu:** "Vulnerable" mode lo ' OR '1'='1 payload try cheyyandi - 3 records return avuthayi (bypass!). "Secure" mode lo same payload try cheyyandi - 0 records return avuthayi (safe!).

### Module 3: OWASP Top 10 Assessment

1. Click **"OWASP Top 10"** in the sidebar
2. Select edition: **2021** (recommended) or 2017
3. Click **"Execute OWASP Audit Checks"**
4. Results: 10 categories with color badges
5. Each card: category name, description, test result, evidence
6. Click **"Official OWASP Docs"** links to learn more

> **Telugu:** OWASP Top 10 antey prapanchaamlo atyanta pramaadakaaramaina 10 web security lopaala jaabita. Ee module aa annitini check chestundi.

### Module 4: API Rate Limiting Tester

1. Click **"API Rate Limit Tester"** in the sidebar
2. Select: **Protected** (has rate limiting) or **Unprotected**
3. Drag slider to choose request count (10-100)
4. Click **"Run Safe Traffic Test"**
5. Results: Total requests, 200 OK count, 429 Blocked count, Average latency
6. Bar chart shows HTTP response distribution

> **Telugu:** Protected endpoint lo 40 requests pampithay, 20 success (200 OK) mariyu 20 blocked (429) avuthayi. Idi rate limiting pani chestundani chupistundi.

### Scan History

1. Click **"Scan History"** in the sidebar
2. See all past scans stored in SQLite
3. Click Eye icon to see detailed findings
4. Click Report icon to open HTML report in a new tab
5. Click **"Clear History"** to delete all results

### Reports

1. Click **"Reports"** in the sidebar
2. Select any past scan from the dropdown
3. Click **"Open & Print HTML Report"** (Ctrl+P to print)
4. Click **"Download JSON Report"** for raw data

### Settings

1. Click **"Settings"** in the sidebar
2. Change default OWASP edition or rate limit
3. Click **"Save Configuration Settings"** — saved to SQLite

---

## 16. Sample Demo Workflow

Recommended order to demonstrate at hackathon:

```
Step 1: Open http://localhost:5173 - show the SOC Dashboard (empty state)

Step 2: Geolocation - Look up 8.8.8.8 (Google DNS)
        -> Show country (USA), ISP (Google LLC), ASN

Step 3: SQL Injection - Select VULNERABLE mode
        -> Type: ' OR '1'='1 -> Execute -> Show 3 rows (bypass!)
        -> Switch to SECURE mode -> Same payload -> 0 rows (safe!)
        -> Run Automated Scan -> Show findings report

Step 4: OWASP Top 10 -> Select 2021 -> Run Assessment
        -> Show 8 PASSed, 1 WARNING, 1 MANUAL REVIEW
        -> Click any OWASP Docs link

Step 5: Rate Limiting -> Protected endpoint -> 40 requests
        -> Chart: 20 OK + 20 blocked (429)
        -> Switch to Unprotected -> 40 requests -> all 40 OK (dangerous!)

Step 6: Dashboard - show real stats now populated

Step 7: Reports -> Select SQL scan -> Open HTML Report

Step 8: Settings -> Change OWASP edition -> Save -> Show confirmation
```

---

## 17. Troubleshooting Guide

| Problem | Solution |
|---------|----------|
| npm install fails | Check internet connection |
| Port 5000 in use | Change PORT=5001 in server\.env |
| "Cannot connect to backend" | Start backend: `cd server && npm run dev` |
| Frontend blank page | Start frontend: `cd client && npm run dev` |
| Database error | Delete cybersentinel.db and restart server |
| Tests fail | Close backend server FIRST, then run npm test |
| Tailwind not working | Press Ctrl+Shift+R in browser |

---

## 18. Known Limitations

| Limitation | Explanation |
|-----------|-------------|
| IP Geolocation is approximate | City-level accuracy only, not exact location |
| No real external scanning | Only tests its own demo environment |
| SQLite is local only | Single file, not for multi-user production |
| Demo data only | SQL tests use fake users - no real credentials |
| OWASP semi-automated | Some categories need human review |
| No authentication | Designed for local educational use only |
| GEO_API_KEY optional | Without it, uses built-in demo data for common IPs |

---

## 19. Deployment Instructions

For hackathon demo, localhost is fully sufficient.

### LAN sharing (same WiFi network):

1. Find your IP: run `ipconfig` in PowerShell
2. Update `server\.env`: `CLIENT_ORIGIN=http://YOUR_IP:5173`
3. Update `client\.env`: `VITE_API_BASE_URL=http://YOUR_IP:5000/api`
4. Others on same WiFi can visit `http://YOUR_IP:5173`

### Future production deployment:
- Backend: Railway, Render, or Fly.io
- Frontend: Vercel or Netlify
- Database: PostgreSQL instead of SQLite
- Add HTTPS and authentication before going public

---

## 20. Future Enhancements

| Enhancement | Description |
|------------|-------------|
| Live Map | Embed Leaflet.js interactive map for geolocation |
| User Authentication | Login/logout for multi-user usage |
| Email Alerts | Notifications for high-severity findings |
| More SQL Payloads | Expanded injection payload library |
| Docker Support | Containerize frontend and backend |
| XSS Module | Cross-Site Scripting educational tester |
| CSRF Module | Cross-Site Request Forgery demo |
| PDF Reports | Downloadable PDFs using Puppeteer |
| Scheduled Scans | Daily/weekly OWASP cron checks |

---

## Credits

- OWASP Foundation - https://owasp.org
- Google Fonts - Inter and JetBrains Mono
- Lucide Icons - open-source icon library
- Recharts - React charting library

---

## License

Created for educational purposes at a college hackathon.
Provided as-is for learning and demonstration only.

Built with love for cybersecurity education | CyberSentinel AI v1.0 - Hackathon Edition
