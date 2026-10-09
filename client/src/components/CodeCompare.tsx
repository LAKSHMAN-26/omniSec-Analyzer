import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface CodeCompareProps {
  vulnerableSnippet: string;
  secureSnippet: string;
}

export const CodeCompare: React.FC<CodeCompareProps> = ({ vulnerableSnippet, secureSnippet }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-4">
      {/* Vulnerable Code Panel */}
      <div className="bg-[#0B0F19] border border-rose-900/40 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-rose-950/40 border-b border-rose-900/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-rose-400 font-semibold text-xs uppercase tracking-wider font-mono">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Vulnerable Implementation</span>
          </div>
          <span className="text-[10px] font-mono bg-rose-900/60 text-rose-300 px-2 py-0.5 rounded">
            RISKY
          </span>
        </div>
        <div className="p-4 overflow-x-auto">
          <pre className="font-mono text-xs text-rose-300 leading-relaxed whitespace-pre-wrap">
            {vulnerableSnippet}
          </pre>
        </div>
      </div>

      {/* Secure Code Panel */}
      <div className="bg-[#0B0F19] border border-emerald-900/40 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-emerald-950/40 border-b border-emerald-900/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider font-mono">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Secure Implementation</span>
          </div>
          <span className="text-[10px] font-mono bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded font-bold">
            RECOMMENDED
          </span>
        </div>
        <div className="p-4 overflow-x-auto">
          <pre className="font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap">
            {secureSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
};
