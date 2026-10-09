# OmniSec Analyzer — Client

This directory contains the React, TypeScript, Vite, and Tailwind CSS v4 frontend for OmniSec Analyzer. The client uses the app's sidebar-tab navigation and communicates with the Express API for server-backed features.

## Development

```powershell
npm install
npm run dev
```

Run `npm run build` for a TypeScript check and production bundle, or `npm run lint` to lint the client.

Start the backend separately from `..\server` with `npm run dev` for features that require API access. OSINT Explorer is a client-side resource directory; Identity Attack Paths is a fictional, client-side graph simulation. See the repository [README](../README.md) and [technical documentation](../TECHNICAL_DOCUMENTATION.md) for full setup, safety boundaries, and feature details.
