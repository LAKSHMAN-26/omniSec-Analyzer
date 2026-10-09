<<<<<<< HEAD
# Omnisec Analyzer
=======
# OmniSec Analyzer
>>>>>>> 2703861 (Added two features)
### Detect. Analyze. Protect.

OmniSec Analyzer is a full-stack educational cybersecurity application. It combines local security labs and assessments with a fictional identity-graph simulation and a curated OSINT learning directory. It is designed for learning and authorized defensive work; it is not a general-purpose scanner or surveillance tool.

## Features

- **Overview dashboard** — scan statistics, recent activity, and navigation to the learning modules.
- **Geolocation Intel** — look up an estimated city or network region from ipapi.co without an API key and display live coordinates on an interactive map. Provider usage limits and terms apply; there are no built-in geolocation samples.
- **SQL Injection Tester** — compare deliberately vulnerable and parameterized demo behavior using the local lab.
- **OWASP Top 10** — real-time assessment against registered local educational targets, with progress, cancellation, evidence, remediation guidance, and report downloads. The checks include object-level authorization coverage informed by OWASP WSTG references.
- **Identity Attack Paths** — traverse a fictional Acme Corporation graph. The relationships and impact are simulated; no directory or company network is queried. Remediation changes only the in-memory demo.
- **OSINT Explorer** — an interactive directory of public tools and learning resources, with search, category expansion, links, favorites, and a beginner path. It does not collect information or run scans.
- **Scan History, Reports, Settings, and Help** — supporting application features backed by the existing API and database where applicable.

<<<<<<< HEAD
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
=======
The API rate-limit tester and standalone API BOLA tester were removed. Defensive API rate-limiting middleware remains enabled on the backend.
>>>>>>> 2703861 (Added two features)

## Technology

<<<<<<< HEAD
## 1. What is Omnisec Analyzer?

Omnisec Analyzer is a Security Operations Center (SOC) style dashboard that lets students learn cybersecurity hands-on.

=======
| Area | Stack |
|---|---|
| Client | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Recharts |
| Server | Node.js, Express 4, TypeScript |
| Storage | SQLite using `better-sqlite3` |
| Validation / security middleware | Zod, Helmet, CORS configuration, Express Rate Limit |
| Tests | Vitest and Supertest |

The app uses its own sidebar tab switcher; it does not use React Router. Identity Attack Paths and OSINT Explorer use client-side demo/catalogue data and do not require an external account or API key. Public IP geolocation requests are made by the backend to ipapi.co's unauthenticated endpoint; no geolocation API key configuration is needed.

## Safety and data boundaries
>>>>>>> 2703861 (Added two features)

- The active OWASP assessment is limited to registered local demo targets. Do not change this boundary to assess systems without explicit authorization.
- The URL safety analyzer is passive: it parses and evaluates URL structure without visiting the submitted URL.
- Public IP geolocation lookups are sent to ipapi.co by the backend. Review the provider's current usage policy and privacy terms before use; private/reserved addresses are not sent to the provider.
- Geolocation is city-level and approximate, not live GPS or evidence of a person's physical location. The map uses CARTO dark tiles with OpenStreetMap attribution by default; `VITE_GEO_TILE_URL` can select another compatible tile URL subject to that provider's terms.
- Identity Attack Paths uses fictional data and labels its results as simulated. It is not evidence about a real organization.
- OSINT Explorer is a directory only. External sites open only when a user follows a link. Resource metadata, service terms, availability, pricing, and licensing may need independent verification.
- Public information may be incomplete or outdated. Respect privacy, laws, and each service's terms and rate limits.

## Run locally on Windows

<<<<<<< HEAD
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
=======
Use Node.js 22 LTS (or another version supported by the installed dependencies) and npm. Install dependencies in each application folder:
>>>>>>> 2703861 (Added two features)

```powershell
cd C:\omniSec-Analyzer\server
npm install

cd C:\omniSec-Analyzer\client
npm install
```

Start the backend in one PowerShell window:

```powershell
cd C:\omniSec-Analyzer\server
npm run dev
```

Start the frontend in a second window:

```powershell
cd C:\omniSec-Analyzer\client
npm run dev
```

Open the Vite URL printed in the client terminal (usually `http://localhost:5173`). The server listens on port `5000` by default and provides `GET /api/health` for a health check. The SQLite database is initialized by the backend. Keep secrets in local environment files; do not commit `.env` files or API keys.

There is no root npm workspace; run scripts from `client` or `server` as appropriate.

## Checks

```powershell
cd C:\omniSec-Analyzer\client
npm run build
npm run lint

cd C:\omniSec-Analyzer\server
npm test
```

The client production build and targeted geolocation lint pass. The full server test suite passes: **89 tests across 6 files**. The client build reports non-blocking CSS import-order and JavaScript chunk-size warnings. Test counts change as the project evolves.

## Project map

```text
client/
  src/
    App.tsx                         Sidebar-tab page selection
    components/
      Sidebar.tsx                   Navigation
      pages/                        Overview and feature pages
        IdentityAttackPathExplorer.tsx
        OsintUniverse.tsx
    features/
      identityAttackPath/           Fictional graph data and traversal
      osintUniverse/                 Curated catalogue and search/validation
    services/                       Client API and passive URL analysis
server/
  src/
    app.ts                          Express middleware and route mounting
    database/                       SQLite setup and schema
    routes/                          Health, scans, lab, reports, settings
    services/                        Scanner and analysis implementations
  tests/                             Vitest/Supertest suites
TECHNICAL_DOCUMENTATION.md           Architecture, data boundaries, and APIs
Omnisec-Analyzer-Presentation.pptx   Project presentation
```

For implementation details and the API overview, see [TECHNICAL_DOCUMENTATION.md](./TECHNICAL_DOCUMENTATION.md).
