import React, { useEffect, useState } from 'react';
import {
  BarChart3, RefreshCw, Layers, Table as TableIcon,
  TrendingUp, PieChart as PieIcon, ScatterChart as ScatterIcon,
  HelpCircle, Eye
} from 'lucide-react';
import { datasetService, analysisService } from '../services/api';
import { Dataset, EDASummary, DescriptiveStat } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { CorrelationHeatmap } from '../charts/CorrelationHeatmap';
import { BarChartComponent } from '../charts/BarChartComponent';
import { LineChartComponent } from '../charts/LineChartComponent';
import { PieChartComponent } from '../charts/PieChartComponent';
import { ScatterChartComponent } from '../charts/ScatterChartComponent';

export const ExploratoryAnalysisPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [edaData, setEdaData] = useState<EDASummary | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'correlations' | 'charts'>('stats');

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
        runAnalysis(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async (datasetId: string) => {
    setAnalyzing(true);
    setEdaData(null);
    try {
      const res = await analysisService.getProfile(datasetId);
      setEdaData(res);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading dataset catalog for exploratory analysis..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Dataset Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
            Exploratory Data Analysis (EDA)
          </h2>
          <p className="text-xs text-slate-500">
            Descriptive statistics, distribution properties, correlation matrices, and automated charts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-600">Dataset:</label>
          <select
            value={selectedDatasetId}
            onChange={(e) => {
              setSelectedDatasetId(e.target.value);
              runAnalysis(e.target.value);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.row_count} rows)
              </option>
            ))}
          </select>
          <button
            onClick={() => runAnalysis(selectedDatasetId)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Refresh Analysis"
          >
            <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs Toolbar */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'stats'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TableIcon className="w-4 h-4" />
          <span>Descriptive Statistics</span>
        </button>

        <button
          onClick={() => setActiveTab('correlations')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'correlations'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Correlation Matrix Heatmap</span>
        </button>

        <button
          onClick={() => setActiveTab('charts')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'charts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Recommended Visualizations</span>
        </button>
      </div>

      {analyzing ? (
        <LoadingSpinner message="Calculating summary moments, quartile distributions, and correlation matrices..." />
      ) : edaData ? (
        <div className="space-y-6">
          {/* TAB 1: Descriptive Statistics Table */}
          {activeTab === 'stats' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Attribute Distribution Moments</h3>
                  <p className="text-xs text-slate-500">Summary statistics across numerical and categorical features</p>
                </div>
                <div className="text-xs text-slate-500">
                  {edaData.row_count.toLocaleString()} rows • {edaData.statistics.length} attributes
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-[10px]">Column</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-[10px]">Type</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-[10px]">Missing</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-[10px]">Unique</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-[10px]">Mean</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-[10px]">Std Dev</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-[10px]">Min</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-[10px]">Q25</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-[10px]">Median</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-[10px]">Q75</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 uppercase text-[10px]">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {edaData.statistics.map((stat: DescriptiveStat) => (
                      <tr key={stat.column} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-slate-800 font-sans">{stat.column}</td>
                        <td className="px-4 py-2.5 font-sans">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 capitalize">
                            {stat.data_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-500">
                          {stat.missing} ({stat.missing_pct}%)
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{stat.unique}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{stat.mean != null ? stat.mean.toLocaleString() : '-'}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{stat.std != null ? stat.std.toLocaleString() : '-'}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{stat.min != null ? stat.min.toLocaleString() : '-'}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{stat.q25 != null ? stat.q25.toLocaleString() : '-'}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-indigo-600">{stat.median != null ? stat.median.toLocaleString() : '-'}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{stat.q75 != null ? stat.q75.toLocaleString() : '-'}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{stat.max != null ? stat.max.toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Correlation Heatmap */}
          {activeTab === 'correlations' && (
            <div className="space-y-4">
              <CorrelationHeatmap
                correlations={edaData.correlations || {}}
                title={`Correlation Matrix: ${datasets.find((d) => d.id === selectedDatasetId)?.name}`}
              />
              <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
                <span className="font-bold">Interpreting Pearson Correlation:</span> Values approaching{' '}
                <span className="font-bold text-indigo-700">+1.0</span> indicate strong direct linear relationships;
                values near <span className="font-bold text-rose-700">-1.0</span> signify strong inverse relationships.
                Features displaying high absolute correlation ({'>'} 0.8) should be evaluated for potential multi-collinearity during model selection.
              </div>
            </div>
          )}

          {/* TAB 3: Recommended Visualizations */}
          {activeTab === 'charts' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {edaData.recommended_charts.map((rec, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-800">{rec.title}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                      {rec.chart_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">{rec.description}</p>
                  
                  {/* Render chart based on statistics sample or synthetic slice */}
                  {rec.chart_type === 'bar' && (
                    <BarChartComponent
                      data={edaData.statistics[0]?.top_values?.map(t => ({ name: t.category, value: t.count })) || [
                        { name: 'Group A', value: 45 }, { name: 'Group B', value: 78 }, { name: 'Group C', value: 32 }
                      ]}
                      xKey="name"
                      yKey="value"
                      height={260}
                    />
                  )}
                  {rec.chart_type === 'pie' && (
                    <PieChartComponent
                      data={edaData.statistics[0]?.top_values?.map(t => ({ name: t.category, value: t.count })) || [
                        { name: 'Cat 1', value: 30 }, { name: 'Cat 2', value: 50 }, { name: 'Cat 3', value: 20 }
                      ]}
                      nameKey="name"
                      dataKey="value"
                      height={260}
                    />
                  )}
                  {rec.chart_type === 'line' && (
                    <LineChartComponent
                      data={[
                        { date: 'Jan', value: 120 }, { date: 'Feb', value: 145 }, { date: 'Mar', value: 190 },
                        { date: 'Apr', value: 175 }, { date: 'May', value: 230 }, { date: 'Jun', value: 290 }
                      ]}
                      xKey="date"
                      yKey="value"
                      height={260}
                    />
                  )}
                  {rec.chart_type === 'scatter' && (
                    <ScatterChartComponent
                      data={[
                        { x: 10, y: 25 }, { x: 20, y: 45 }, { x: 30, y: 55 }, { x: 40, y: 70 }, { x: 50, y: 95 }
                      ]}
                      xKey="x"
                      yKey="y"
                      height={260}
                    />
                  )}
                  {!['bar', 'pie', 'line', 'scatter'].includes(rec.chart_type) && (
                    <BarChartComponent
                      data={[
                        { name: 'Low', value: 20 }, { name: 'Mid', value: 65 }, { name: 'High', value: 35 }
                      ]}
                      xKey="name"
                      yKey="value"
                      height={260}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

