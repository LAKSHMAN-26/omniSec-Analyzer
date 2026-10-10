# OmniSec Analyzer
### Detect. Analyze. Protect.

OmniSec Analyzer is a full-stack educational cybersecurity application built for safe learning and authorized defensive analysis. The current release combines local security labs and assessments with a fictional identity-graph simulation and a curated OSINT learning directory. It intentionally avoids general-purpose scanning or live attack workflows against third-party systems.

## Current feature set

- Overview dashboard - summary statistics, quick navigation, and local scan activity.
- Geolocation Intel - estimate a public IP's city/region and view the location on an interactive map.
- SQL Injection Tester - compare a vulnerable demo and a parameterized secure example in a controlled lab.
- OWASP Top 10 - run real-time checks against registered local demo targets with progress, evidence, and downloadable reports.
- Identity Attack Paths - explore a fictional Acme Corporation graph and test simulated remediation in-memory only.
- OSINT Explorer - browse a curated OSINT directory with search, categories, favorites, and a beginner learning path.
- Scan History, Reports, Settings, and Help - supporting tools for findings, exports, configuration, and guidance.

## Removed features

- API Rate Limit Tester was removed from the product surface.
- Standalone API BOLA tester was removed from the product surface.
- Defensive API rate-limiting middleware remains enabled on the backend for protection.

## Technology stack

| Area | Stack |
|---|---|
| Client | React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React, Recharts |
| Server | Node.js, Express 4, TypeScript |
| Storage | SQLite using `better-sqlite3` |
| Validation / security middleware | Zod, Helmet, CORS, Express Rate Limit |
| Tests | Vitest and Supertest |

## Safety and data boundaries

- The OWASP assessment is limited to registered local demo targets; do not test arbitrary external systems without explicit authorization.
- The URL safety analyzer is passive and only inspects submitted URL structure locally.
- Geolocation requests are made to the configured public provider by the backend; verify provider terms before use.
- Identity Attack Paths uses fictional data and labels findings as simulated examples.
- OSINT Explorer is a directory and learning interface only; it does not scrape, collect data, or bypass access controls.
- Public information may be incomplete, stale, or inaccurate; treat it as educational context only.

## Run locally on Windows

```powershell
cd C:\omniSec-Analyzer\server
npm install
npm run dev
```

Open a second terminal:

```powershell
cd C:\omniSec-Analyzer\client
npm install
npm run dev
```

The backend defaults to port `5000`, and the Vite app typically runs on `http://localhost:5173`.

## Tests

```powershell
cd C:\omniSec-Analyzer\client
npm run build
npm run lint

cd C:\omniSec-Analyzer\server
npm test
```

The project currently validates client build/lint behavior and server API/lab tests using Vitest and Supertest.
