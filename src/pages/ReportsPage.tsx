import React, { useEffect, useState } from 'react';
import {
  FileText, Download, Sparkles, CheckCircle2, AlertCircle,
  FileSpreadsheet, FileCode, Clock, RefreshCw, Eye
} from 'lucide-react';
import { datasetService, reportService } from '../services/api';
import { Dataset, BusinessReport } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';

export const ReportsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Report Generator Form
  const [reportTitle, setReportTitle] = useState('Executive Business Evaluation');
  const [format, setFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf');
  const [generating, setGenerating] = useState(false);
  const [latestReport, setLatestReport] = useState<BusinessReport | null>(null);

  // Saved Reports History
  const [reports, setReports] = useState<BusinessReport[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const dsList = await datasetService.list();
      setDatasets(dsList);
      if (dsList.length > 0) {
        setSelectedDatasetId(dsList[0].id);
        setReportTitle(`Executive Analysis: ${dsList[0].name}`);
        const reps = await reportService.list(dsList[0].id);
        setReports(reps);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) return;

    setGenerating(true);
    try {
      const rep = await reportService.generate(selectedDatasetId, reportTitle, format);
      setLatestReport(rep);
      setReports([rep, ...reports]);
    } catch (err) {
      console.error('Failed to generate report:', err);
      alert('Report generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading report generation center..." />;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center">
          <FileText className="w-5 h-5 mr-2 text-indigo-600" />
          AI Business Report Generator
        </h2>
        <p className="text-xs text-slate-500">
          Synthesize descriptive findings, machine learning outputs, data quality audits, and strategic recommendations into downloadable PDF, Excel, and CSV files.
        </p>
      </div>

      {/* Generator Configuration Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Dataset Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Dataset</label>
              <select
                value={selectedDatasetId}
                onChange={(e) => {
                  setSelectedDatasetId(e.target.value);
                  const d = datasets.find((ds) => ds.id === e.target.value);
                  if (d) setReportTitle(`Executive Analysis: ${d.name}`);
                }}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.row_count} rows)
                  </option>
                ))}
              </select>
            </div>

            {/* Report Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Report Title</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Export Format Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Export Format</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'pdf', label: 'PDF Document', icon: FileText },
                  { id: 'excel', label: 'Excel (XLSX)', icon: FileSpreadsheet },
                  { id: 'csv', label: 'CSV Table', icon: FileCode }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id as any)}
                    className={`py-2 px-2 rounded-xl text-center border font-bold text-[11px] transition-all flex flex-col items-center justify-center space-y-1 ${
                      format === f.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <f.icon className="w-4 h-4" />
                    <span>{f.id.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={generating}
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Findings & Rendering Document...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Business Report ({format.toUpperCase()})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Report Preview if generated */}
      {latestReport && latestReport.sections && (
        <div className="bg-white rounded-xl border border-indigo-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Report Generated</span>
              <h3 className="text-base font-extrabold text-slate-900">{latestReport.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{latestReport.sections?.generated_at}</p>
            </div>
            <a
              href={reportService.downloadUrl(latestReport.id)}
              download
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Download {latestReport.format.toUpperCase()}</span>
            </a>
          </div>

          {/* 12 Sections Preview */}
          <div className="space-y-4 text-xs">
            <div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">1. Executive Summary</h4>
              <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/60">
                {latestReport.sections['1_executive_summary']}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-slate-800 mb-1">10. Strategic Business Opportunities</h4>
                <ul className="space-y-1.5 list-disc pl-4 text-slate-600">
                  {latestReport.sections['10_business_opportunities']?.map((opp: string, i: number) => (
                    <li key={i}>{opp}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">12. Actionable Recommendations</h4>
                <ul className="space-y-1.5 list-disc pl-4 text-slate-600">
                  {latestReport.sections['12_actionable_recommendations']?.map((rec: string, i: number) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Previously Generated Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Report Archive</h3>
        <div className="divide-y divide-slate-100">
          {reports.length > 0 ? (
            reports.map((rep) => (
              <div key={rep.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase font-mono">
                    {rep.format}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{rep.title}</h4>
                    <span className="text-[11px] text-slate-400">
                      Generated: {new Date(rep.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <a
                  href={reportService.downloadUrl(rep.id)}
                  download
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-xs text-slate-400">No reports generated yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

