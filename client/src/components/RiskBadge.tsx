import React from 'react';

interface RiskBadgeProps {
  statusOrSeverity: string;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ statusOrSeverity, size = 'md' }) => {
  const val = statusOrSeverity.toUpperCase();

  let colors = 'bg-gray-800 text-gray-300 border-gray-700';

  if (['HIGH', 'FAIL', 'CRITICAL', 'FINDING'].includes(val)) {
    colors = 'bg-rose-950/80 text-rose-400 border-rose-800/60 shadow-sm shadow-rose-950';
  } else if (['MEDIUM', 'WARNING'].includes(val)) {
    colors = 'bg-amber-950/80 text-amber-400 border-amber-800/60 shadow-sm shadow-amber-950';
  } else if (['LOW', 'INFO'].includes(val)) {
    colors = 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60 shadow-sm shadow-cyan-950';
  } else if (['PASS', 'PASSED'].includes(val)) {
    colors = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60 shadow-sm shadow-emerald-950';
  } else if (['MANUAL REVIEW REQUIRED', 'MANUAL_REVIEW'].includes(val)) {
    colors = 'bg-violet-950/80 text-violet-400 border-violet-800/60 shadow-sm shadow-violet-950';
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3.5 py-1.5 text-sm'
  }[size];

  return (
    <span className={`inline-flex items-center font-mono font-bold uppercase rounded-md border tracking-wider ${sizeClasses} ${colors}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {val}
    </span>
  );
};
