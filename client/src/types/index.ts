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
  status: 'FAIL' | 'PASS' | 'WARNING' | 'MANUAL REVIEW REQUIRED' | 'NOT TESTED';
}

export type GeolocationDataOrigin =
  | 'live_provider'
  | 'private_network'
  | 'invalid_input';

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
  isp?: string;
  asn?: string;
  timezone?: string;
  lat?: number;
  lon?: number;
  source: 'not_queried' | 'live_provider';
  dataOrigin: GeolocationDataOrigin;
  timestamp: string;
  disclaimer: string;
  error?: string;
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
  manualReviewCount: number;
  summary: string;
  categories: Array<{
    categoryId: string;
    categoryName: string;
    description: string;
    status: 'PASS' | 'FINDING' | 'WARNING' | 'MANUAL REVIEW REQUIRED' | 'NOT TESTED';
    title: string;
    evidence: string;
    remediation: string;
    docsUrl: string;
  }>;
}
