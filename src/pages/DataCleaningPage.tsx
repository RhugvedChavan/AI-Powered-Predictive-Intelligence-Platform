import React, { useEffect, useState } from 'react';
import {
  Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Check,
  RefreshCw, Layers, ShieldCheck, History, SlidersHorizontal
} from 'lucide-react';
import { datasetService, cleaningService } from '../services/api';
import { Dataset, CleaningAnalysis, CleaningOperation, CleaningRecommendation } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const DataCleaningPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [analysis, setAnalysis] = useState<CleaningAnalysis | null>(null);

  // Selected operations to apply
  const [selectedOps, setSelectedOps] = useState<CleaningOperation[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  const [cleaningSuccess, setCleaningSuccess] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const data = await datasetService.list();
      setDatasets(data);
      if (data.length > 0) {
        setSelectedDatasetId(data[0].id);
        runAudit(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  const runAudit = async (datasetId: string) => {
    setAuditing(true);
    setAnalysis(null);
    setPreviewResult(null);
    setCleaningSuccess(null);
    try {
      const res = await cleaningService.analyze(datasetId);
      setAnalysis(res);
      // Pre-select all recommended operations by default
      const defaultOps = res.recommendations.map((r) => r.recommended_operation);
      setSelectedOps(defaultOps);

      // Load cleaning history
      const hist = await cleaningService.getHistory(datasetId);
      setHistory(hist);
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setAuditing(false);
    }
  };

  const handleDatasetChange = (id: string) => {
    setSelectedDatasetId(id);
    runAudit(id);
  };

  const toggleOperation = (op: CleaningOperation) => {
    const exists = selectedOps.some(
      (o) => o.operation === op.operation && o.column === op.column
    );
    if (exists) {
      setSelectedOps(
        selectedOps.filter((o) => !(o.operation === op.operation && o.column === op.column))
      );
    } else {
      setSelectedOps([...selectedOps, op]);
    }
  };

  const handlePreview = async () => {
    if (selectedOps.length === 0) {
      alert('Please select at least one cleaning operation to preview.');
      return;
    }
    setPreviewing(true);
    try {
      const res = await cleaningService.preview(selectedDatasetId, selectedOps);
      setPreviewResult(res);
    } catch (err) {
      console.error('Preview failed:', err);
    } finally {
      setPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (selectedOps.length === 0) {
      alert('Please select at least one cleaning operation to apply.');
      return;
    }
    setApplying(true);
    try {
      const res = await cleaningService.apply(selectedDatasetId, selectedOps);
      setCleaningSuccess(`Cleaned dataset successfully created! New dataset ID: ${res.cleaned_dataset_id}`);
      // Refresh datasets list
      const updatedDatasets = await datasetService.list();
      setDatasets(updatedDatasets);
      // Reload history
      const hist = await cleaningService.getHistory(selectedDatasetId);
      setHistory(hist);
    } catch (err) {
      console.error('Apply cleaning failed:', err);
      alert('Failed to apply cleaning operations.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading dataset catalog for cleaning..." />;
  }

  return (
    <div className="space-y-6">
      {/* Title & Dataset Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-indigo-600" />
            AI Data Cleaning Agent
          </h2>
          <p className="text-xs text-slate-500">
            Intelligent inspection of missing values, duplicate rows, IQR outliers, and type normalization.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-600">Active Dataset:</label>
          <select
            value={selectedDatasetId}
            onChange={(e) => handleDatasetChange(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.row_count} rows)
              </option>
            ))}
          </select>
          <button
            onClick={() => runAudit(selectedDatasetId)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Re-run Data Quality Audit"
          >
            <RefreshCw className={`w-4 h-4 ${auditing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {cleaningSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{cleaningSuccess}</span>
          </div>
          <button
            onClick={() => setCleaningSuccess(null)}
            className="text-xs text-emerald-600 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {auditing ? (
        <LoadingSpinner message="Scanning dataset for missing cells, duplicates, outliers, and type anomalies..." />
      ) : analysis ? (
        <div className="space-y-6">
          {/* Quality Overview KPI Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold uppercase text-slate-400">Total Observations</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1">
                {analysis.total_rows.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500">Across {analysis.total_columns} columns</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold uppercase text-slate-400">Duplicate Rows</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1">
                {analysis.duplicate_rows_count}
              </div>
              <span className="text-[11px] text-slate-500">
                {analysis.duplicate_rows_count > 0 ? 'Requires deduplication' : 'No duplicates detected'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold uppercase text-slate-400">Missing Cells</span>
              <div className="text-xl font-extrabold text-slate-900 mt-1">
                {analysis.missing_cells_count}
              </div>
              <span className="text-[11px] text-slate-500">Imputation recommended</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold uppercase text-slate-400">Recommended Fixes</span>
              <div className="text-xl font-extrabold text-indigo-600 mt-1">
                {analysis.recommendations.length}
              </div>
              <span className="text-[11px] text-slate-500">AI-tailored operations</span>
            </div>
          </div>

          {/* Cleaning Recommendations List */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Cleaning Recommendations</h3>
                <p className="text-xs text-slate-500">
                  Select which transformations to apply. Original dataset will be preserved unchanged.
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-600">
                {selectedOps.length} of {analysis.recommendations.length} operations approved
              </div>
            </div>

            <div className="space-y-3">
              {analysis.recommendations.length > 0 ? (
                analysis.recommendations.map((rec: CleaningRecommendation, idx: number) => {
                  const isChecked = selectedOps.some(
                    (o) =>
                      o.operation === rec.recommended_operation.operation &&
                      o.column === rec.recommended_operation.column
                  );
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleOperation(rec.recommended_operation)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? 'border-indigo-400 bg-indigo-50/40 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 border ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                            <span>{rec.description}</span>
                            {rec.column && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-mono">
                                {rec.column}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Strategy: <span className="font-semibold text-slate-700">{rec.recommended_operation.strategy || 'default'}</span> • Affected rows/cells: {rec.affected_count}
                          </p>
                        </div>
                      </div>

                      <StatusBadge status={rec.severity} />
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  Your dataset has high structural integrity! No critical anomalies detected.
                </div>
              )}
            </div>

            {/* Actions: Preview & Apply */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Pre-evaluating transformations ensures non-destructive and reproducible data workflows.
              </span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePreview}
                  disabled={previewing || selectedOps.length === 0}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  {previewing ? 'Computing Preview...' : 'Preview Before & After Stats'}
                </button>
                <button
                  onClick={handleApply}
                  disabled={applying || selectedOps.length === 0}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  {applying ? 'Saving Cleaned Dataset...' : 'Apply Approved Cleaning'}
                </button>
              </div>
            </div>
          </div>

          {/* Before & After Preview Comparison */}
          {previewResult && (
            <div className="bg-white rounded-xl border border-indigo-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-indigo-900">Before & After Cleaning Comparison</h3>
                <span className="text-xs font-semibold text-indigo-600">Simulated Results</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 rounded-lg bg-slate-50">
                  <div className="text-[11px] font-bold text-slate-400">Rows (Original)</div>
                  <div className="text-lg font-bold text-slate-800">{previewResult.before_stats.row_count}</div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-900">
                  <div className="text-[11px] font-bold text-emerald-600">Rows (Cleaned)</div>
                  <div className="text-lg font-bold text-emerald-800">{previewResult.after_stats.row_count}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <div className="text-[11px] font-bold text-slate-400">Missing Cells (Before)</div>
                  <div className="text-lg font-bold text-slate-800">{previewResult.before_stats.missing_cells}</div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-900">
                  <div className="text-[11px] font-bold text-emerald-600">Missing Cells (After)</div>
                  <div className="text-lg font-bold text-emerald-800">{previewResult.after_stats.missing_cells}</div>
                </div>
              </div>

              {/* Sample preview table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2">Cleaned Sample (First 10 Rows)</h4>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {Object.keys(previewResult.sample_preview[0] || {}).map((col) => (
                          <th key={col} className="px-3 py-2 text-left font-bold text-slate-700">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewResult.sample_preview.slice(0, 10).map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                          {Object.values(row).map((val: any, j: number) => (
                            <td key={j} className="px-3 py-1.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                              {val !== null ? String(val) : 'NULL'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Cleaning History */}
          {history.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center space-x-2 mb-3">
                <History className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800">Cleaning Lineage History</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {history.map((h) => (
                  <div key={h.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">Applied {h.operations?.length || 0} transformations</span>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(h.created_at).toLocaleString()}
                      </div>
                    </div>
                    <StatusBadge status={h.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

