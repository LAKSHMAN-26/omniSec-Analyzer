import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import type { ScanHistoryItem, ScanFinding } from '../../types';
import { RiskBadge } from '../RiskBadge';
import { History, Trash2, Eye, FileText, RefreshCw, X } from 'lucide-react';

export const ScanHistoryPage: React.FC = () => {
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedScan, setSelectedScan] = useState<{ scan: ScanHistoryItem; findings: ScanFinding[] } | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await apiService.getScanHistory();
      setScans(res.data || []);
    } catch (err: any) {
      alert(`Failed to load scan history: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all stored scan history from SQLite database?')) return;
    try {
      await apiService.clearScanHistory();
      setScans([]);
      setSelectedScan(null);
    } catch (err: any) {
      alert(`Error clearing history: ${err.message}`);
    }
  };

  const handleViewDetails = async (id: string) => {
    try {
      const res = await apiService.getScanDetails(id);
      setSelectedScan(res.data);
    } catch (err: any) {
      alert(`Error loading scan details: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-[#111827] border border-[#1F2937] p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-sans">Persistent Scan History Log</h1>
            <p className="text-xs text-cyan-400 font-mono">SQLite Database Records</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <button
            onClick={fetchHistory}
            className="flex items-center space-x-2 bg-[#0B0F19] hover:bg-gray-800 border border-gray-700 text-gray-200 px-3 py-2 rounded-xl text-xs font-mono transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleClearHistory}
            className="flex items-center space-x-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 px-3 py-2 rounded-xl text-xs font-mono transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500 font-mono animate-pulse">
            Fetching scan records from SQLite database...
          </div>
        ) : scans.length === 0 ? (
          <div className="p-12 border border-dashed border-gray-800 rounded-xl text-center text-xs text-gray-500 font-mono">
            No security scans stored in database history yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1F2937] text-[11px] font-mono text-gray-400 uppercase">
                  <th className="pb-3 font-semibold">Scan ID</th>
                  <th className="pb-3 font-semibold">Module Name</th>
                  <th className="pb-3 font-semibold">Target Environment</th>
                  <th className="pb-3 font-semibold">Completion Time</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-center">Findings</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]/50 text-xs">
                {scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-[#1F2937]/30 transition-colors">
                    <td className="py-3 font-mono text-cyan-400 font-semibold">{scan.id}</td>
                    <td className="py-3 text-white font-medium">{scan.module_name}</td>
                    <td className="py-3 text-gray-400 font-mono text-[11px]">{scan.target_environment}</td>
                    <td className="py-3 text-gray-400 font-mono text-[11px]">
                      {new Date(scan.start_time).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <RiskBadge statusOrSeverity={scan.status} size="sm" />
                    </td>
                    <td className="py-3 text-center font-mono font-bold text-rose-400">
                      {scan.findings_count}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(scan.id)}
                          className="p-1.5 rounded-lg bg-[#0B0F19] text-cyan-400 hover:bg-cyan-950 border border-gray-800 transition-all"
                          title="View Scan Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <a
                          href={apiService.getReportUrl(scan.id, 'html')}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-[#0B0F19] text-violet-400 hover:bg-violet-950 border border-gray-800 transition-all"
                          title="Open HTML Report"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scan Details Modal Drawer */}
      {selectedScan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1F2937] w-full max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 bg-[#0B0F19] border-b border-[#1F2937] flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-mono">SCAN DETAILS & FINDINGS</span>
                <h3 className="text-lg font-bold text-cyan-400 font-mono">{selectedScan.scan.id}</h3>
              </div>
              <button
                onClick={() => setSelectedScan(null)}
                className="p-1 text-gray-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="bg-[#0B0F19] p-4 rounded-xl border border-gray-800 text-xs font-mono space-y-1">
                <div className="text-gray-400">Module: <span className="text-white">{selectedScan.scan.module_name}</span></div>
                <div className="text-gray-400">Target: <span className="text-white">{selectedScan.scan.target_environment}</span></div>
                <div className="text-gray-400">Summary: <span className="text-cyan-300">{selectedScan.scan.summary}</span></div>
              </div>

              <h4 className="font-mono text-xs uppercase font-bold text-white">Recorded Findings ({selectedScan.findings.length})</h4>
              <div className="space-y-3">
                {selectedScan.findings.map(f => (
                  <div key={f.id} className="bg-[#0B0F19] p-4 rounded-xl border border-gray-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white">{f.title}</div>
                      <RiskBadge statusOrSeverity={f.severity} size="sm" />
                    </div>
                    <div className="text-gray-400 font-mono text-[11px]">Evidence: {f.evidence}</div>
                    <div className="text-rose-300">Risk: {f.risk_explanation}</div>
                    <div className="text-emerald-400 bg-emerald-950/20 p-2 rounded border border-emerald-900/40">
                      Fix: {f.remediation}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#0B0F19] border-t border-[#1F2937] flex justify-end">
              <a
                href={apiService.getReportUrl(selectedScan.scan.id, 'html')}
                target="_blank"
                rel="noreferrer"
                className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold font-mono text-xs px-4 py-2 rounded-xl"
              >
                Open Full Report in New Tab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
