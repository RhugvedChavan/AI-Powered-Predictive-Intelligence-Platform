import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Database, Sparkles, BarChart3, Bot,
  Cpu, LineChart, FileText, History, Brain, ChevronRight
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/overview', icon: LayoutDashboard },
  { name: 'Datasets', href: '/datasets', icon: Database },
  { name: 'Data Cleaning', href: '/cleaning', icon: Sparkles },
  { name: 'Exploratory Analysis', href: '/analysis', icon: BarChart3 },
  { name: 'AI Data Assistant', href: '/assistant', icon: Bot, badge: 'Agents' },
  { name: 'Predictive ML Studio', href: '/ml-studio', icon: Cpu },
  { name: 'Business Intelligence', href: '/bi', icon: LineChart },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'History', href: '/history', icon: History },
];

export const Sidebar: React.FC<{ isOpen: boolean; toggleSidebar: () => void }> = ({ isOpen }) => {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } flex flex-col`}
    >
      {/* Brand Logo & Name */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 bg-slate-950/60">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mr-3">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-tight leading-none">AI-Powered</h1>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-indigo-400">Predictive Intelligence</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Core Workspaces
        </div>
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`
            }
          >
            <div className="flex items-center space-x-3">
              <item.icon className="w-4 h-4 shrink-0 transition-colors" />
              <span>{item.name}</span>
            </div>
            {item.badge ? (
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-indigo-500/30 text-indigo-300 border border-indigo-400/20">
                {item.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </div>
    </aside>
  );
};

