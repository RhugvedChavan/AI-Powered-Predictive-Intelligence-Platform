import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const s = status.toLowerCase();
  let color = 'bg-slate-100 text-slate-700 border-slate-300';
  
  if (['completed', 'approved', 'applied', 'active', 'healthy', 'ready', 'success'].includes(s)) {
    color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['running', 'pending', 'training', 'processing'].includes(s)) {
    color = 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
  } else if (['failed', 'rejected', 'error'].includes(s)) {
    color = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (['cleaned', 'regression', 'classification'].includes(s)) {
    color = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color} ${className}`}>
      {status}
    </span>
  );
};

