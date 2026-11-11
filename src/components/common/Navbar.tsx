import React from 'react';
import { Menu, Bell, User as UserIcon, Sparkles, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Navbar: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-800">Workspace:</span>
          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
            Enterprise Retail & Predictive Analytics
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Quick Action Button */}
        <button
          onClick={() => navigate('/assistant')}
          className="hidden md:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
          Ask AI Scientist
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {user?.full_name ? user.full_name.charAt(0) : 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight">{user?.full_name || 'Data Scientist'}</div>
            <div className="text-[10px] text-slate-400 capitalize">{user?.role || 'Analyst'}</div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

