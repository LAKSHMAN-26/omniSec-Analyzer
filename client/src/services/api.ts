import type { 
  ScanHistoryItem, 
  ScanFinding, 
  GeolocationData,
  GeolocationProviderStatus,
  SqlScanResponse, 
  OwaspScanResponse
} from '../types';
import type { UrlAnalysisResult } from './urlAnalyzer';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      ...options
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out while contacting CyberSentinel API.');
    }
    // Handle offline / connection refused / CORS block with a clear, helpful message
    throw new Error(
      `Cannot connect to API server at ${API_BASE_URL}. Please ensure the backend is running (cd server && npm run dev).`
    );
  }

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    if (res.status === 404) {
      errorMsg = `API endpoint not found (404): ${url}`;
    } else if (res.status === 503) {
      errorMsg = 'Backend service or database is unavailable (503).';
    } else if (res.status === 429) {
      errorMsg = 'API rate limit exceeded. Please wait a moment before trying again.';
    }

    try {
      const errBody = await res.json();
      if (errBody.message) errorMsg = errBody.message;
      else if (errBody.error) errorMsg = errBody.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const apiService = {
  // Health
  getHealth: () => fetchJson<{ status: string; service?: string; uptime?: number; databaseConnected?: boolean; totalScansInDb?: number }>('/health'),

  // URL Safety Analyzer (Passive, local educational inspection)
  checkUrlSafety: (url: string) => fetchJson<UrlAnalysisResult>('/url-analyzer/check', {
    method: 'POST',
    body: JSON.stringify({ url })
  }),

  // Geolocation
  getGeolocationProviderStatus: () => fetchJson<GeolocationProviderStatus>('/geolocation/provider-status'),
  lookupIp: (ip: string, signal?: AbortSignal) => fetchJson<GeolocationData>(`/geolocation/${encodeURIComponent(ip)}`, {
    signal
  }),

  // SQL Injection
  runSqlScan: (targetMode: 'vulnerable' | 'secure') => 
    fetchJson<SqlScanResponse>('/scans/sql-injection/scan', {
      method: 'POST',
      body: JSON.stringify({ targetMode })
    }),

  testSqlVulnerableDemo: (username: string) =>
    fetchJson<{ success: boolean; query: string; rows: any[]; error: string | null }>('/scans/sql-injection/demo-vulnerable', {
      method: 'POST',
      body: JSON.stringify({ username })
    }),

  testSqlSecureDemo: (username: string) =>
    fetchJson<{ success: boolean; query: string; rows: any[]; error: string | null }>('/scans/sql-injection/demo-secure', {
      method: 'POST',
      body: JSON.stringify({ username })
    }),

  // OWASP Top 10
  runOwaspScan: (owaspEdition?: string) =>
    fetchJson<OwaspScanResponse>('/scans/owasp/scan', {
      method: 'POST',
      body: JSON.stringify({ owaspEdition })
    }),

  // Scan History
  getScanHistory: () => fetchJson<{ status: string; data: ScanHistoryItem[] }>('/scans/history'),
  
  getScanDetails: (id: string) => fetchJson<{ status: string; data: { scan: ScanHistoryItem; findings: ScanFinding[] } }>(`/scans/${id}`),

  clearScanHistory: () => fetchJson<{ status: string; message: string }>('/scans/history', { method: 'DELETE' }),

  // Reports
  getReportUrl: (scanId: string, format: 'json' | 'html' = 'html') => `${API_BASE_URL}/reports/${scanId}?format=${format}`,

  // Settings
  getSettings: () => fetchJson<{ status: string; data: Record<string, string> }>('/settings'),
  updateSettings: (settings: Record<string, string>) => fetchJson<{ status: string; message: string }>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  }),

  // Real-Time Educational Lab OWASP Scanner
  getRealtimeTargets: () => fetchJson<{ targets: Array<{ id: string; name: string; target_type: 'vulnerable' | 'secure'; base_url: string; description: string }> }>('/scans/realtime/targets'),
  startRealtimeScan: (targetId: string, owaspEdition: string = '2021') => fetchJson<{ status: string; jobId: string; message: string }>('/scans/realtime/start', {
    method: 'POST',
    body: JSON.stringify({ targetId, owaspEdition })
  }),
  cancelRealtimeScan: (jobId: string) => fetchJson<{ status: string; message: string }>(`/scans/realtime/cancel/${jobId}`, {
    method: 'POST'
  }),
  getRealtimeJobs: () => fetchJson<{ jobs: any[] }>('/scans/realtime/jobs'),
  getRealtimeJob: (jobId: string) => fetchJson<{ job: any; checks: any[]; findings: any[] }>(`/scans/realtime/jobs/${jobId}`),
  getRealtimeReportUrl: (jobId: string, format: 'json' | 'html' = 'html') => `${API_BASE_URL}/scans/realtime/reports/${jobId}/download?format=${format}`
};
