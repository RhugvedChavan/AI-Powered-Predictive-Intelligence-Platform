import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database, FileText, Cpu, Activity, Sparkles, Upload,
  Bot, LineChart, ArrowRight, CheckCircle2, Clock
} from 'lucide-react';
import { MetricCard } from '../components/common/MetricCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { dashboardService, datasetService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading intelligence platform overview..." />;
  }

  const kpis = summary?.kpis || {
    total_datasets: 0,
    total_records: 0,
    total_models: 0,
    total_reports: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Header & Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            AI-Powered Autonomous Data Science
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Scientist'}
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Transform raw business datasets into automated statistical models, real-time forecasts,
            interactive BI dashboards, and executive reports in minutes.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/datasets')}
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 shadow transition-all"
            >
              <Upload className="w-4 h-4 mr-1.5 text-indigo-600" />
              Upload Dataset
            </button>
            <button
              onClick={() => navigate('/assistant')}
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all"
            >
              <Bot className="w-4 h-4 mr-1.5" />
              Ask AI Scientist
            </button>
            <button
              onClick={() => navigate('/ml-studio')}
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all"
            >
              <Cpu className="w-4 h-4 mr-1.5 text-emerald-400" />
              Train Model
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all"
            >
              <FileText className="w-4 h-4 mr-1.5 text-amber-400" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Datasets"
          value={kpis.total_datasets}
          subtitle="Active files & database tables"
          icon={Database}
          color="indigo"
        />
        <MetricCard
          title="Records Analyzed"
          value={kpis.total_records.toLocaleString()}
          subtitle="Processed through DuckDB engine"
          icon={Activity}
          color="emerald"
        />
        <MetricCard
          title="ML Models Trained"
          value={kpis.total_models}
          subtitle="Regression, classification, forecasts"
          icon={Cpu}
          color="purple"
        />
        <MetricCard
          title="Reports Generated"
          value={kpis.total_reports}
          subtitle="Executive PDF, Excel & CSV"
          icon={FileText}
          color="amber"
        />
      </div>

      {/* Middle Grid: Recent Datasets & Model Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Datasets */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Recent Datasets</h3>
              <p className="text-xs text-slate-500">Datasets uploaded and ready for analysis</p>
            </div>
            <button
              onClick={() => navigate('/datasets')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center"
            >
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {summary?.recent_datasets?.length > 0 ? (
              summary.recent_datasets.map((ds: any) => (
                <div key={ds.id} className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                      {ds.file_type}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 hover:text-indigo-600 cursor-pointer" onClick={() => navigate('/analysis')}>
                        {ds.name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {ds.row_count.toLocaleString()} rows • {ds.col_count} columns
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {ds.is_cleaned ? (
                      <StatusBadge status="Cleaned" />
                    ) : (
                      <span className="text-[11px] text-slate-400">Raw Data</span>
                    )}
                    <button
                      onClick={() => navigate('/analysis')}
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      Analyze
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">No datasets found. Upload your first dataset to begin.</p>
            )}
          </div>
        </div>

        {/* Machine Learning Models Overview */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Trained Models</h3>
              <p className="text-xs text-slate-500">Active predictive models</p>
            </div>
            <button
              onClick={() => navigate('/ml-studio')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center"
            >
              Studio <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

          <div className="space-y-3">
            {summary?.recent_models?.length > 0 ? (
              summary.recent_models.map((m: any) => (
                <div key={m.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800 truncate">{m.name}</span>
                    <StatusBadge status={m.task_type} />
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mb-2">{m.algorithm}</div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400">
                      {m.task_type === 'regression' ? 'R² Score:' : m.task_type === 'classification' ? 'Accuracy:' : 'Score:'}
                    </span>
                    <span className="font-bold text-emerald-600">
                      {m.metrics?.r2 != null
                        ? (m.metrics.r2 * 100).toFixed(1) + '%'
                        : m.metrics?.accuracy != null
                        ? (m.metrics.accuracy * 100).toFixed(1) + '%'
                        : 'Active'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">No trained models yet. Train a model in ML Studio.</p>
            )}
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">Recent Analytics Activity</h3>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center"
          >
            Full Audit Log <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        <div className="space-y-3">
          {summary?.recent_activity?.length > 0 ? (
            summary.recent_activity.map((act: any) => (
              <div key={act.id} className="flex items-start space-x-3 text-xs py-2 border-b border-slate-100 last:border-0">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-indigo-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800 capitalize">{act.action.replace('_', ' ')}: </span>
                  <span className="text-slate-600">
                    {act.details?.name || act.details?.title || act.details?.query || `${act.entity_type} operation`}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(act.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-xs text-slate-400">No recent activity logs recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
};

