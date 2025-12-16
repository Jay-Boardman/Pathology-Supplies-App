import React, { useState, useEffect } from 'react';
import { AppView } from './types';
import { Scanner } from './components/Scanner';
import { Tracking } from './components/Tracking';
import { Catalogue } from './components/Catalogue';
import { Menu, X, BarChart2, Scan, Database } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.SCANNER);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Scroll to top whenever the view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  const navItems = [
    { id: AppView.SCANNER, label: 'Scan & Order', icon: <Scan size={20} /> },
    { id: AppView.TRACKING, label: 'Order History', icon: <BarChart2 size={20} /> },
    { id: AppView.CATALOGUE, label: 'Catalogue', icon: <Database size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#F0F4F5] flex flex-col font-sans">
      {/* NHS Header */}
      <header className="bg-nhs-blue text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             {/* NHS Logo Block */}
            <div className="bg-white px-2 py-1 font-bold text-nhs-blue text-xl tracking-tight leading-none">
                NHS
            </div>
            <h1 className="font-semibold text-lg border-l border-blue-400 pl-4 leading-tight">
                Pathology Supplies
            </h1>
          </div>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors
                        ${currentView === item.id 
                            ? 'bg-white text-nhs-blue shadow-sm' 
                            : 'text-white hover:bg-blue-700'
                        }`}
                >
                    {item.icon}
                    {item.label}
                </button>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded hover:bg-blue-700 active:bg-blue-800 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {isMobileMenuOpen && (
        <>
            {/* Backdrop to close menu when clicking outside */}
            <div 
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)} 
            />
            {/* Menu Content */}
            <div className="md:hidden fixed top-16 left-0 right-0 bg-nhs-blue pb-6 px-4 shadow-xl z-50 border-t border-blue-600 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1 pt-2">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setCurrentView(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`w-full text-left px-4 py-4 rounded-xl text-base font-medium flex items-center gap-3 transition-colors
                                ${currentView === item.id 
                                    ? 'bg-white text-nhs-blue shadow-sm' 
                                    : 'text-white hover:bg-blue-700 border border-transparent'
                                }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 py-6 px-4 sm:px-6 relative z-0">
        <div className="max-w-7xl mx-auto">
            {currentView === AppView.SCANNER && <Scanner />}
            {currentView === AppView.TRACKING && <Tracking />}
            {currentView === AppView.CATALOGUE && <Catalogue />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-nhs-dark-grey text-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Supply Chain Tracker. Internal Use Only.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;