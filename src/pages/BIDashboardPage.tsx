import React, { useEffect, useState } from 'react';
import {
  LineChart as LineChartIcon, Plus, Save, Download,
  BarChart3, PieChart as PieIcon, RefreshCw, LayoutGrid
} from 'lucide-react';
import { datasetService, biService } from '../services/api';
import { Dataset, BIDashboard } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { BarChartComponent } from '../charts/BarChartComponent';
import { LineChartComponent } from '../charts/LineChartComponent';
import { PieChartComponent } from '../charts/PieChartComponent';
import { ScatterChartComponent } from '../charts/ScatterChartComponent';

export const BIDashboardPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Dashboards
  const [dashboards, setDashboards] = useState<BIDashboard[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<BIDashboard | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const dsList = await datasetService.list();
      setDatasets(dsList);
      if (dsList.length > 0) {
        const firstId = dsList[0].id;
        setSelectedDatasetId(firstId);
        const dashList = await biService.listDashboards(firstId);
        setDashboards(dashList);
        if (dashList.length > 0) {
          setActiveDashboard(dashList[0]);
        } else {
          await createDefaultDashboard(firstId, dsList[0].name, dsList[0].project_id);
        }
      }
    } catch (err) {
      console.error('Failed to load BI dashboards:', err);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultDashboard = async (datasetId: string, dsName?: string, projId?: string) => {
    setGenerating(true);
    const ds = datasets.find((d) => d.id === datasetId);
    try {
      const newDash = await biService.createDashboard({
        dataset_id: datasetId,
        project_id: projId || ds?.project_id,
        name: `${dsName || ds?.name || 'Dataset'} Business Overview`
      });
      setActiveDashboard(newDash);
      setDashboards((prev) => [newDash, ...prev.filter((d) => d.id !== newDash.id)]);
    } catch (err) {
      console.error('Failed to create default dashboard:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDatasetChange = async (id: string) => {
    setSelectedDatasetId(id);
    setGenerating(true);
    const ds = datasets.find((d) => d.id === id);
    try {
      const dashList = await biService.listDashboards(id);
      setDashboards(dashList);
      if (dashList.length > 0) {
        setActiveDashboard(dashList[0]);
      } else {
        await createDefaultDashboard(id, ds?.name, ds?.project_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading Business Intelligence dashboards..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <LineChartIcon className="w-5 h-5 mr-2 text-indigo-600" />
            Business Intelligence Dashboards
          </h2>
          <p className="text-xs text-slate-500">
            Automated KPI discovery, executive aggregation metrics, and customizable chart widgets.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-600">Dataset:</label>
          <select
            value={selectedDatasetId}
            onChange={(e) => handleDatasetChange(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.row_count} rows)
              </option>
            ))}
          </select>
          <button
            onClick={() => createDefaultDashboard(selectedDatasetId)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Dashboard</span>
          </button>
        </div>
      </div>

      {generating ? (
        <LoadingSpinner message="Discovering domain KPIs and rendering analytics widgets..." />
      ) : activeDashboard ? (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeDashboard.kpis?.map((kpi, idx) => (
              <div key={kpi.id || idx} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {kpi.title}
                </span>
                <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                  {kpi.format === 'currency' ? `$${Number(kpi.value).toLocaleString()}` : Number(kpi.value).toLocaleString()}
                </div>
                {kpi.subtitle && (
                  <p className="mt-1 text-xs text-slate-400 capitalize">{kpi.subtitle}</p>
                )}
              </div>
            ))}
          </div>

          {/* Interactive Visualizations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeDashboard.charts?.map((chart, idx) => (
              <div key={chart.id || idx} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-800">{chart.title}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700">
                    {chart.type}
                  </span>
                </div>

                {chart.type === 'bar' && (
                  <BarChartComponent
                    data={chart.data}
                    xKey={chart.x_key || 'name'}
                    yKey={chart.y_key || 'value'}
                    height={260}
                  />
                )}

                {chart.type === 'pie' && (
                  <PieChartComponent
                    data={chart.data}
                    nameKey={chart.category_key || 'name'}
                    dataKey={chart.value_key || 'value'}
                    height={260}
                  />
                )}

                {chart.type === 'line' && (
                  <LineChartComponent
                    data={chart.data}
                    xKey={chart.x_key || 'name'}
                    yKey={chart.y_key || 'value'}
                    height={260}
                  />
                )}

                {chart.type === 'scatter' && (
                  <ScatterChartComponent
                    data={chart.data}
                    xKey={chart.x_key || 'x'}
                    yKey={chart.y_key || 'y'}
                    height={260}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500 text-xs space-y-3">
          <p className="font-medium text-slate-600">No dashboard generated yet for this dataset.</p>
          <button
            onClick={() => createDefaultDashboard(selectedDatasetId)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors"
          >
            Generate Executive BI Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

