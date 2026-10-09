# OmniSec Analyzer — Technical Documentation

**Updated:** 2026-10-10  
**Architecture:** React/TypeScript single-page client, Express/TypeScript API, SQLite persistence  
**Purpose:** Educational security demonstrations and authorized defensive analysis

## 1. System overview

OmniSec Analyzer is a browser-based application with sidebar-driven page selection. The client calls the backend for features that need persisted data or server-side testing. Two newer knowledge features are self-contained in the client: Identity Attack Paths loads a fictional graph, and OSINT Explorer browses a curated resource catalogue.

```text
Browser
  React + TypeScript + Tailwind CSS
  ├── Dashboard, SQL lab, OWASP assessment, IP context
  ├── Identity Attack Paths (fictional client-side graph)
  └── OSINT Explorer (client-side resource directory)
            │ REST/JSON and Server-Sent Events
            ▼
Express + TypeScript API
  ├── Registered local demo lab and real-time assessment
  ├── Geolocation, settings, scan history, and reports
  └── Defensive middleware and input validation
            │
            ▼
SQLite (better-sqlite3)
```

The application uses a custom `activeTab` switch in `client/src/App.tsx`, not React Router. Existing rate-limiting middleware is a backend protection; the separate API rate-limit tester feature was removed.

## 2. Current technology stack

Versions below are the versions declared in the client and server manifests at the time of update. Semver ranges may resolve to newer compatible patch versions after installation.

| Layer | Technologies |
|---|---|
| Client | React `^19.2.8`, TypeScript `~6.0.2`, Vite `^8.3.0`, Tailwind CSS `^4.3.3`, Lucide React `^1.53.0`, Recharts `^3.10.1` |
| Server | Node.js, TypeScript `^5.7.2`, Express `^4.21.2`, `better-sqlite3` `^11.8.0` |
| Middleware / validation | Helmet `^8.0.0`, CORS `^2.8.5`, Express Rate Limit `^7.5.0`, Zod `^3.24.1` |
| Tests | Vitest `^2.1.8`, Supertest `^7.0.0` |

No graph package is required. The identity explorer and OSINT knowledge map render interactive SVG and use lightweight traversal/catalogue helpers.

## 3. Main application areas

### Existing application modules

- **Overview:** dashboard statistics and entry points to application modules.
- **Geolocation Intel:** IP address context lookup. The provider/configuration can use an external service; treat submitted values according to that provider's terms and privacy policy.
- **SQL Injection Tester:** vulnerable-versus-secure examples against the application's educational fixtures.
- **OWASP Top 10:** runs checks against registered local demo targets, displays progress and findings, supports cancellation, and provides report output.
- **Scan History, Reports, Settings, Help:** supporting features for prior scans, report retrieval, application settings, and reference information.

### Identity Attack Paths

Files:

- `client/src/features/identityAttackPath/demoData.ts`
- `client/src/features/identityAttackPath/analysis.ts`
- `client/src/components/pages/IdentityAttackPathExplorer.tsx`

The demo graph represents a fictional Acme Corporation with 12 users, 5 groups, 4 computers, 3 applications, 2 resources, and 24 directed relationships. Analysis follows only enabled directed edges and does not infer administrative access from group membership alone. It detects paths to nodes explicitly marked privileged and guards against cycles.

Simulate Fix disables a relationship in React state, then recalculates paths. Reset reloads the original in-memory fixture. Nothing is sent to the server or applied to a real identity provider. Graph findings and remediation impacts are simulated examples, not live scan results.

### OSINT Universe

Files:

- `client/src/features/osintUniverse/catalogue.ts`
- `client/src/features/osintUniverse/analysis.ts`
- `client/src/components/pages/OsintUniverse.tsx`

This client-only feature is a directory and learning interface, not an OSINT collection system. It contains ten top-level categories and nested topic/resource entries. Only the root and top-level category nodes are initially drawn; users expand the hierarchy on demand. Search covers names, categories, descriptions, tags, and use cases, then reveals the result in its graph context. Favorites are stored in browser `localStorage`.

Catalogue metadata includes resource type, category, descriptions, use cases, optional links, tags, related resources, safety notes, pricing/license status, and verification status. Seeded resource facts and links are marked **unverified** until independently checked. Unknown pricing and license claims remain `unknown`; absent URLs are not fabricated. Outbound links are restricted to HTTPS, open in a new tab, and use `rel="noopener noreferrer"`.

The learning mode offers a beginner sequence from search and domain research through threat intelligence, forensics, evidence evaluation, reporting, and ethics. The safety copy warns users to respect privacy, authorization, service terms, and rate limits.

## 4. Safety and data boundaries

1. **OWASP active checks:** the real-time assessment selects registered lab targets and enforces the local target boundary. It is not intended for arbitrary Internet targets. Run it only against the bundled, authorized educational environment.
2. **Passive URL analyzer:** evaluates submitted URL syntax and indicators locally. It does not resolve the URL or make a request to the submitted destination.
3. **Geolocation:** unlike the local-only educational graph features, an IP lookup may involve an external geolocation provider. Check the active provider configuration and its data handling before use.
4. **Identity graph:** all organization identities, resources, paths, and remediation simulations are fictional client-side demo data.
5. **OSINT directory:** does not automatically scrape pages, query services, collect personal data, or bypass access controls. A user may open external resources intentionally; those services then apply their own policies.
6. **Data interpretation:** public records and service results can be missing, stale, imprecise, or incorrect. Do not treat exposure as proof of vulnerability or a public indicator as confirmed attribution.

## 5. Repository structure

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

## 6. API and persistence overview

The Express app is assembled in `server/src/app.ts`. Global middleware includes Helmet, CORS, JSON/form parsing, and an API rate limiter. Routes currently cover:

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

Exact request and response schemas are defined in the route handlers and client types; use those as the source of truth when changing the API.

### IP geolocation

`GET /api/geolocation/:ip` uses ipapi.co's unauthenticated JSON endpoint for public IPs; no API key is required for the tested basic lookup. There are no built-in geolocation samples. Private, reserved, and invalid addresses are not queried and do not receive invented coordinates. Provider timeouts, rate limits, authentication rejection, and other failures are surfaced as errors.

The client uses Leaflet with CARTO dark tiles and OpenStreetMap attribution. `VITE_GEO_TILE_URL` can configure a compatible tile URL; follow the selected provider's attribution and usage policy. A map marker is shown only for valid coordinates from a successful live-provider response. City-level results are estimates, not exact physical locations or live tracking.

SQLite is initialized by `server/src/database/db.ts` using the schema in `server/src/database/schema.sql`. The database supports lab target registration, scan jobs/check results, history/findings, settings, and related application records. The identity-path demo and OSINT catalogue are not stored in SQLite.

Do not describe audit logs as tamper-proof unless storage protections are actually implemented and independently verified. Do not commit local database, WAL/SHM sidecar, or environment-secret files.

## 7. Running locally (Windows PowerShell)

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

The server defaults to port `5000`; the Vite development server usually prints `http://localhost:5173`. Follow the actual URL printed if that port is occupied. Visit `/api/health` on the server to inspect its health response.

Local environment files should be configured from the actual application requirements and kept out of version control. Never paste credentials into source code, documentation, screenshots, or presentation files.

## 8. Tests and validation

```powershell
cd C:\omniSec-Analyzer\client
npm run build
npm run lint

cd C:\omniSec-Analyzer\server
npm test
```

The server suite uses Vitest and Supertest. It covers API validation and behavior, passive URL analysis, real-time OWASP/lab behavior, identity-graph traversal, and OSINT catalogue search/validation.

Verified for this documentation update on 2026-10-10:

- Client `npm run build`: passed. Existing non-blocking warnings include CSS `@import` ordering and a JavaScript bundle chunk over Vite's 500 kB advisory threshold.
- Targeted Oxlint for the OSINT UI/data and navigation: passed.
- Server `npm test`: **83 tests passed across 5 test files**.
- Browser smoke checks: OSINT navigation, category expansion, resource search/selection, favorite persistence in the current browser session, and responsive details drawer verified.

Test counts and build output may change as the code evolves. Passing tests do not verify the availability, accuracy, legality, licensing, or current terms of external resources.

## 9. Known limitations

- OSINT external resources and catalogue descriptions have not all been independently audited; each entry remains pending verification unless explicitly updated after review.
- Pricing and license status are intentionally unknown unless verified.
- IP geolocation precision and provider coverage vary; geolocation is not a precise identity or address determination.
- Identity Attack Paths demonstrates traversal on a static fictional graph, not on a connected directory.
- The local OWASP test suite validates the bundled lab. It is not a substitute for an authorized security assessment, manual review, or production monitoring.
- Build warnings about CSS import ordering and chunk size remain non-blocking and are not introduced as claims of a build failure.
