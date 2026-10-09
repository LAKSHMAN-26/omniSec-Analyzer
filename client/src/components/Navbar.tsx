import React from 'react';
import { ShieldCheck, Bell, User, Server } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = () => {
  return (
    <header className="h-16 bg-[#111827] border-b border-[#1F2937] px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Brand & Tagline */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg text-white tracking-wide">Omnisec Analyzer</span>
            {/* <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full font-mono uppercase font-semibold">
              v1.0 SOC
            </span> */}
          </div>
          <p className="text-xs text-gray-400 font-sans">Detect. Analyze. Protect.</p>
        </div>
      </div>

      {/* Right Controls & Demo Indicator */}
      <div className="flex items-center space-x-4">
        {/* Environment Badge */}
        <div className="hidden sm:flex items-center space-x-2 bg-[#0B0F19] border border-[#1F2937] px-3 py-1.5 rounded-lg text-xs font-mono">
          <Server className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-gray-400">Target Env:</span>
          <span className="text-cyan-400 font-semibold">LOCAL DEMO (AUTHORIZED)</span>
        </div>

        {/* Notifications Icon */}
        <button 
          title="Security Alerts"
          className="relative p-2 rounded-lg bg-[#0B0F19] text-gray-400 hover:text-cyan-400 hover:border-cyan-500/40 border border-[#1F2937] transition-all"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400" />
        </button>

        {/* Profile Card */}
        <div className="flex items-center space-x-2.5 bg-[#0B0F19] border border-[#1F2937] px-3 py-1.5 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-violet-600/30 border border-violet-500/50 flex items-center justify-center text-violet-300 font-mono text-xs font-bold">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left hidden md:block">
            <div className="text-xs font-medium text-gray-200">Student Analyst</div>
            {/* <div className="text-[10px] text-gray-500 font-mono">Demo Role (Hackathon)</div> */}
          </div>
        </div>
      </div>
    </header>
  );
};
