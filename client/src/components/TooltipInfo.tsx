import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipInfoProps {
  term: string;
  englishExplanation: string;
}

export const TooltipInfo: React.FC<TooltipInfoProps> = ({ term, englishExplanation }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="inline-flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-4 decoration-cyan-500/40 cursor-pointer"
      >
        <span>{term}</span>
        <HelpCircle className="w-3.5 h-3.5 text-cyan-400 opacity-70" />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-[#111827] border border-cyan-500/40 rounded-xl shadow-2xl z-50 text-xs text-gray-200 backdrop-blur-md transition-all animate-fadeIn">
          <div className="font-bold text-cyan-400 font-mono mb-1 flex items-center justify-between border-b border-gray-800 pb-1">
            <span>{term}</span>
            <span className="text-[10px] text-gray-500">Security Concept</span>
          </div>
          <p className="text-gray-300 leading-relaxed">{englishExplanation}</p>
        </div>
      )}
    </span>
  );
};
