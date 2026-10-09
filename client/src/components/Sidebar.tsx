import React from 'react';
import { 
  LayoutDashboard, 
  Globe, 
  Database, 
  ShieldAlert, 
  Gauge, 
  History, 
  FileText, 
  Settings as SettingsIcon, 
  HelpCircle 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: 'Main' },
    { id: 'geolocation', label: 'Geolocation Intel', icon: Globe, badge: 'Mod 1' },
    { id: 'sqlinjection', label: 'SQL Injection Tester', icon: Database, badge: 'Mod 2' },
    { id: 'owasp', label: 'OWASP Top 10', icon: ShieldAlert, badge: 'Mod 3' },
    { id: 'ratelimit', label: 'API Rate Limit Tester', icon: Gauge, badge: 'Mod 4' },
    { id: 'history', label: 'Scan History', icon: History },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'help', label: 'Help & Docs', icon: HelpCircle },
  ];

  return (
    <aside className="w-64 bg-[#111827] border-r border-[#1F2937] flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none shrink-0">
      <div className="py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider font-mono">
          Security Modules & Tools
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/80 to-violet-950/40 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-950/50'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1F2937]/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {/* {item.badge && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  isActive 
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                    : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}>
                  {item.badge}
                </span>
              )} */}
            </button>
          );
        })}
      </div>

      {/* Footer Info Box */}
      {/* <div className="p-3 m-3 bg-[#0B0F19] border border-[#1F2937] rounded-xl text-xs text-gray-400">
        <div className="flex items-center space-x-2 text-cyan-400 font-semibold mb-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Hackathon Ready</span>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-500">
          Built for safe, isolated educational security testing. Zero external impact.
        </p>
      </div> */}
    </aside>
  );
};
