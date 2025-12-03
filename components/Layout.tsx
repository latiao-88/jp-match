import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Settings, BookOpen } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-peppa-sky flex flex-col font-rounded text-slate-700 overflow-hidden relative">
      {/* Background Decor - Hills */}
      <div className="fixed bottom-0 left-0 right-0 h-32 bg-peppa-green rounded-t-[50%] scale-125 transform origin-bottom z-0 pointer-events-none border-t-8 border-peppa-grass"></div>
      
      {/* Sun */}
      <div className="fixed top-10 right-10 w-24 h-24 bg-peppa-sun rounded-full border-4 border-yellow-500 shadow-lg z-0 pointer-events-none animate-pulse"></div>

      {/* Header */}
      <header className="relative z-10 bg-peppa-pink border-b-4 border-peppa-darkPink p-4 shadow-md flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 group">
           <div className="bg-white p-2 rounded-full border-2 border-peppa-darkPink group-hover:rotate-12 transition-transform">
             <span className="text-2xl">🐷</span>
           </div>
           <h1 className="text-2xl font-black text-white drop-shadow-md tracking-wider">Minna no App</h1>
        </Link>
        <nav className="flex gap-4">
           <Link to="/" className={`p-2 rounded-xl border-2 transition-all ${location.pathname === '/' ? 'bg-white border-peppa-darkPink text-peppa-darkPink' : 'bg-peppa-darkPink border-white text-white hover:bg-white hover:text-peppa-darkPink'}`}>
             <Home size={24} />
           </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl border-4 border-white shadow-xl p-6 min-h-[80vh]">
          {children}
        </div>
      </main>

      {/* Footer Decor */}
      <footer className="relative z-10 text-center p-2 text-white/80 text-sm font-bold">
         Based on Minna no Nihongo • Powered by Gemini AI
      </footer>
    </div>
  );
};
