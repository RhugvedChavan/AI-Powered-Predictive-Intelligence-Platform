import React, { useEffect, useState } from 'react';
import {
  Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Check,
  RefreshCw, Layers, ShieldCheck, History, SlidersHorizontal,
  Table, Download, FileSpreadsheet, Search, CheckCircle, FileCheck
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

  // Active Tab: 'table' | 'recommendations' | 'history'
  const [activeTab, setActiveTab] = useState<'table' | 'recommendations' | 'history'>('table');

  // Tabular Data Preview
  const [tableData, setTableData] = useState<any>(null);
  const [loadingTable, setLoadingTable] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  // Selected operations to apply
  const [selectedOps, setSelectedOps] = useState<CleaningOperation[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  const [autoCleaning, setAutoCleaning] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
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
        loadTableData(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTableData = async (datasetId: string) => {
    try {
      setLoadingTable(true);
      const data = await datasetService.preview(datasetId, 100, 0);
      setTableData(data);
    } catch (err) {
      console.error('Failed to load tabular data:', err);
    } finally {
      setLoadingTable(false);
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
      const defaultOps = res.recommendations.map((r) => r.recommended_operation);
      setSelectedOps(defaultOps);

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
    loadTableData(id);
  };

  const handleAutoClean = async () => {
    const activeDs = datasets.find((d) => d.id === selectedDatasetId);
    setAutoCleaning(true);
    setCleaningSuccess(null);
    try {
      const res = await cleaningService.autoClean(
        selectedDatasetId,
        activeDs ? `${activeDs.name} (Auto-Cleaned)` : undefined
      );
      setCleaningSuccess(
        `Dataset successfully auto-cleaned and structured in tabular format! (Applied ${res.operations.length} operations)`
      );
      // Reload catalog and switch to new cleaned dataset
      const updatedDatasets = await datasetService.list();
      setDatasets(updatedDatasets);
      if (res.cleaned_dataset_id) {
        setSelectedDatasetId(res.cleaned_dataset_id);
        runAudit(res.cleaned_dataset_id);
        loadTableData(res.cleaned_dataset_id);
        setActiveTab('table');
      }
    } catch (err) {
      console.error('Auto clean failed:', err);
      alert('Failed to auto-clean dataset. Please try again.');
    } finally {
      setAutoCleaning(false);
    }
  };

  const handleDownload = async (format: 'csv' | 'xlsx') => {
    const activeDs = datasets.find((d) => d.id === selectedDatasetId);
    if (!activeDs) return;
    try {
      setDownloadingFormat(format);
      await datasetService.download(activeDs.id, activeDs.name, format);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download dataset.');
    } finally {
      setDownloadingFormat(null);
    }
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
      setActiveTab('recommendations');
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
      const updatedDatasets = await datasetService.list();
      setDatasets(updatedDatasets);
      if (res.cleaned_dataset_id) {
        setSelectedDatasetId(res.cleaned_dataset_id);
        runAudit(res.cleaned_dataset_id);
        loadTableData(res.cleaned_dataset_id);
        setActiveTab('table');
      }
    } catch (err) {
      console.error('Apply cleaning failed:', err);
      alert('Failed to apply cleaning operations.');
    } finally {
      setApplying(false);
    }
  };

  const currentDataset = datasets.find((d) => d.id === selectedDatasetId);

  // Filter rows by search term
  const filteredRows = tableData?.rows?.filter((row: any) => {
    if (!tableSearch.trim()) return true;
    const term = tableSearch.toLowerCase();
    return Object.values(row).some((val) =>
      val !== null && val !== undefined && String(val).toLowerCase().includes(term)
    );
  }) || [];

  if (loading) {
    return <LoadingSpinner message="Loading dataset catalog for cleaning..." />;
  }

  return (
    <div className="space-y-6">
      {/* Title & Action Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-indigo-600" />
            AI Data Cleaning Agent
          </h2>
          <p className="text-xs text-slate-500">
            Automatic structure normalization, missing value imputation, deduplication, and tabular export.
          </p>
        </div>

        {/* Global Controls & Download Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-600">Active Dataset:</label>
            <select
              value={selectedDatasetId}
              onChange={(e) => handleDatasetChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-xs truncate"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.row_count} rows){d.is_cleaned ? ' • [Cleaned]' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                runAudit(selectedDatasetId);
                loadTableData(selectedDatasetId);
              }}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Refresh Audit & Tabular View"
            >
              <RefreshCw className={`w-4 h-4 ${auditing || loadingTable ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* 1-Click Auto-Clean Button */}
          <button
            onClick={handleAutoClean}
            disabled={autoCleaning}
            className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            title="Automatically clean, standardize columns, impute nulls, and deduplicate"
          >
            <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${autoCleaning ? 'animate-spin' : ''}`} />
            {autoCleaning ? 'Auto-Cleaning...' : '⚡ 1-Click Auto-Clean'}
          </button>

          {/* Download CSV Button */}
          <button
            onClick={() => handleDownload('csv')}
            disabled={downloadingFormat === 'csv'}
            className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
            title="Download this dataset as CSV"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-slate-600" />
            {downloadingFormat === 'csv' ? 'Downloading...' : 'Download CSV'}
          </button>

          {/* Download Excel Button */}
          <button
            onClick={() => handleDownload('xlsx')}
            disabled={downloadingFormat === 'xlsx'}
            className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-xs"
            title="Download this dataset as Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            {downloadingFormat === 'xlsx' ? 'Exporting...' : 'Download Excel'}
          </button>
        </div>
      </div>

      {cleaningSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{cleaningSuccess}</span>
          </div>
          <button
            onClick={() => setCleaningSuccess(null)}
            className="text-xs text-emerald-600 hover:text-emerald-900 font-bold ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quality Overview KPI Pills */}
      {analysis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Observations</span>
            <div className="text-xl font-extrabold text-slate-900 mt-1">
              {analysis.total_rows.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500">Across {analysis.total_columns} columns</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-slate-400">Duplicate Rows</span>
            <div className="text-xl font-extrabold text-slate-900 mt-1">
              {analysis.duplicate_rows_count}
            </div>
            <span className="text-[11px] text-slate-500">
              {analysis.duplicate_rows_count > 0 ? 'Requires deduplication' : 'No duplicates detected'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-slate-400">Missing Cells</span>
            <div className="text-xl font-extrabold text-slate-900 mt-1">
              {analysis.missing_cells_count}
            </div>
            <span className="text-[11px] text-slate-500">
              {analysis.missing_cells_count > 0 ? 'Imputation recommended' : 'Zero missing values'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase text-slate-400">Cleaning Recommendations</span>
            <div className="text-xl font-extrabold text-indigo-600 mt-1">
              {analysis.recommendations.length}
            </div>
            <span className="text-[11px] text-slate-500">AI-tailored operations</span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('table')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'table'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Structured Tabular Data</span>
          {tableData?.rows && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'table' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'}`}>
              {tableData.total_rows}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'recommendations'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Cleaning Recommendations</span>
          {analysis && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'recommendations' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'}`}>
              {analysis.recommendations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lineage & History</span>
          {history.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'history' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'}`}>
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: STRUCTURED TABULAR DATA */}
      {activeTab === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
          {/* Table Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <Table className="w-4 h-4 mr-1.5 text-indigo-600" />
                Structured Dataset View ({currentDataset?.name})
              </h3>
              <p className="text-xs text-slate-500">
                {currentDataset?.is_cleaned ? 'Cleaned & standardized tabular records' : 'Raw dataset records'} • {tableData?.total_rows || 0} rows • {tableData?.columns?.length || 0} columns
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Search in table */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter table rows..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-48 sm:w-60"
                />
              </div>

              {/* Quick CSV Export */}
              <button
                onClick={() => handleDownload('csv')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors inline-flex items-center"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                CSV
              </button>

              {/* Quick Excel Export */}
              <button
                onClick={() => handleDownload('xlsx')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors inline-flex items-center"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Excel
              </button>
            </div>
          </div>

          {/* Table Container */}
          {loadingTable ? (
            <LoadingSpinner message="Rendering tabular records..." />
          ) : tableData && tableData.columns ? (
            <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[550px] shadow-xs">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50/90 backdrop-blur sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-bold text-slate-400 text-[10px] w-12 border-r border-slate-200">
                      #
                    </th>
                    {tableData.columns.map((col: string) => {
                      const colType = tableData.column_types?.[col] || 'text';
                      return (
                        <th key={col} className="px-3.5 py-2.5 text-left font-bold text-slate-700 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-semibold text-slate-900">{col}</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-slate-200/80 text-slate-600">
                              {colType}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-indigo-50/20 transition-colors odd:bg-slate-50/30">
                        <td className="px-3 py-1.5 text-slate-400 font-mono text-[10px] border-r border-slate-100">
                          {idx + 1}
                        </td>
                        {tableData.columns.map((col: string) => {
                          const val = row[col];
                          return (
                            <td key={col} className="px-3.5 py-1.5 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                              {val !== null && val !== undefined ? (
                                String(val)
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-slate-100 text-slate-400">
                                  NULL
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={tableData.columns.length + 1} className="px-4 py-8 text-center text-slate-400">
                        No rows match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No tabular data available for this dataset.
            </div>
          )}

          {/* Table Footer */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <span>
              Showing {filteredRows.length} rows (sampled from first 100 rows)
            </span>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-slate-700">Format:</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-bold text-[10px]">
                {currentDataset?.file_type}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLEANING RECOMMENDATIONS & ACTIONS */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Cleaning Recommendations</h3>
                <p className="text-xs text-slate-500">
                  Select which transformations to apply. Original dataset will be preserved unchanged.
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-600">
                {selectedOps.length} of {analysis?.recommendations?.length || 0} operations approved
              </div>
            </div>

            <div className="space-y-3">
              {analysis && analysis.recommendations.length > 0 ? (
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
                <div className="py-8 text-center text-xs text-slate-400 space-y-3">
                  <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
                  <div className="text-slate-800 font-bold text-sm">High Structural Integrity</div>
                  <p className="max-w-md mx-auto text-slate-500">
                    No critical anomalies detected in this dataset. You can still run 1-Click Auto-Clean to standardize column headers, trim whitespaces, and normalize date formats.
                  </p>
                  <button
                    onClick={handleAutoClean}
                    disabled={autoCleaning}
                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    {autoCleaning ? 'Auto-Cleaning...' : 'Run 1-Click Auto-Clean & Standardize'}
                  </button>
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
                          <th key={col} className="px-3 py-2 text-left font-bold text-slate-700 whitespace-nowrap">
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
        </div>
      )}

      {/* TAB 3: LINEAGE & HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center space-x-2 mb-3">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800">Cleaning Lineage History</h3>
          </div>
          {history.length > 0 ? (
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
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              No cleaning jobs have been executed on this dataset yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
