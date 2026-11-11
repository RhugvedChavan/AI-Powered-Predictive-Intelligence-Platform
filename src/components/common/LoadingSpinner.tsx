import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ message?: string; className?: string }> = ({
  message = 'Processing data analytics...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-3 ${className}`}>
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
};

