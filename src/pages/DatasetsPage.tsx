import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Search, Database, Trash2, Eye, Sparkles,
  BarChart3, FileSpreadsheet, CheckCircle, AlertCircle, X,
  Layers, Filter
} from 'lucide-react';
import { datasetService } from '../services/api';
import { Dataset, DatasetColumn } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const DatasetsPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Preview Modal
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async (query?: string) => {
    try {
      setLoading(true);
      const data = await datasetService.list(query);
      setDatasets(data);
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDatasets(search);
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      await datasetService.upload(file);
      await loadDatasets();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload dataset. Ensure format is CSV, XLSX, or SQLite.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete dataset "${name}"?`)) {
      try {
        await datasetService.delete(id);
        setDatasets(datasets.filter((d) => d.id !== id));
        if (previewDataset?.id === id) setPreviewDataset(null);
      } catch (err) {
        alert('Failed to delete dataset.');
      }
    }
  };

  const openPreview = async (ds: Dataset) => {
    setPreviewDataset(ds);
    setLoadingPreview(true);
    try {
      const fullDetails = await datasetService.get(ds.id);
      const rowsData = await datasetService.preview(ds.id, 50, 0);
      setPreviewDataset(fullDetails);
      setPreviewData(rowsData);
    } catch (err) {
      console.error('Failed to fetch preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Datasets & Storage</h2>
          <p className="text-xs text-slate-500">
            Upload CSV, Excel, SQLite or DuckDB files. Automatic profiling and schema inspection.
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all self-start"
        >
          <Upload className="w-4 h-4 mr-1.5" />
          Upload New Dataset
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.sqlite,.db,.duckdb"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-indigo-600 bg-indigo-50/60'
            : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/60'
        }`}
      >
        {uploading ? (
          <LoadingSpinner message="Validating, profiling, and indexing dataset into DuckDB engine..." />
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              Drag and drop your dataset here, or <span className="text-indigo-600">browse</span>
            </div>
            <p className="text-xs text-slate-400">
              Supported formats: CSV, XLSX, XLS, SQLite (.db, .sqlite), DuckDB • Max size: 150MB
            </p>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search datasets by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </form>
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{datasets.length}</span> datasets
        </div>
      </div>

      {/* Datasets Table */}
      {loading ? (
        <LoadingSpinner message="Retrieving datasets from storage..." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Dataset Name
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Format
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Dimensions
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Size
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {datasets.length > 0 ? (
                datasets.map((ds) => (
                  <tr key={ds.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{ds.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{ds.original_filename}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-slate-100 text-slate-700">
                        {ds.file_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium">
                      {ds.row_count.toLocaleString()} rows • {ds.col_count} cols
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {(ds.file_size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-5 py-3.5">
                      {ds.is_cleaned ? (
                        <StatusBadge status="Cleaned" />
                      ) : (
                        <span className="text-slate-500">Original</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1">
                      <button
                        onClick={() => openPreview(ds)}
                        title="Preview & Schema"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate('/cleaning')}
                        title="Clean Data"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate('/analysis')}
                        title="Exploratory Analysis"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ds.id, ds.name)}
                        title="Delete Dataset"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No datasets available. Upload a dataset using the drop zone above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Dataset Preview & Schema Modal */}
      {previewDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">{previewDataset.name}</h3>
                <p className="text-xs text-slate-500">
                  {previewDataset.row_count.toLocaleString()} rows • {previewDataset.col_count} columns • {previewDataset.file_type.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setPreviewDataset(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingPreview ? (
                <LoadingSpinner message="Loading dataset schema and records..." />
              ) : (
                <>
                  {/* Columns Schema Cards */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Schema & Column Profiles ({previewDataset.columns?.length || 0})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {previewDataset.columns?.map((col: DatasetColumn) => (
                        <div key={col.id} className="p-3 rounded-xl border border-slate-200 bg-white shadow-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-800 truncate" title={col.name}>
                              {col.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 capitalize">
                              {col.data_type}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 space-y-0.5">
                            <div>Missing: <span className="font-medium text-slate-700">{col.null_count}</span></div>
                            <div>Distinct Values: <span className="font-medium text-slate-700">{col.unique_count}</span></div>
                            {col.stats?.mean != null && (
                              <div>Mean: <span className="font-medium text-slate-700">{col.stats.mean.toLocaleString()}</span></div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sample Records Table */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Data Records Sample (First 50 Rows)
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-80">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            {previewData?.columns?.map((c: string) => (
                              <th key={c} className="px-3 py-2 text-left font-bold text-slate-700 whitespace-nowrap">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {previewData?.rows?.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              {previewData.columns.map((c: string) => (
                                <td key={c} className="px-3 py-1.5 text-slate-600 whitespace-nowrap font-mono text-[11px]">
                                  {row[c] !== null && row[c] !== undefined ? String(row[c]) : <span className="text-slate-300">NULL</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setPreviewDataset(null);
                  navigate('/cleaning');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Open Data Cleaning Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

