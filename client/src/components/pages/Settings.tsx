import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { Settings as SettingsIcon, Save, ShieldCheck, Check } from 'lucide-react';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    owasp_edition: '2021',
    rate_limit_default_max: '100',
    theme: 'dark',
    demo_mode: 'true'
  });
  const [savedMsg, setSavedMsg] = useState<boolean>(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await apiService.getSettings();
        if (res.data) setSettings(res.data);
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      await apiService.updateSettings(settings);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-violet-950 text-violet-400 border border-violet-800 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-sans">Platform Configuration Settings</h1>
            <p className="text-xs text-violet-400 font-mono">Environment & Preferences</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed mt-2">
          Configure security assessment standards and local application preferences stored in SQLite.
        </p>
      </div>

      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl space-y-5">
        <div>
          <label className="block text-xs font-mono font-semibold text-gray-300 uppercase mb-2">
            Default OWASP Top 10 Standard Edition
          </label>
          <select
            value={settings.owasp_edition || '2021'}
            onChange={(e) => setSettings({ ...settings, owasp_edition: e.target.value })}
            className="w-full md:w-1/2 bg-[#0B0F19] border border-[#1F2937] text-white text-xs font-mono px-4 py-2.5 rounded-xl outline-none focus:border-cyan-500"
          >
            <option value="2021">2021 Official Edition (A01:2021 - A10:2021)</option>
            <option value="2017">2017 Legacy Edition (A1:2017 - A10:2017)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono font-semibold text-gray-300 uppercase mb-2">
            Default API Rate Limiting Threshold
          </label>
          <input
            type="number"
            value={settings.rate_limit_default_max || '100'}
            onChange={(e) => setSettings({ ...settings, rate_limit_default_max: e.target.value })}
            className="w-full md:w-1/2 bg-[#0B0F19] border border-[#1F2937] text-white text-xs font-mono px-4 py-2.5 rounded-xl outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-semibold text-gray-300 uppercase mb-2">
            Target Environment Sandbox Mode
          </label>
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/50 w-full md:w-1/2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Strict Isolated Educational Demo Environment (Active)</span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-800 flex items-center space-x-3">
          <button
            onClick={handleSave}
            className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold font-mono text-xs px-6 py-2.5 rounded-xl flex items-center space-x-2 shadow-lg shadow-cyan-950 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration Settings</span>
          </button>

          {savedMsg && (
            <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
              <Check className="w-4 h-4" />
              <span>Saved to database!</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
