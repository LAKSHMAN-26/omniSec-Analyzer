import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'cyan' | 'green' | 'amber' | 'red' | 'violet';
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, subtitle }) => {
  const colorMap = {
    cyan: {
      border: 'border-cyan-500/30',
      bg: 'from-cyan-950/40 to-transparent',
      text: 'text-cyan-400',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    },
    green: {
      border: 'border-emerald-500/30',
      bg: 'from-emerald-950/40 to-transparent',
      text: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    amber: {
      border: 'border-amber-500/30',
      bg: 'from-amber-950/40 to-transparent',
      text: 'text-amber-400',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    red: {
      border: 'border-rose-500/30',
      bg: 'from-rose-950/40 to-transparent',
      text: 'text-rose-400',
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    },
    violet: {
      border: 'border-violet-500/30',
      bg: 'from-violet-950/40 to-transparent',
      text: 'text-violet-400',
      iconBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20'
    }
  };

  const style = colorMap[color];

  return (
    <div className={`p-5 rounded-2xl bg-[#111827] bg-gradient-to-br ${style.bg} border ${style.border} shadow-lg relative overflow-hidden group`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider font-mono mb-1">{title}</p>
          <h3 className={`text-3xl font-bold font-mono tracking-tight ${style.text}`}>{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${style.iconBg} transition-transform group-hover:scale-105`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
