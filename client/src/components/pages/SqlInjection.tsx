import React, { useState } from 'react';
import { apiService } from '../../services/api';
import type { SqlScanResponse } from '../../types';
import { CodeCompare } from '../CodeCompare';
import { RiskBadge } from '../RiskBadge';
import { TooltipInfo } from '../TooltipInfo';
import { Database, Play, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';

export const SqlInjection: React.FC = () => {
  const [targetMode, setTargetMode] = useState<'vulnerable' | 'secure'>('vulnerable');
  const [scanResult, setScanResult] = useState<SqlScanResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Live Sandbox Interactive Tester state
  const [testPayload, setTestPayload] = useState<string>("' OR '1'='1");
  const [sandboxResponse, setSandboxResponse] = useState<any>(null);
  const [sandboxLoading, setSandboxLoading] = useState<boolean>(false);

  const handleRunScan = async () => {
    setLoading(true);
    try {
      const res = await apiService.runSqlScan(targetMode);
      setScanResult(res);
    } catch (err: any) {
      alert(`Error running SQL scan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSandboxTest = async () => {
    setSandboxLoading(true);
    try {
      const res = targetMode === 'vulnerable'
        ? await apiService.testSqlVulnerableDemo(testPayload)
        : await apiService.testSqlSecureDemo(testPayload);
      setSandboxResponse(res);
    } catch (err: any) {
      setSandboxResponse({ success: false, error: err.message });
    } finally {
      setSandboxLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-violet-950 text-violet-400 border border-violet-800 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-sans">SQL Injection Security Tester</h1>
            <p className="text-xs text-violet-400 font-mono">Database Query Security & Parameterization Audit</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed mt-2">
          Learn how unsanitized user inputs alter database logic and how parameterized queries completely stop SQL injection attacks.
          <TooltipInfo 
            term="SQL Injection" 
            englishExplanation="SQL Injection happens when raw user input is concatenated into a SQL string, allowing attackers to execute unexpected database commands."
          />
        </p>
      </div>

      {/* Target Selector & Scanner Controls */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-gray-300 uppercase mb-2">
              Select Demo Target Mode
            </label>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setTargetMode('vulnerable')}
                className={`px-4 py-2 rounded-xl font-mono text-xs font-bold border transition-all flex items-center space-x-2 ${
                  targetMode === 'vulnerable'
                    ? 'bg-rose-950 text-rose-300 border-rose-500 shadow-lg shadow-rose-950'
                    : 'bg-[#0B0F19] text-gray-400 border-gray-800 hover:border-gray-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Vulnerable Demo Endpoint (Risky)</span>
              </button>

              <button
                onClick={() => setTargetMode('secure')}
                className={`px-4 py-2 rounded-xl font-mono text-xs font-bold border transition-all flex items-center space-x-2 ${
                  targetMode === 'secure'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-lg shadow-emerald-950'
                    : 'bg-[#0B0F19] text-gray-400 border-gray-800 hover:border-gray-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Secure Demo Endpoint (Hardened)</span>
              </button>
            </div>
          </div>

          <button
            onClick={handleRunScan}
            disabled={loading}
            className="bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold font-mono text-xs px-6 py-3 rounded-xl shadow-lg shadow-violet-950 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {loading ? <span className="animate-spin">⌛</span> : <Play className="w-4 h-4" />}
            <span>Run Automated Security Test</span>
          </button>
        </div>
      </div>

      {/* Interactive Sandbox Test Box */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl">
        <h3 className="text-sm font-bold text-white font-mono uppercase mb-2 flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Interactive Query Sandbox</span>
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Type custom test payloads to see the exact SQL query evaluated by the backend database in {targetMode.toUpperCase()} mode.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={testPayload}
            onChange={(e) => setTestPayload(e.target.value)}
            placeholder="Payload e.g. ' OR '1'='1"
            className="flex-1 bg-[#0B0F19] border border-[#1F2937] rounded-xl px-4 py-2 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleSandboxTest}
            disabled={sandboxLoading}
            className="bg-gray-800 hover:bg-gray-700 text-cyan-400 font-mono text-xs px-4 py-2 rounded-xl border border-gray-700 font-semibold"
          >
            {sandboxLoading ? 'Testing...' : 'Execute Payload'}
          </button>
        </div>

        {/* Quick Payload Presets */}
        <div className="mt-3 flex items-center space-x-2 text-xs">
          <span className="text-gray-500 font-mono text-[10px]">Sample Payloads:</span>
          {["' OR '1'='1", "admin' --", "john_doe"].map(p => (
            <button
              key={p}
              onClick={() => { setTestPayload(p); }}
              className="bg-[#0B0F19] text-xs font-mono text-gray-400 hover:text-cyan-300 px-2 py-0.5 rounded border border-gray-800"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Sandbox Output Box */}
        {sandboxResponse && (
          <div className="mt-4 bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl space-y-2 font-mono text-xs">
            <div className="text-gray-400 text-[11px]">GENERATED BACKEND SQL QUERY:</div>
            <div className="text-cyan-400 font-bold bg-[#111827] p-2 rounded border border-gray-800">
              {sandboxResponse.query}
            </div>

            <div className="text-gray-400 text-[11px] pt-2">RETURNED DATABASE ROWS ({sandboxResponse.rows ? sandboxResponse.rows.length : 0} records):</div>
            <pre className="bg-[#111827] text-emerald-400 p-2 rounded border border-gray-800 overflow-x-auto text-[11px]">
              {JSON.stringify(sandboxResponse.rows || sandboxResponse.error, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Code Comparison Section */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl">
        <h3 className="text-sm font-bold text-white font-mono uppercase mb-2">
          Remediation Guidance & Code Comparison
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Compare vulnerable string concatenation vs secure parameterized SQL statements:
        </p>

        <CodeCompare
          vulnerableSnippet={`// ❌ VULNERABLE CODE (String Concatenation)
// User payload: "' OR '1'='1"
const rawQuery = \`SELECT * FROM users WHERE username = '\${req.body.username}'\`;
// Executes as: SELECT * FROM users WHERE username = '' OR '1'='1' (Bypasses Auth!)
const user = db.query(rawQuery);`}
          secureSnippet={`// ✅ SECURE CODE (Parameterized Queries)
// User payload: "' OR '1'='1"
const query = 'SELECT * FROM users WHERE username = ?';
// Executes safely: The database engine treats payload as a literal string value!
const user = db.prepare(query).all(req.body.username);`}
        />
      </div>

      {/* Scan Results Table */}
      {scanResult && (
        <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
            <div>
              <span className="text-xs font-mono text-gray-500 uppercase">Assessment Completed</span>
              <h3 className="text-lg font-bold text-white font-mono">{scanResult.scanId}</h3>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono text-rose-400 font-bold">{scanResult.findingsCount} Findings</span>
              <span className="text-xs font-mono text-emerald-400 font-bold">{scanResult.passedCount} Passed</span>
            </div>
          </div>

          <p className="text-xs text-gray-300 bg-[#0B0F19] p-3 rounded-xl border border-gray-800">
            {scanResult.summary}
          </p>

          <div className="space-y-3">
            {scanResult.findings.map((f) => (
              <div key={f.id} className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">{f.title}</h4>
                  <RiskBadge statusOrSeverity={f.status} size="sm" />
                </div>
                <div className="text-xs text-gray-400 font-mono">Affected Endpoint: {f.affectedTarget}</div>
                <div className="text-xs text-cyan-300 font-mono bg-[#111827] p-2 rounded border border-gray-800">
                  Evidence: {f.evidence}
                </div>
                <div className="text-xs text-gray-300">
                  <strong className="text-rose-400">Risk Explanation:</strong> {f.riskExplanation}
                </div>
                <div className="text-xs text-emerald-400 bg-emerald-950/20 p-2 rounded border border-emerald-900/40">
                  <strong>How to Fix (Remediation):</strong> {f.remediation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
