export interface ScanHistoryItem {
  id: string;
  module_name: string;
  target_environment: string;
  start_time: string;
  completion_time: string;
  status: string;
  findings_count: number;
  warnings_count: number;
  passed_count: number;
  errors_count?: number;
  untested_count?: number;
  summary: string;
}

export interface ScanFinding {
  id: string;
  scan_id: string;
  title: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  affected_target: string;
  evidence: string;
  risk_explanation: string;
  remediation: string;
  status: 'FAIL' | 'PASS' | 'WARNING' | 'MANUAL REVIEW REQUIRED' | 'NOT TESTED' | 'ERROR';
}

export type GeolocationDataOrigin =
  | 'live_provider'
  | 'private_network'
  | 'invalid_input'
  | 'demo_data';

export interface GeolocationProviderStatus {
  provider: 'ipapi.co';
  authenticationRequired: false;
  message: string;
}

export interface GeolocationData {
  ip: string;
  version: 'IPv4' | 'IPv6' | 'Invalid';
  isValid: boolean;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  village?: string;
  town?: string;
  district?: string;
  postalCode?: string;
  isp?: string;
  asn?: string;
  connectionType?: string;
  timezone?: string;
  lat?: number | string;
  lon?: number | string;
  source: 'not_queried' | 'live_provider' | 'demo_data';
  dataOrigin: GeolocationDataOrigin;
  timestamp: string;
  disclaimer: string;
  error?: string;
  isDemoData?: boolean;
}

export interface SqlScanResponse {
  scanId: string;
  targetMode: 'vulnerable' | 'secure';
  timestamp: string;
  status: string;
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

export interface OwaspScanResponse {
  scanId: string;
  owaspEdition: string;
  timestamp: string;
  status: string;
  findingsCount: number;
  warningsCount: number;
  passedCount: number;
  errorsCount?: number;
  untestedCount?: number;
  manualReviewCount: number;
  summary: string;
  targetEnvironment?: string;
  disclaimer?: string;
  categories: Array<{
    categoryId: string;
    categoryName: string;
    description: string;
    status: 'PASS' | 'FAIL' | 'FINDING' | 'WARNING' | 'MANUAL REVIEW REQUIRED' | 'NOT TESTED' | 'ERROR';
    title: string;
    evidence: string;
    explanation?: string;
    remediation: string;
    docsUrl: string;
    durationMs?: number;
    timestamp?: string;
  }>;
}
