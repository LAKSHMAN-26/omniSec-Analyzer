import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import type { ScanHistoryItem } from '../../types';
import { FileText, Download, ExternalLink, Printer } from 'lucide-react';

export const ReportViewer: React.FC = () => {
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadScans() {
      try {
        const res = await apiService.getScanHistory();
        const data = res.data || [];
        setScans(data);
        if (data.length > 0) {
          setSelectedScanId(data[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load scan history for report generator', err);
      } finally {
        setLoading(false);
      }
    }
    loadScans();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-sans">Report Generation & Export</h1>
            <p className="text-xs text-cyan-400 font-mono">Download Security Assessment Reports</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed mt-2">
          Generate formal audit reports from real database scan executions for hackathon evaluation and project expo submissions.
        </p>
      </div>

      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl space-y-6">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500 font-mono animate-pulse">
            Loading available scan reports...
          </div>
        ) : scans.length === 0 ? (
          <div className="p-12 border border-dashed border-gray-800 rounded-xl text-center text-xs text-gray-500 font-mono">
            No completed scans available in database to generate a report. Run any module test first.
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-mono font-semibold text-gray-300 uppercase mb-2">
                Select Scan Report to Export
              </label>
              <select
                value={selectedScanId}
                onChange={(e) => setSelectedScanId(e.target.value)}
                className="w-full md:w-1/2 bg-[#0B0F19] border border-[#1F2937] text-white text-xs font-mono px-4 py-3 rounded-xl outline-none focus:border-cyan-500"
              >
                {scans.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id} - {s.module_name} ({new Date(s.start_time).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            {selectedScanId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-800">
                {/* HTML Printable Report Box */}
                <div className="bg-[#0B0F19] border border-[#1F2937] p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm mb-1 flex items-center space-x-2">
                      <Printer className="w-4 h-4 text-cyan-400" />
                      <span>Printable HTML Security Report</span>
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed mt-1">
                      Formatted HTML document with executive summary, metadata grid, color-coded finding badges, evidence logs, and remediation steps.
                    </p>
                  </div>
                  <a
                    href={apiService.getReportUrl(selectedScanId, 'html')}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-black font-bold font-mono text-xs px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-cyan-950 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open & Print HTML Report</span>
                  </a>
                </div>

                {/* Structured JSON Export Box */}
                <div className="bg-[#0B0F19] border border-[#1F2937] p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm mb-1 flex items-center space-x-2">
                      <Download className="w-4 h-4 text-violet-400" />
                      <span>Structured JSON Export Data</span>
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed mt-1">
                      Raw JSON payload containing structured scan metadata and array of findings for programmatical analysis or integration.
                    </p>
                  </div>
                  <a
                    href={apiService.getReportUrl(selectedScanId, 'json')}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 bg-violet-600 hover:bg-violet-500 text-white font-bold font-mono text-xs px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-violet-950 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download JSON Report</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
