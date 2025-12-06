import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Settings as SettingsIcon } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');

  const saveKey = () => {
    localStorage.setItem('GEMINI_API_KEY', apiKey);
    setShowSettings(false);
    window.location.reload(); // Reload to re-init AI service
  };

  return (
    <div className="min-h-screen bg-peppa-sky flex flex-col font-rounded text-slate-700 relative">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md border-4 border-peppa-pink shadow-2xl">
            <h3 className="text-2xl font-black text-peppa-darkPink mb-4">Settings</h3>
            <label className="block text-sm font-bold text-gray-600 mb-2">Gemini API Key</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-3 rounded-xl border-2 border-gray-300 focus:border-peppa-blue outline-none mb-4 font-mono"
              placeholder="Enter your AI Studio Key"
            />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button 
                onClick={saveKey}
                className="px-6 py-2 rounded-xl font-bold bg-peppa-green text-white shadow-md hover:bg-green-500"
              >
                Save & Reload
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              Key is stored locally in your browser. Required for AI features.
            </p>
          </div>
        </div>
      )}

      {/* Background Decor - Hills */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-peppa-green rounded-t-[50%] scale-125 transform origin-bottom z-0 pointer-events-none border-t-8 border-peppa-grass"></div>
      
      {/* Sun */}
      <div className="fixed top-10 right-10 w-16 h-16 md:w-24 md:h-24 bg-peppa-sun rounded-full border-4 border-yellow-500 shadow-lg z-0 pointer-events-none animate-pulse"></div>

      {/* Header */}
      <header className="relative z-10 bg-peppa-pink border-b-4 border-peppa-darkPink p-2 md:p-4 shadow-md flex justify-between items-center">
        <Link to="/" className="flex items-center gap-1 md:gap-2 group">
           <div className="bg-white p-1 md:p-2 rounded-full border-2 border-peppa-darkPink group-hover:rotate-12 transition-transform">
             <span className="text-xl md:text-2xl">🐷</span>
           </div>
           <h1 className="text-lg md:text-2xl font-black text-white drop-shadow-md tracking-wider">Minna no App</h1>
        </Link>
        <nav className="flex gap-2 md:gap-4">
           <button 
             onClick={() => setShowSettings(true)}
             className="p-1.5 md:p-2 rounded-xl border-2 bg-peppa-darkPink border-white text-white hover:bg-white hover:text-peppa-darkPink transition-all"
           >
             <SettingsIcon size={20} className="md:w-6 md:h-6" />
           </button>
           <Link to="/" className={`p-1.5 md:p-2 rounded-xl border-2 transition-all ${location.pathname === '/' ? 'bg-white border-peppa-darkPink text-peppa-darkPink' : 'bg-peppa-darkPink border-white text-white hover:bg-white hover:text-peppa-darkPink'}`}>
             <Home size={20} className="md:w-6 md:h-6" />
           </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 p-2 md:p-4 lg:p-8 max-w-5xl mx-auto w-full overflow-y-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl border-4 border-white shadow-xl p-3 md:p-6 min-h-[calc(100vh-200px)]">
          {children}
        </div>
      </main>

      {/* Footer Decor */}
      <footer className="relative z-10 text-center p-2 text-white/80 text-xs md:text-sm font-bold">
         Based on Minna no Nihongo • Powered by Gemini AI
      </footer>
    </div>
  );
};
