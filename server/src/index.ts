import { app } from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
┌─────────────────────────────────────────────────────────┐
│              CyberSentinel AI Backend API               │
│               Detect. Analyze. Protect.                 │
├─────────────────────────────────────────────────────────┤
│  Server running at: http://localhost:${PORT}             │
│  Health check:     http://localhost:${PORT}/api/health     │
│  Environment:      ${process.env.NODE_ENV || 'development'}                     │
└─────────────────────────────────────────────────────────┘
  `);
});
