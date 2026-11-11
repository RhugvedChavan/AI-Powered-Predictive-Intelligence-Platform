import React, { useEffect, useState } from 'react';
import {
  History, Search, Trash2, Filter, Clock, CheckCircle2,
  Database, Cpu, FileText, Bot, Sparkles
} from 'lucide-react';
import { dashboardService } from '../services/api';
import { ActivityLog } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const HistoryPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadHistory();
  }, [filterType]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const entity = filterType === 'all' ? undefined : filterType;
      const data = await dashboardService.getHistory(entity);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this activity entry?')) {
      try {
        await dashboardService.deleteHistory(id);
        setLogs(logs.filter((l) => l.id !== id));
      } catch (err) {
        alert('Failed to delete log entry.');
      }
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const actionMatch = l.action.toLowerCase().includes(q);
    const detailsMatch = JSON.stringify(l.details || {}).toLowerCase().includes(q);
    return actionMatch || detailsMatch;
  });

  const getIconForEntity = (type: string) => {
    switch (type) {
      case 'dataset':
        return <Database className="w-4 h-4 text-indigo-600" />;
      case 'model':
        return <Cpu className="w-4 h-4 text-emerald-600" />;
      case 'report':
        return <FileText className="w-4 h-4 text-amber-600" />;
      case 'chat':
        return <Bot className="w-4 h-4 text-purple-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-slate-600" />;
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving platform audit and activity logs..." />;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center">
          <History className="w-5 h-5 mr-2 text-indigo-600" />
          Project & Analysis History
        </h2>
        <p className="text-xs text-slate-500">
          Traceable audit log of data uploads, AI transformations, model training runs, and analytical reports.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search activity records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs border-0 focus:outline-none"
          />
        </div>

        {/* Entity Filters */}
        <div className="flex items-center space-x-1.5 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'dataset', label: 'Datasets' },
            { id: 'model', label: 'Models' },
            { id: 'chat', label: 'AI Assistant' },
            { id: 'report', label: 'Reports' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Log Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="divide-y divide-slate-100">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div key={log.id} className="py-3.5 flex items-start justify-between text-xs hover:bg-slate-50 px-2 rounded-lg transition-colors">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getIconForEntity(log.entity_type)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 capitalize">
                      {log.action.replace('_', ' ')}
                      <span className="ml-2 font-mono text-[10px] font-normal text-slate-400 uppercase">
                        [{log.entity_type}]
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      {log.details?.name || log.details?.title || log.details?.query || (
                        <span className="font-mono text-[11px] text-slate-400">
                          {JSON.stringify(log.details || {})}
                        </span>
                      )}
                    </p>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(log.id)}
                  title="Remove log"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ) : (
            <p className="py-10 text-center text-xs text-slate-400">
              No activity logs match the selected filter.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

