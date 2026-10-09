import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import type { ScanHistoryItem } from '../../types';
import { StatCard } from '../StatCard';
import { RiskBadge } from '../RiskBadge';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Globe, 
  Database, 
  ShieldAlert, 
  Gauge, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface OverviewProps {
  setActiveTab: (tab: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({ setActiveTab }) => {
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getScanHistory();
      setScans(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch scan history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalScans = scans.length;
  const confirmedFindings = scans.reduce((acc, s) => acc + (s.findings_count || 0), 0);
  const warnings = scans.reduce((acc, s) => acc + (s.warnings_count || 0), 0);
  const passed = scans.reduce((acc, s) => acc + (s.passed_count || 0), 0);

  const chartData = [
    { name: 'Confirmed Findings', count: confirmedFindings, fill: '#EF4444' },
    { name: 'Warnings', count: warnings, fill: '#F59E0B' },
    { name: 'Passed Checks', count: passed, fill: '#10B981' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-[#111827] via-[#1E1B4B]/40 to-[#111827] border border-[#1F2937] p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <span>CyberSentinel SOC Dashboard</span>
            <span className="text-xs bg-cyan-950 text-cyan-400 border border-cyan-800 px-2.5 py-0.5 rounded-full font-mono">
              Live DB Synced
            </span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Centralized security assessment overview. Learn web application security with real database insights.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="mt-4 md:mt-0 flex items-center space-x-2 bg-[#0B0F19] hover:bg-gray-800 border border-gray-700 text-gray-200 px-4 py-2 rounded-xl text-xs font-mono transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Refresh DB Stats</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Completed Scans"
          value={totalScans}
          icon={ShieldCheck}
          color="cyan"
          subtitle="Stored in local SQLite DB"
        />
        <StatCard
          title="Confirmed Findings"
          value={confirmedFindings}
          icon={AlertTriangle}
          color="red"
          subtitle="High-risk vulnerabilities"
        />
        <StatCard
          title="Security Warnings"
          value={warnings}
          icon={AlertCircle}
          color="amber"
          subtitle="Misconfigurations identified"
        />
        <StatCard
          title="Passed Security Checks"
          value={passed}
          icon={CheckCircle2}
          color="green"
          subtitle="Verified safe implementations"
        />
      </div>

      {/* Quick Launch Modules Grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider font-mono mb-3">
          Educational Testing Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#111827] border border-[#1F2937] p-5 rounded-2xl hover:border-cyan-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center mb-3">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Geolocation</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Query IP addresses, validate formats, inspect ISP/ASN and geographical coordinates.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('geolocation')}
              className="mt-4 flex items-center justify-between text-xs font-mono text-cyan-400 group-hover:text-cyan-300 font-semibold pt-3 border-t border-gray-800"
            >
              <span>Launch Module</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="bg-[#111827] border border-[#1F2937] p-5 rounded-2xl hover:border-violet-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-950 text-violet-400 border border-violet-800 flex items-center justify-center mb-3">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">SQL Injection</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Compare vulnerable string concatenation against secure parameterized SQL queries.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('sqlinjection')}
              className="mt-4 flex items-center justify-between text-xs font-mono text-violet-400 group-hover:text-violet-300 font-semibold pt-3 border-t border-gray-800"
            >
              <span>Launch Module</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="bg-[#111827] border border-[#1F2937] p-5 rounded-2xl hover:border-amber-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 border border-amber-800 flex items-center justify-center mb-3">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">OWASP</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Assess 10 critical security categories including headers, access control, and logging.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('owasp')}
              className="mt-4 flex items-center justify-between text-xs font-mono text-amber-400 group-hover:text-amber-300 font-semibold pt-3 border-t border-gray-800"
            >
              <span>Launch Module</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="bg-[#111827] border border-[#1F2937] p-5 rounded-2xl hover:border-emerald-500/50 transition-all flex flex-col justify-between group">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center mb-3">
                <Gauge className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">API Rate Limiter</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Test request rate limits, verify HTTP 429 throttling response behaviors safely.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('ratelimit')}
              className="mt-4 flex items-center justify-between text-xs font-mono text-emerald-400 group-hover:text-emerald-300 font-semibold pt-3 border-t border-gray-800"
            >
              <span>Launch Module</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Recent Findings Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="bg-[#111827] border border-[#1F2937] p-5 rounded-2xl">
          <h3 className="text-sm font-bold text-white font-mono uppercase mb-4 flex items-center justify-between">
            <span>Security Assessment Metrics</span>
            <span className="text-[10px] text-gray-500 font-normal">Real SQLite Data</span>
          </h3>
          {totalScans === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-gray-500 text-xs text-center p-4">
              <ShieldAlert className="w-8 h-8 text-gray-600 mb-2" />
              <p>No test data stored yet.</p>
              <p className="text-[11px] text-gray-600 mt-1">Run any testing module to generate database statistics.</p>
            </div>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#6B7280" fontSize={10} tickLine={false} />
                  <YAxis stroke="#6B7280" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#1F2937', borderRadius: '8px', fontSize: '12px' }} 
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Scan History Table */}
        <div className="lg:col-span-2 bg-[#111827] border border-[#1F2937] p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white font-mono uppercase">Recent Test Executions</h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs text-cyan-400 hover:underline font-mono"
              >
                View Full History &rarr;
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-gray-500 font-mono animate-pulse">
                Loading database records...
              </div>
            ) : scans.length === 0 ? (
              <div className="p-8 border border-dashed border-gray-800 rounded-xl text-center text-xs text-gray-500 font-mono">
                No recent security scans recorded in database. Click any module above to run a live test.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1F2937] text-[11px] font-mono text-gray-400 uppercase">
                      <th className="pb-3 font-semibold">Scan ID</th>
                      <th className="pb-3 font-semibold">Module</th>
                      <th className="pb-3 font-semibold">Target</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Findings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]/50 text-xs">
                    {scans.slice(0, 5).map((scan) => (
                      <tr key={scan.id} className="hover:bg-[#1F2937]/30 transition-colors">
                        <td className="py-3 font-mono text-cyan-400 font-semibold">{scan.id}</td>
                        <td className="py-3 text-gray-200">{scan.module_name}</td>
                        <td className="py-3 text-gray-400 font-mono text-[11px]">{scan.target_environment}</td>
                        <td className="py-3">
                          <RiskBadge statusOrSeverity={scan.status} size="sm" />
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-rose-400">
                          {scan.findings_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
