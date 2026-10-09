import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Overview } from './components/pages/Overview';
import { Geolocation } from './components/pages/Geolocation';
import { SqlInjection } from './components/pages/SqlInjection';
import { OwaspAssessment } from './components/pages/OwaspAssessment';
import { ScanHistoryPage } from './components/pages/ScanHistory';
import { ReportViewer } from './components/pages/ReportViewer';
import { Settings } from './components/pages/Settings';
import { HelpDoc } from './components/pages/HelpDoc';
import { IdentityAttackPathExplorer } from './components/pages/IdentityAttackPathExplorer';
import { OsintUniverse } from './components/pages/OsintUniverse';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview setActiveTab={setActiveTab} />;
      case 'geolocation':
        return <Geolocation />;
      case 'sqlinjection':
        return <SqlInjection />;
      case 'owasp':
        return <OwaspAssessment />;
      case 'identitypaths':
        return <IdentityAttackPathExplorer />;
      case 'osint':
        return <OsintUniverse onBackToDashboard={() => setActiveTab('overview')} />;
      case 'history':
        return <ScanHistoryPage />;
      case 'reports':
        return <ReportViewer />;
      case 'settings':
        return <Settings />;
      case 'help':
        return <HelpDoc />;
      default:
        return <Overview setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-sans">
      <Navbar activeTab={activeTab} />
      
      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
