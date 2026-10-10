# OmniSec Analyzer - Technical Documentation

**Updated:** 2026-10-10  
**Architecture:** React/TypeScript single-page client, Express/TypeScript API, SQLite persistence  
**Purpose:** Educational security demonstrations and authorized defensive analysis

## 1. System overview

OmniSec Analyzer is a browser-based application with a sidebar-driven UI. The client calls the backend for features that need persisted data or server-side testing. Two newer knowledge features are client-side and self-contained: Identity Attack Paths loads a fictional graph, and OSINT Explorer browses a curated resource catalogue. The app does not use React Router; it uses a custom tab state in `client/src/App.tsx`.

```text
Browser
  React + TypeScript + Tailwind CSS
  |-- Overview dashboard
  |-- Geolocation Intel
  |-- SQL Injection Tester
  |-- OWASP Top 10 assessment
  |-- Identity Attack Paths (fictional graph demo)
  |-- OSINT Explorer (resource directory)
  |-- Scan History, Reports, Settings, Help
  |-- Client-side data and UI state
      | REST/JSON and Server-Sent Events
      v
Express + TypeScript API
  |-- Local lab registration and OWASP checks
  |-- Geolocation lookup and settings persistence
  |-- Scan history/report APIs
  |-- Defensive middleware and validation
      |
      v
SQLite (better-sqlite3)
```

## 2. Feature summary

### Current modules

- **Overview:** dashboard statistics and entry points to the application modules.
- **Geolocation Intel:** IP address context lookup with approximate city/region information and map display.
- **SQL Injection Tester:** vulnerable-versus-secure examples against the application's educational fixtures.
- **OWASP Top 10:** local-target assessment, live streaming, cancellation, evidence review, and downloadable reports.
- **Identity Attack Paths:** a fictional Acme Corporation graph exploring privilege paths and simulated remediation.
- **OSINT Explorer:** a client-side directory and learning interface for public tools, sources, and research topics.
- **Scan History, Reports, Settings, Help:** supporting modules for findings, exports, configuration, and guidance.

### Removed from the current product surface

- **API Rate Limit Tester** - removed.
- **Standalone API BOLA tester** - removed.
- **Defensive API rate-limiting middleware** remains active on the backend as a safeguard, but the separate demonstration feature is not exposed in the UI.

## 3. Current technology stack

| Layer | Technologies |
|---|---|
| Client | React `^19.2.8`, TypeScript `~6.0.2`, Vite `^8.3.0`, Tailwind CSS `^4.3.3`, Lucide React `^1.53.0`, Recharts `^3.10.1` |
| Server | Node.js, TypeScript `^5.7.2`, Express `^4.21.2`, `better-sqlite3` `^11.8.0` |
| Middleware / validation | Helmet `^8.0.0`, CORS `^2.8.5`, Express Rate Limit `^7.5.0`, Zod `^3.24.1` |
| Tests | Vitest `^2.1.8`, Supertest `^7.0.0` |

Identity Attack Paths and OSINT Explorer do not require a graph package or external account. They render interactive SVG and catalogue data using lightweight helpers and browser-local state.

## 4. Main application areas

### Identity Attack Paths

Files:

- `client/src/features/identityAttackPath/demoData.ts`
- `client/src/features/identityAttackPath/analysis.ts`
- `client/src/components/pages/IdentityAttackPathExplorer.tsx`

The demo graph represents a fictional Acme Corporation with a static set of users, groups, computers, applications, resources, and directed relationships. Analysis follows only enabled directed edges and does not infer administrative access from group membership alone. It detects paths to privileged nodes and guards against cycles. The UI exposes a simulated fix step that disables a relationship in React state and recalculates paths. Nothing is sent to a live directory or a real identity provider.

### OSINT Explorer

Files:

- `client/src/features/osintUniverse/catalogue.ts`
- `client/src/features/osintUniverse/analysis.ts`
- `client/src/components/pages/OsintUniverse.tsx`

This client-side feature is a directory and learning interface, not an OSINT collection system. It includes multiple categories and resource entries, search, favorites, and a beginner path. Favorites are stored in browser `localStorage`. Resource metadata includes descriptions, use cases, optional links, tags, related resources, safety notes, pricing/license status, and verification status. Seeded resource facts are clearly labeled as unverified until checked independently.

## 5. Safety and data boundaries

1. **OWASP assessment:** the real-time assessment selects only registered lab targets and enforces the local-target boundary.
2. **Passive URL analyzer:** the URL safety check evaluates structure locally without visiting the submitted destination.
3. **Geolocation:** public IP lookups may involve an external geolocation provider; verify provider terms and privacy policy before use.
4. **Identity graph:** all identities, resources, and remediation paths are fictional demo data.
5. **OSINT Explorer:** the app does not scrape pages, query services automatically, or bypass access controls. A user may only open external resources after choosing to follow a link.
6. **Interpretation:** public records and external service data may be incomplete, stale, or inaccurate. Use them as educational context, not proof of real-world compromise.

## 6. Repository structure

```text
client/
  src/
    App.tsx
    components/
      Navbar.tsx
      Sidebar.tsx
      pages/
        Overview.tsx
        Geolocation.tsx
        SqlInjection.tsx
        OwaspAssessment.tsx
        IdentityAttackPathExplorer.tsx
        OsintUniverse.tsx
        ScanHistory.tsx
        ReportViewer.tsx
        Settings.tsx
        HelpDoc.tsx
    features/
      identityAttackPath/
        demoData.ts
        analysis.ts
      osintUniverse/
        catalogue.ts
        analysis.ts
    services/
    types/
server/
  src/
    app.ts
    index.ts
    database/
    middleware/
    routes/
    services/
  tests/
README.md
TECHNICAL_DOCUMENTATION.md
Omnisec-Analyzer-Presentation.pptx
```

There is no root npm workspace. Client and server commands run from their respective directories.

## 7. API and persistence overview

The Express app is assembled in `server/src/app.ts`. Global middleware includes Helmet, CORS, JSON/form parsing, and an API rate limiter. Current route areas include:

| Route area | Purpose |
|---|---|
| `/api/health` | Health and database status |
| `/api/geolocation` | IP context lookup |
| `/api/scans/sql-injection` | SQL injection educational lab |
| `/api/scans/owasp` | OWASP assessment support |
| `/api/scans/realtime` | Local-target scan jobs, streaming, cancellation, and reporting |
| `/api/scans` | Scan records/history |
| `/api/reports` | Report retrieval |
| `/api/settings` | Application settings |
| `/api/lab` | Vulnerable and secure educational demo endpoints |
| `/api/url-analyzer` | Passive URL safety inspection |

Exact request and response schemas live in the route handlers and client types; use those as the source of truth during changes.

SQLite is initialized by `server/src/database/db.ts` using the schema in `server/src/database/schema.sql`. The database supports lab target registration, scan jobs/check results, history/findings, settings, and similar application records. The identity-path demo and OSINT catalogue are not stored in SQLite.

## 8. Running locally (Windows PowerShell)

Install packages separately:

```powershell
cd C:\omniSec-Analyzer\server
npm install
cd C:\omniSec-Analyzer\client
npm install
```

Start the backend in one terminal:

```powershell
cd C:\omniSec-Analyzer\server
npm run dev
```

Start the frontend in another:

```powershell
cd C:\omniSec-Analyzer\client
npm run dev
```

The server defaults to port `5000` and the Vite app typically listens on `http://localhost:5173`. Visit `/api/health` on the server to confirm the service is reachable.

## 9. Tests and validation

```powershell
cd C:\omniSec-Analyzer\client
npm run build
npm run lint

cd C:\omniSec-Analyzer\server
npm test
```

The server suite uses Vitest and Supertest. It covers API validation, passive URL analysis, real-time OWASP/lab behavior, identity-graph traversal, and OSINT catalogue search/validation.

Verified for this documentation update on 2026-10-10:

- Client `npm run build`: passed.
- Targeted Oxlint for the OSINT UI/data and navigation: passed.
- Server `npm test`: passed for the current test suite.
- Manual smoke checks: OSINT navigation, category expansion, search/selection, favorite persistence, and the identity path demo were reviewed.

## 10. Known limitations

- OSINT external resources and catalogue descriptions may not all be independently audited.
- Pricing and license status remain intentionally unknown unless verified.
- IP geolocation precision and provider coverage vary; it is not a precise identity determination.
- Identity Attack Paths demonstrates traversal on a static fictional graph, not on a connected directory.
- The local OWASP test suite validates the bundled lab and is not a substitute for an authorized security assessment or production monitoring.
