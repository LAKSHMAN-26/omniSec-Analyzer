import React, { useState } from 'react';
import { apiService } from '../../services/api';
import type { RateLimitScanResponse } from '../../types';
import { RiskBadge } from '../RiskBadge';
import { TooltipInfo } from '../TooltipInfo';
import { Gauge, Zap, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const RateLimiter: React.FC = () => {
  const [targetEndpoint, setTargetEndpoint] = useState<'protected' | 'unprotected'>('protected');
  const [requestLimit, setRequestLimit] = useState<number>(30);
  const [result, setResult] = useState<RateLimitScanResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleRunTest = async () => {
    setLoading(true);
    try {
      const res = await apiService.runRateLimitTest({
        targetEndpoint,
        requestLimit
      });
      setResult(res);
    } catch (err: any) {
      alert(`Error running rate limit test: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-sans">API Rate Limiting Tester</h1>
            <p className="text-xs text-emerald-400 font-mono">Request Throttling & Traffic Protection Audit</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed mt-2">
          Test rate limiting behavior against local demo APIs. Observe how HTTP 429 Too Many Requests responses protect server resources from request flooding.
          <TooltipInfo 
            term="Rate Limiting" 
            englishExplanation="Rate Limiting caps the number of API requests a user or client IP can make within a specified timeframe to prevent server overload and brute-force attacks."
          />
        </p>
      </div>

      {/* Test Configurator Panel */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
          <div>
            <label className="block text-xs font-mono font-semibold text-gray-300 uppercase mb-2">
              Select Demo API Target Endpoint
            </label>
            <select
              value={targetEndpoint}
              onChange={(e) => setTargetEndpoint(e.target.value as any)}
              className="w-full bg-[#0B0F19] border border-[#1F2937] text-white text-xs font-mono px-4 py-2.5 rounded-xl outline-none focus:border-emerald-500"
            >
              <option value="protected">/api/scans/rate-limit/target-protected (Rate Limited)</option>
              <option value="unprotected">/api/scans/rate-limit/target-unprotected (No Throttling)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-gray-300 uppercase mb-2">
              Simulated Request Batch Volume ({requestLimit} Requests)
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={requestLimit}
              onChange={(e) => setRequestLimit(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1">
              <span>10 Req</span>
              <span>50 Req</span>
              <span>100 Max</span>
            </div>
          </div>

          <button
            onClick={handleRunTest}
            disabled={loading}
            className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-black font-bold font-mono text-xs px-6 py-3 rounded-xl shadow-lg shadow-emerald-950 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {loading ? <span className="animate-spin">⌛</span> : <Zap className="w-4 h-4" />}
            <span>Run Safe Traffic Test</span>
          </button>
        </div>
      </div>

      {/* Results View */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metrics Summary Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-4 mb-4">
                <div>
                  <span className="text-xs font-mono text-gray-500 uppercase">Test Execution Details</span>
                  <h3 className="text-lg font-bold text-white font-mono">{result.targetEndpoint}</h3>
                </div>
                <RiskBadge 
                  statusOrSeverity={result.targetEndpoint.includes('protected') ? 'PASS' : 'HIGH'} 
                  size="md" 
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl text-center">
                  <div className="text-[10px] text-gray-500 font-mono">TOTAL REQUESTS</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">{result.totalRequests}</div>
                </div>

                <div className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl text-center">
                  <div className="text-[10px] text-gray-500 font-mono">200 OK SUCCESS</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{result.successfulCount}</div>
                </div>

                <div className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl text-center">
                  <div className="text-[10px] text-gray-500 font-mono">429 THROTTLED</div>
                  <div className="text-xl font-bold font-mono text-rose-400 mt-1">{result.rateLimitedCount}</div>
                </div>

                <div className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl text-center">
                  <div className="text-[10px] text-gray-500 font-mono">AVG LATENCY</div>
                  <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{result.averageResponseTimeMs} ms</div>
                </div>
              </div>

              <div className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl space-y-2">
                <div className="text-xs font-bold text-emerald-400 font-mono">SUMMARY REPORT:</div>
                <p className="text-xs text-gray-300 leading-relaxed">{result.summary}</p>
                <div className="text-xs text-cyan-300 font-mono pt-2 border-t border-gray-800">
                  Recommendation: {result.recommendation}
                </div>
              </div>
            </div>
          </div>

          {/* Status Distribution Chart */}
          <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-white font-mono uppercase mb-4 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>HTTP Response Status Distribution</span>
              </h3>

              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={[
                      { code: '200 OK', count: result.successfulCount, fill: '#10B981' },
                      { code: '429 Blocked', count: result.rateLimitedCount, fill: '#EF4444' }
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis dataKey="code" stroke="#6B7280" fontSize={11} />
                    <YAxis stroke="#6B7280" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1F2937', borderRadius: '8px' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      <Cell fill="#10B981" />
                      <Cell fill="#EF4444" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 text-[10px] text-gray-500 font-mono text-center">
              Evaluated using Express rate-limit middleware logic.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
