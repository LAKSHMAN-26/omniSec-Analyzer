import React from 'react';
import { BookOpen } from 'lucide-react';

export const HelpDoc: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-sans">Help & Documentation for Beginners</h1>
            <p className="text-xs text-cyan-400 font-mono">Hackathon Demonstration Guide</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed mt-2">
          Clear, beginner-friendly explanations to explain CyberSentinel AI during your college project presentation and hackathon expo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module Guides */}
        <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-cyan-400 font-mono uppercase border-b border-gray-800 pb-2">
            Module Usage Walkthrough
          </h2>

          <div className="space-y-3 text-xs">
            <div className="bg-[#0B0F19] p-3 rounded-xl border border-gray-800">
              <strong className="text-white block font-mono">1. Geolocation Intelligence:</strong>
              <p className="text-gray-400 mt-1">
                Enter any public IP (like <code className="text-cyan-400">8.8.8.8</code>). The tool shows the country, city, ISP name, and approximate coordinates.
              </p>
            </div>

            <div className="bg-[#0B0F19] p-3 rounded-xl border border-gray-800">
              <strong className="text-white block font-mono">2. SQL Injection Security Tester:</strong>
              <p className="text-gray-400 mt-1">
                Switch between Vulnerable Mode (uses string concatenation) and Secure Mode (uses parameterized queries <code className="text-emerald-400 font-mono">?</code>). Try payload <code className="text-rose-400 font-mono">' OR '1'='1</code> in the sandbox to see authentication bypass.
              </p>
            </div>

            <div className="bg-[#0B0F19] p-3 rounded-xl border border-gray-800">
              <strong className="text-white block font-mono">3. OWASP Top 10 Assessment:</strong>
              <p className="text-gray-400 mt-1">
                Analyze pasted URLs passively for format and phishing risks, or execute a live OWASP Top 10 assessment against the local educational lab demo applications.
              </p>
            </div>

          </div>
        </div>

        {/* Key Term Glossary */}
        <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-violet-400 font-mono uppercase border-b border-gray-800 pb-2">
            Key Cybersecurity Terms & Concepts
          </h2>

          <div className="space-y-3 text-xs">
            <div className="bg-[#0B0F19] p-3 rounded-xl border border-gray-800">
              <span className="text-cyan-400 font-mono font-bold">SQL Injection:</span>
              <p className="text-gray-300 mt-1 leading-relaxed">
                Manipulating database queries by injecting untrusted SQL syntax through unvalidated form inputs or URL parameters.
              </p>
            </div>

            <div className="bg-[#0B0F19] p-3 rounded-xl border border-gray-800">
              <span className="text-cyan-400 font-mono font-bold">Parameterized Queries:</span>
              <p className="text-gray-300 mt-1 leading-relaxed">
                Using placeholders (<code className="text-emerald-400 font-mono">?</code>) so database engines treat input strictly as literal data, completely preventing code injection.
              </p>
            </div>

            <div className="bg-[#0B0F19] p-3 rounded-xl border border-gray-800">
              <span className="text-cyan-400 font-mono font-bold">Passive URL Safety Check:</span>
              <p className="text-gray-300 mt-1 leading-relaxed">
                Inspecting the structural syntax, scheme, and domain formatting of a web link in-memory without making an outbound network connection to the target.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
