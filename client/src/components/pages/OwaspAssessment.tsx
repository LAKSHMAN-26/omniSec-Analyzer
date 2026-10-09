import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/api';
import { analyzeUrlSafetyLocally, type UrlAnalysisResult } from '../../services/urlAnalyzer';
import { RiskBadge } from '../RiskBadge';
import { TooltipInfo } from '../TooltipInfo';
import { 
  ShieldAlert, 
  Play, 
  Square, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  Clock, 
  Server, 
  Clipboard, 
  Trash2, 
  Search, 
  ShieldCheck, 
  ShieldX, 
  Info 
} from 'lucide-react';

interface RealtimeCheck {
  id?: string;
  category_id?: string;
  categoryId?: string;
  category_name?: string;
  categoryName?: string;
  check_name?: string;
  checkName?: string;
  target_endpoint?: string;
  endpoint?: string;
  status: 'PASS' | 'FINDING' | 'WARNING' | 'MANUAL REVIEW REQUIRED' | 'NOT TESTED' | 'INCONCLUSIVE';
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational' | 'None';
  confidence: 'High' | 'Medium' | 'Low';
  evidence: string;
  remediation: string;
  limitations: string;
  wstgReferences?: Array<{ id: string; url: string }>;
}

interface TargetItem {
  id: string;
  name: string;
  target_type: 'vulnerable' | 'secure';
  base_url: string;
  description: string;
}

export const OwaspAssessment: React.FC = () => {
  // URL Safety Input & Analysis State
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlResult, setUrlResult] = useState<UrlAnalysisResult | null>(null);
  const [analyzingUrl, setAnalyzingUrl] = useState<boolean>(false);

  // Local Educational Lab Targets & OWASP Scanner State
  const [targets, setTargets] = useState<TargetItem[]>([
    {
      id: 'lab-vulnerable',
      name: 'Vulnerable Demo Application',
      target_type: 'vulnerable',
      base_url: 'http://127.0.0.1:5000/api/lab/vulnerable',
      description: 'Deliberately weakened educational demo demonstrating OWASP Top 10 flaws.'
    },
    {
      id: 'lab-secure',
      name: 'Secure Demo Application',
      target_type: 'secure',
      base_url: 'http://127.0.0.1:5000/api/lab/secure',
      description: 'Hardened defensive implementation enforcing authentication, parameterized queries, and security headers.'
    }
  ]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('lab-vulnerable');
  const [selectedEdition, setSelectedEdition] = useState<string>('2021');

  // Real-time scan states
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'RUNNING' | 'COMPLETED' | 'CANCELLED'>('IDLE');
  const [currentTestName, setCurrentTestName] = useState<string>('');
  const [currentEndpoint, setCurrentEndpoint] = useState<string>('');
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [findingsCount, setFindingsCount] = useState<number>(0);
  const [warningsCount, setWarningsCount] = useState<number>(0);
  const [passedCount, setPassedCount] = useState<number>(0);
  const [manualReviewCount, setManualReviewCount] = useState<number>(0);

  const [checks, setChecks] = useState<RealtimeCheck[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Load registered lab targets on mount
  useEffect(() => {
    apiService.getRealtimeTargets()
      .then((res) => {
        if (res.targets && res.targets.length > 0) {
          setTargets(res.targets);
        }
      })
      .catch((err) => {
        console.warn('API targets load notice:', err.message);
        // Fallback default targets already present in state
      });

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // 1. URL Analysis Actions (Purely passive, ZERO network requests to target)
  const handleCheckUrlSafety = async () => {
    if (!urlInput.trim()) {
      setUrlResult(analyzeUrlSafetyLocally(''));
      return;
    }

    setAnalyzingUrl(true);
    setErrorMsg(null);

    try {
      // First try backend analyzer; fallback to local analyzer if network is blocked
      const result = await apiService.checkUrlSafety(urlInput);
      setUrlResult(result);
    } catch {
      // Perform 100% in-memory client analysis seamlessly
      const localResult = analyzeUrlSafetyLocally(urlInput);
      setUrlResult(localResult);
    } finally {
      setAnalyzingUrl(false);
    }
  };

  const handlePasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrlInput(text.trim());
      }
    } catch {
      // Clipboard permissions denied; prompt user
      const pasted = window.prompt('Paste URL here:');
      if (pasted) setUrlInput(pasted.trim());
    }
  };

  const handleClearUrl = () => {
    setUrlInput('');
    setUrlResult(null);
  };

  const handleQuickExample = (exampleUrl: string) => {
    setUrlInput(exampleUrl);
  };

  // 2. Local Educational Lab OWASP Scanning
  const handleStartLabScan = async () => {
    setErrorMsg(null);
    setChecks([]);
    setCompletedCount(0);
    setFindingsCount(0);
    setWarningsCount(0);
    setPassedCount(0);
    setManualReviewCount(0);
    setSummary('');
    setCurrentTestName('Initializing local educational target...');
    setScanStatus('RUNNING');

    try {
      // Always tests registered local lab target only (never arbitrary user URLs)
      const res = await apiService.startRealtimeScan(selectedTargetId, selectedEdition);
      const jobId = res.jobId;
      setActiveJobId(jobId);

      const sseUrl = `http://localhost:5000/api/scans/realtime/stream/${jobId}`;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener('check_start', (e) => {
        const data = JSON.parse(e.data);
        setCurrentTestName(data.checkName);
        setCurrentEndpoint(data.endpoint);
        setTotalCount(data.totalChecks || 0);
      });

      es.addEventListener('check_result', (e) => {
        const checkData = JSON.parse(e.data);
        setChecks((prev) => [...prev, checkData]);
        setCompletedCount((prev) => prev + 1);

        if (checkData.status === 'FINDING') setFindingsCount((prev) => prev + 1);
        else if (checkData.status === 'WARNING') setWarningsCount((prev) => prev + 1);
        else if (checkData.status === 'PASS') setPassedCount((prev) => prev + 1);
        else if (checkData.status === 'MANUAL REVIEW REQUIRED') setManualReviewCount((prev) => prev + 1);
      });

      es.addEventListener('job_complete', (e) => {
        const completeData = JSON.parse(e.data);
        setScanStatus('COMPLETED');
        setCurrentTestName('Educational scan completed successfully.');
        setSummary(completeData.summary || 'Security assessment completed.');
        es.close();
      });

      es.addEventListener('job_cancelled', () => {
        setScanStatus('CANCELLED');
        setCurrentTestName('Scan stopped by user.');
        setSummary('Assessment was cancelled. Partial findings recorded.');
        es.close();
      });

      es.onerror = () => {
        es.close();
      };
    } catch (err: any) {
      setScanStatus('IDLE');
      setErrorMsg(err.message || 'Cannot connect to CyberSentinel backend API. Please ensure backend is running.');
    }
  };

  const handleStopScan = async () => {
    if (!activeJobId) return;
    try {
      await apiService.cancelRealtimeScan(activeJobId);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setScanStatus('CANCELLED');
      setCurrentTestName('Scan stopped by user.');
    } catch (err: any) {
      console.error('Error cancelling scan:', err);
    }
  };

  const selectedTarget = targets.find((t) => t.id === selectedTargetId);
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-sans">
              CyberSentinel AI — Real-Time OWASP Top 10 + WSTG Scanner
            </h1>
            <p className="text-xs text-cyan-400 font-mono">
              Passive URL Safety Analyzer & Loopback Educational Lab Audit
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed mt-2">
          Analyze web links locally without visiting them. For active vulnerability assessments, the scanner tests strictly against registered internal educational lab demo applications (<code className="text-cyan-300 font-mono">127.0.0.1</code> loopback only).
          <TooltipInfo 
            term="Passive Safety" 
            englishExplanation="Passive analysis evaluates URL structure, syntax, and known phishing patterns completely offline without sending any network packets to the destination."
          />
        </p>
      </div>

      {/* Control Box: URL Input & Lab Scanner Options */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl space-y-6">
        {/* SECTION 1: ENTER URL TO CHECK */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-2">
              <Search className="w-4 h-4 text-cyan-400" />
              <span>ENTER URL TO CHECK</span>
            </label>
            <div className="flex items-center space-x-2 text-[11px] font-mono text-gray-400">
              <span>Quick Examples:</span>
              <button 
                type="button"
                onClick={() => handleQuickExample('https://example.com')}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                https://example.com
              </button>
              <span>|</span>
              <button 
                type="button"
                onClick={() => handleQuickExample('https://paypa1-security.com/login?redirect=http://evil.com')}
                className="text-amber-400 hover:underline cursor-pointer"
              >
                Lookalike
              </button>
              <span>|</span>
              <button 
                type="button"
                onClick={() => handleQuickExample('http://192.168.1.1/admin')}
                className="text-rose-400 hover:underline cursor-pointer"
              >
                Private IP
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCheckUrlSafety(); }}
                placeholder="Paste a URL to analyze its safety... (e.g. https://example.com)"
                className="w-full bg-[#0B1020] border border-[#1F2937] text-white text-xs font-mono px-4 py-3 rounded-xl outline-none focus:border-cyan-500 placeholder-gray-500 transition-colors"
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={handleClearUrl}
                  title="Clear URL input"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePasteUrl}
                className="bg-[#1F2937] hover:bg-[#374151] text-gray-200 text-xs font-mono px-3.5 py-3 rounded-xl border border-[#374151] flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Paste from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5 text-cyan-400" />
                <span>Paste</span>
              </button>

              <button
                type="button"
                onClick={handleClearUrl}
                className="bg-[#1F2937] hover:bg-[#374151] text-gray-200 text-xs font-mono px-3.5 py-3 rounded-xl border border-[#374151] flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Clear input"
              >
                <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Clear</span>
              </button>

              <button
                type="button"
                onClick={handleCheckUrlSafety}
                disabled={analyzingUrl}
                className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-black font-bold font-mono text-xs px-5 py-3 rounded-xl shadow-lg shadow-cyan-950/60 flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {analyzingUrl ? <span className="animate-spin">⌛</span> : <Search className="w-4 h-4 text-black" />}
                <span>Check URL Safety</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] font-mono text-gray-500">
            ℹ️ Passive evaluation only. Pasting or analyzing a URL never initiates an outbound network request or visits the site.
          </p>
        </div>

        {/* SECTION 2: LOCAL OWASP LAB TARGET SELECTOR */}
        <div className="border-t border-[#1F2937] pt-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
            <div>
              <label className="block text-xs font-mono font-semibold text-gray-300 uppercase mb-2 flex items-center space-x-1.5">
                <Server className="w-3.5 h-3.5 text-violet-400" />
                <span>Select Educational Lab Demo Target</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTargetId('lab-vulnerable')}
                  disabled={scanStatus === 'RUNNING'}
                  className={`p-3 rounded-xl text-left border transition-all text-xs font-mono ${
                    selectedTargetId === 'lab-vulnerable'
                      ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                      : 'bg-[#0B1020] border-[#1F2937] text-gray-400 hover:border-[#374151]'
                  }`}
                >
                  <div className="font-bold text-rose-400">Vulnerable Demo</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Deliberate flaws</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTargetId('lab-secure')}
                  disabled={scanStatus === 'RUNNING'}
                  className={`p-3 rounded-xl text-left border transition-all text-xs font-mono ${
                    selectedTargetId === 'lab-secure'
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                      : 'bg-[#0B1020] border-[#1F2937] text-gray-400 hover:border-[#374151]'
                  }`}
                >
                  <div className="font-bold text-emerald-400">Secure Demo</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Defensive practices</div>
                </button>
              </div>
              {selectedTarget && (
                <p className="text-[11px] font-mono text-gray-500 mt-1.5 truncate">
                  Target: <span className="text-cyan-400">{selectedTarget.base_url}</span> (127.0.0.1)
                </p>
              )}
            </div>

            {/* OWASP Edition */}
            <div>
              <label className="block text-xs font-mono font-semibold text-gray-300 uppercase mb-2">
                OWASP Standard Edition
              </label>
              <select
                value={selectedEdition}
                onChange={(e) => setSelectedEdition(e.target.value)}
                disabled={scanStatus === 'RUNNING'}
                className="w-full bg-[#0B1020] border border-[#1F2937] text-white text-xs font-mono px-4 py-3 rounded-xl outline-none focus:border-cyan-500 disabled:opacity-50"
              >
                <option value="2021">OWASP Top 10 - 2021 Edition (Current Standard)</option>
                <option value="2025">OWASP Top 10 - 2025 Draft Edition (Emerging)</option>
              </select>
              <p className="text-[11px] font-mono text-gray-500 mt-1">
                Fixed backend allowlist prevents scanning arbitrary destinations.
              </p>
            </div>

            {/* Scan Trigger Button */}
            <div className="flex items-center space-x-3">
              {scanStatus !== 'RUNNING' ? (
                <button
                  type="button"
                  onClick={handleStartLabScan}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold font-mono text-xs px-6 py-3 rounded-xl shadow-lg shadow-violet-950/80 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Local Lab Scan</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopScan}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold font-mono text-xs px-6 py-3 rounded-xl shadow-lg shadow-red-950 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop / Cancel Scan</span>
                </button>
              )}

              {activeJobId && (
                <div className="flex space-x-2">
                  <a
                    href={apiService.getRealtimeReportUrl(activeJobId, 'json')}
                    download
                    className="bg-[#1F2937] hover:bg-[#374151] text-cyan-300 p-3 rounded-xl border border-[#374151] flex items-center space-x-1 text-xs font-mono"
                    title="Download JSON Report"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">JSON</span>
                  </a>
                  <a
                    href={apiService.getRealtimeReportUrl(activeJobId, 'html')}
                    download
                    className="bg-[#1F2937] hover:bg-[#374151] text-violet-300 p-3 rounded-xl border border-[#374151] flex items-center space-x-1 text-xs font-mono"
                    title="Download HTML Printable Report"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">HTML</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-start space-x-2">
            <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <strong>Error Notice:</strong> {errorMsg}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: URL SAFETY ANALYSIS RESULT CARD */}
      {urlResult && (
        <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2937] pb-4">
            <div className="flex items-center space-x-3">
              {urlResult.verdict === 'VALIDATION PASSED' && (
                <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              )}
              {urlResult.verdict === 'SUSPICIOUS' && (
                <div className="w-9 h-9 rounded-xl bg-amber-950 text-amber-400 border border-amber-800 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              {urlResult.verdict === 'BLOCKED' && (
                <div className="w-9 h-9 rounded-xl bg-rose-950 text-rose-400 border border-rose-800 flex items-center justify-center">
                  <ShieldX className="w-5 h-5" />
                </div>
              )}
              {urlResult.verdict === 'UNVERIFIED' && (
                <div className="w-9 h-9 rounded-xl bg-violet-950 text-violet-400 border border-violet-800 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
              )}
              <div>
                <span className="text-[10px] font-mono text-gray-500 uppercase">URL Safety Verdict</span>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold font-mono text-white">
                    {urlResult.verdict}
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                urlResult.verdict === 'VALIDATION PASSED' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                urlResult.verdict === 'SUSPICIOUS' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                urlResult.verdict === 'BLOCKED' ? 'bg-rose-950 text-rose-300 border-rose-800' :
                'bg-violet-950 text-violet-300 border-violet-800'
              }`}>
                {urlResult.verdict === 'VALIDATION PASSED' ? 'Syntax Passed' :
                 urlResult.verdict === 'SUSPICIOUS' ? 'Suspicious Indicators' :
                 urlResult.verdict === 'BLOCKED' ? 'Prohibited / Blocked Target' :
                 'Unverified Format'}
              </span>
            </div>
          </div>

          {/* Technical Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="bg-[#0B1020] p-3 rounded-xl border border-[#1F2937]">
              <span className="text-gray-500 block text-[10px] uppercase">Submitted URL</span>
              <span className="text-cyan-300 break-all select-all">{urlResult.submittedUrl || 'None'}</span>
            </div>
            <div className="bg-[#0B1020] p-3 rounded-xl border border-[#1F2937]">
              <span className="text-gray-500 block text-[10px] uppercase">Parsed Hostname</span>
              <span className="text-gray-200">{urlResult.parsedHostname}</span>
            </div>
            <div className="bg-[#0B1020] p-3 rounded-xl border border-[#1F2937]">
              <span className="text-gray-500 block text-[10px] uppercase">Protocol & Port</span>
              <span className="text-gray-200">{urlResult.protocol.toUpperCase()} ({urlResult.port})</span>
            </div>
          </div>

          {/* Detected Warning Signs */}
          {urlResult.warnings.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Detected Warning Signs ({urlResult.warnings.length})</span>
              </h3>
              <div className="grid grid-cols-1 gap-2.5">
                {urlResult.warnings.map((w, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-xl border text-xs font-sans ${
                      w.severity === 'HIGH' ? 'bg-rose-950/30 border-rose-800/60' :
                      w.severity === 'MEDIUM' ? 'bg-amber-950/30 border-amber-800/60' :
                      'bg-gray-900 border-gray-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-mono font-bold">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        w.severity === 'HIGH' ? 'bg-rose-900 text-rose-300' :
                        w.severity === 'MEDIUM' ? 'bg-amber-900 text-amber-300' :
                        'bg-gray-800 text-gray-300'
                      }`}>
                        {w.severity}
                      </span>
                      <span className="text-white text-xs">{w.title}</span>
                      <span className="text-gray-500 text-[10px] font-normal">({w.code})</span>
                    </div>
                    <p className="text-gray-300 text-xs mt-1 leading-relaxed">
                      {w.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Next Steps */}
          {urlResult.recommendedNextSteps.length > 0 && (
            <div className="space-y-1.5 text-xs font-sans bg-[#0B1020] p-4 rounded-xl border border-[#1F2937]">
              <span className="font-mono text-cyan-400 text-[11px] font-bold uppercase block">Recommended Next Steps:</span>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                {urlResult.recommendedNextSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Checks Performed vs Not Performed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div className="bg-[#0B1020] p-3.5 rounded-xl border border-[#1F2937] space-y-1.5">
              <span className="font-mono text-emerald-400 text-[11px] font-bold uppercase flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Checks Performed ({urlResult.checksPerformed.length})</span>
              </span>
              <ul className="space-y-1 text-[11px] text-gray-300">
                {urlResult.checksPerformed.map((cp, idx) => (
                  <li key={idx} className="flex items-start space-x-1.5">
                    <span className="text-emerald-400">✓</span>
                    <span>{cp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#0B1020] p-3.5 rounded-xl border border-[#1F2937] space-y-1.5">
              <span className="font-mono text-gray-400 text-[11px] font-bold uppercase flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-gray-400" />
                <span>Checks NOT Performed ({urlResult.checksNotPerformed.length})</span>
              </span>
              <ul className="space-y-1 text-[11px] text-gray-400">
                {urlResult.checksNotPerformed.map((cnp, idx) => (
                  <li key={idx} className="flex items-start space-x-1.5">
                    <span className="text-gray-500">✗</span>
                    <span>{cnp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Live Reputation Notice & Safety Disclaimer */}
          <div className="space-y-2 pt-2 border-t border-[#1F2937] text-xs">
            <div className="flex items-center space-x-2 text-[11px] font-mono text-gray-400">
              <span className="text-amber-400 font-bold">Reputation Status:</span>
              <span>{urlResult.liveReputation.status}</span>
              <span className="text-gray-600">({urlResult.liveReputation.details})</span>
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-amber-200/90 text-xs flex items-start space-x-2">
              <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="leading-relaxed">
                <strong>Warning:</strong> {urlResult.disclaimer}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: REAL-TIME OWASP LAB SCAN PROGRESS PANEL */}
      {scanStatus !== 'IDLE' && (
        <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
              <span className={`w-3 h-3 rounded-full ${scanStatus === 'RUNNING' ? 'bg-cyan-400 animate-pulse' : scanStatus === 'COMPLETED' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className="text-sm font-bold font-mono uppercase text-gray-200">
                Status: <span className={scanStatus === 'RUNNING' ? 'text-cyan-400' : scanStatus === 'COMPLETED' ? 'text-emerald-400' : 'text-red-400'}>{scanStatus}</span>
              </span>
              {activeJobId && (
                <span className="text-xs font-mono text-gray-500 bg-[#0B0F19] px-2 py-0.5 rounded border border-[#1F2937]">
                  {activeJobId}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono">
              <span className="text-emerald-400 font-bold">{passedCount} Passed</span>
              <span className="text-red-400 font-bold">{findingsCount} Findings</span>
              <span className="text-amber-400 font-bold">{warningsCount} Warnings</span>
              <span className="text-violet-400 font-bold">{manualReviewCount} Manual Review</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-gray-400">
              <span className="truncate">Current: <span className="text-cyan-300">{currentTestName || 'Idle'}</span> {currentEndpoint && <code className="text-gray-500 text-[11px]">({currentEndpoint})</code>}</span>
              <span>{completedCount} / {totalCount} checks ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-[#0B0F19] h-2.5 rounded-full overflow-hidden border border-[#1F2937]">
              <div 
                className={`h-full transition-all duration-300 ${scanStatus === 'CANCELLED' ? 'bg-red-500' : 'bg-gradient-to-r from-cyan-500 to-violet-500'}`} 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {summary && (
            <p className="text-xs text-gray-300 bg-[#0B0F19] p-3 rounded-xl border border-[#1F2937] leading-relaxed">
              📋 {summary}
            </p>
          )}
        </div>
      )}

      {/* SECTION 5: ASSESSMENT CARDS GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-gray-400">
            OWASP Top 10 & WSTG Assessment Checks ({checks.length} checks logged)
          </h2>
          <span className="text-xs font-mono text-gray-500">
            Target: {selectedTarget ? selectedTarget.name : 'Local Lab'}
          </span>
        </div>

        {checks.length === 0 && scanStatus === 'IDLE' && (
          <div className="bg-[#111827] border border-[#1F2937] p-12 rounded-2xl text-center text-gray-500">
            <ShieldAlert className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400">No active scan running on educational lab.</p>
            <p className="text-xs mt-1">Select Vulnerable or Secure Demo above and click "Start Local Lab Scan" to inspect live defenses.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {checks.map((check, idx) => {
            const catId = check.categoryId || check.category_id || `A0${idx + 1}:2021`;
            const catName = check.categoryName || check.category_name || 'Category';
            const checkTitle = check.checkName || check.check_name || 'Check';
            const endpoint = check.endpoint || check.target_endpoint || '';

            return (
              <div 
                key={check.id || idx}
                className="bg-[#111827] border border-[#1F2937] hover:border-[#374151] rounded-2xl p-5 transition-all space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2937] pb-3">
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      {check.status === 'PASS' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                      {check.status === 'FINDING' && <XCircle className="w-5 h-5 text-red-400" />}
                      {check.status === 'WARNING' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                      {check.status === 'MANUAL REVIEW REQUIRED' && <HelpCircle className="w-5 h-5 text-violet-400" />}
                      {check.status === 'INCONCLUSIVE' && <Clock className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                          {catId}
                        </span>
                        <h3 className="text-sm font-bold text-white font-sans">
                          {catName}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-300 font-mono mt-1">
                        {checkTitle}
                      </p>
                      {check.wstgReferences && check.wstgReferences.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {check.wstgReferences.map((reference) => (
                            <a
                              key={reference.id}
                              href={reference.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded border border-violet-800/70 bg-violet-950/40 px-2 py-0.5 font-mono text-[10px] text-violet-300 hover:text-violet-200"
                            >
                              {reference.id} ↗
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center space-x-2">
                    <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                      check.status === 'PASS' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                      check.status === 'FINDING' ? 'bg-red-950 text-red-300 border-red-800' :
                      check.status === 'WARNING' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                      check.status === 'MANUAL REVIEW REQUIRED' ? 'bg-violet-950 text-violet-300 border-violet-800' :
                      'bg-gray-800 text-gray-300 border-gray-700'
                    }`}>
                      {check.status}
                    </span>

                    {check.severity && check.severity !== 'None' && (
                      <RiskBadge statusOrSeverity={check.severity} size="sm" />
                    )}

                    <span className="text-[10px] font-mono text-gray-400 bg-[#0B0F19] px-2 py-1 rounded border border-[#1F2937]">
                      Conf: {check.confidence}
                    </span>
                  </div>
                </div>

                {/* Evidence & Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="space-y-1">
                    <span className="font-mono text-gray-400 text-[11px] uppercase font-bold">Tested Endpoint & Evidence:</span>
                    {endpoint && (
                      <p className="font-mono text-gray-400 text-[11px]">
                        Target: <code className="text-cyan-300">{endpoint}</code>
                      </p>
                    )}
                    <pre className="bg-[#0B0F19] border border-[#1F2937] p-3 rounded-xl font-mono text-[11px] text-cyan-200/90 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                      {check.evidence || 'No technical evidence required for this check.'}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="font-mono text-emerald-400 text-[11px] uppercase font-bold">Remediation Guidance:</span>
                      <p className="text-gray-300 leading-relaxed mt-0.5 bg-[#0B0F19] p-2.5 rounded-xl border border-[#1F2937]">
                        {check.remediation}
                      </p>
                    </div>

                    <div>
                      <span className="font-mono text-gray-500 text-[11px] uppercase font-bold">Test Limitations:</span>
                      <p className="text-gray-400 leading-relaxed mt-0.5 italic text-[11px]">
                        {check.limitations}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
