import React, { useState } from 'react';
import { apiService } from '../../services/api';
import type { GeolocationData } from '../../types';
import { TooltipInfo } from '../TooltipInfo';
import { Globe, Search, MapPin, AlertCircle, Info } from 'lucide-react';

export const Geolocation: React.FC = () => {
  const [ipInput, setIpInput] = useState<string>('8.8.8.8');
  const [result, setResult] = useState<GeolocationData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (targetIp?: string) => {
    const ip = targetIp || ipInput;
    if (!ip.trim()) {
      setError('Please enter a valid IP address.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await apiService.lookupIp(ip);
      setResult(data);
      if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to query IP geolocation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title Banner */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-sans">Geolocation Intelligence</h1>
            <p className="text-xs text-cyan-400 font-mono">IP Address & Network Metadata Lookup</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed mt-2">
          Learn how IP addresses resolve to approximate geographic regions and Autonomous System Networks (ISPs).
          <TooltipInfo 
            term="Geolocation" 
            englishExplanation="IP Geolocation maps an IP address to the registered city/country of the network operator (ISP)."
          />
        </p>
      </div>

      {/* Input Form & Demo IP Buttons */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl">
        <label className="block text-xs font-mono font-semibold text-gray-300 uppercase mb-2">
          Enter Target IP Address (IPv4 or IPv6)
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              placeholder="e.g. 8.8.8.8 or 2001:4860:4860::8888"
              className="w-full bg-[#0B0F19] border border-[#1F2937] focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder-gray-600 outline-none transition-all"
            />
          </div>

          <button
            onClick={() => handleLookup()}
            disabled={loading}
            className="bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-black font-bold font-mono text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-cyan-950 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-spin">⌛</span>
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Lookup IP Intel</span>
          </button>
        </div>

        {/* Quick Demo Shortcuts */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-500 font-mono text-[11px]">Demo Samples:</span>
          {['8.8.8.8', '1.1.1.1', '157.240.22.35', '127.0.0.1'].map((sample) => (
            <button
              key={sample}
              onClick={() => {
                setIpInput(sample);
                handleLookup(sample);
              }}
              className="bg-[#0B0F19] hover:bg-gray-800 text-cyan-400 border border-gray-800 hover:border-cyan-500/40 px-2.5 py-1 rounded-lg font-mono text-xs transition-all"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-950/60 border border-rose-800/80 p-4 rounded-xl text-rose-300 text-xs flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadata Cards */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-4 mb-4">
                <div>
                  <span className="text-xs text-gray-500 font-mono uppercase">Queried Address</span>
                  <h2 className="text-2xl font-bold font-mono text-cyan-400">{result.ip}</h2>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-3 py-1 rounded-full font-bold">
                    {result.version}
                  </span>
                  <div className="text-[10px] text-gray-500 font-mono mt-1">
                    Source: {result.source === 'live_provider' ? 'Live API Provider' : 'Local Demo Provider'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl">
                  <span className="text-[11px] text-gray-500 font-mono uppercase">Country / Region</span>
                  <p className="text-sm font-bold text-white mt-1">
                    {result.country || 'N/A'}, {result.region || 'N/A'}
                  </p>
                </div>

                <div className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl">
                  <span className="text-[11px] text-gray-500 font-mono uppercase">City Info</span>
                  <p className="text-sm font-bold text-white mt-1">{result.city || 'N/A'}</p>
                </div>

                <div className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl">
                  <span className="text-[11px] text-gray-500 font-mono uppercase">ISP Network Operator</span>
                  <p className="text-sm font-bold text-cyan-300 mt-1 font-mono">{result.isp || 'N/A'}</p>
                </div>

                <div className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl">
                  <span className="text-[11px] text-gray-500 font-mono uppercase">ASN Number</span>
                  <p className="text-sm font-bold text-violet-400 mt-1 font-mono">{result.asn || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Disclaimer Box */}
            <div className="bg-amber-950/20 border border-amber-900/40 p-4 rounded-xl text-amber-300/90 text-xs flex items-start space-x-3">
              <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-400 font-mono uppercase mb-0.5">Important Security Notice & Limitations:</strong>
                <p className="leading-relaxed">{result.disclaimer}</p>
              </div>
            </div>
          </div>

          {/* Location Map Preview Panel */}
          <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-white uppercase mb-4">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Geographic Coordinates</span>
              </div>

              {result.lat !== undefined && result.lon !== undefined ? (
                <div className="space-y-4">
                  <div className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-xl text-center">
                    <div className="text-xs text-gray-500 font-mono">LATITUDE & LONGITUDE</div>
                    <div className="text-base font-bold font-mono text-cyan-400 mt-1">
                      {result.lat.toFixed(4)}°, {result.lon.toFixed(4)}°
                    </div>
                  </div>

                  {/* Simulated Map Widget */}
                  <div className="h-44 bg-[#0B0F19] border border-[#1F2937] rounded-xl flex flex-col items-center justify-center relative overflow-hidden p-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center animate-bounce mb-2">
                      <MapPin className="w-5 h-5 text-cyan-400" />
                    </div>
                    <p className="text-xs font-mono text-gray-300 font-bold">{result.city}, {result.country}</p>
                    <p className="text-[10px] text-gray-500 font-mono">Approximate Regional Centroid</p>
                  </div>
                </div>
              ) : (
                <div className="h-48 border border-dashed border-gray-800 rounded-xl flex items-center justify-center text-xs text-gray-500">
                  No GPS coordinates available for this address.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-800 text-[10px] text-gray-500 font-mono text-center">
              Queried at: {new Date(result.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
