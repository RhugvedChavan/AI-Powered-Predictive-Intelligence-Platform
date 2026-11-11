import React, { useEffect, useState } from 'react';
import {
  Cpu, Play, Download, BarChart2, CheckCircle2, AlertCircle,
  HelpCircle, RefreshCw, Zap, TrendingUp, Layers, Sliders
} from 'lucide-react';
import { datasetService, mlService } from '../services/api';
import { Dataset, MLModel } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/common/StatusBadge';
import { MetricCard } from '../components/common/MetricCard';
import { LineChartComponent } from '../charts/LineChartComponent';
import { BarChartComponent } from '../charts/BarChartComponent';

const ALGORITHMS: Record<string, string[]> = {
  regression: [
    'RandomForestRegressor',
    'LinearRegression',
    'GradientBoostingRegressor',
    'DecisionTreeRegressor'
  ],
  classification: [
    'RandomForestClassifier',
    'LogisticRegression',
    'GradientBoostingClassifier',
    'DecisionTreeClassifier'
  ],
  clustering: ['KMeans'],
  time_series: ['ExponentialSmoothing', 'ARIMA', 'MovingAverage']
};

export const PredictiveMLPage: React.FC = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Training Form State
  const [taskType, setTaskType] = useState<'regression' | 'classification' | 'clustering' | 'time_series'>('regression');
  const [algorithm, setAlgorithm] = useState<string>('RandomForestRegressor');
  const [modelName, setModelName] = useState<string>('My Predictive Model');
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [testSize, setTestSize] = useState<number>(0.2);
  const [training, setTraining] = useState(false);
  const [trainError, setTrainError] = useState<string | null>(null);

  // Active Models
  const [models, setModels] = useState<MLModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<MLModel | null>(null);

  // Inference State
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const dsList = await datasetService.list();
      setDatasets(dsList);
      if (dsList.length > 0) {
        setSelectedDatasetId(dsList[0].id);
        const detailed = await datasetService.get(dsList[0].id);
        setupDefaultsForDataset(detailed);
      }
      const modelList = await mlService.list();
      setModels(modelList);
      if (modelList.length > 0) {
        setSelectedModel(modelList[0]);
        initInputsForModel(modelList[0]);
      }
    } catch (err) {
      console.error('Failed to load ML studio data:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupDefaultsForDataset = (ds: Dataset) => {
    const cols = ds.columns || [];
    const numCols = cols.filter((c) => c.data_type === 'numerical').map((c) => c.name);
    const catCols = cols.filter((c) => c.data_type === 'categorical').map((c) => c.name);

    if (numCols.length > 0) {
      setTargetColumn(numCols[numCols.length - 1]); // e.g. Revenue
      const feats = [...numCols.slice(0, -1), ...catCols].slice(0, 5);
      setSelectedFeatures(feats);
    }
  };

  const initInputsForModel = (m: MLModel) => {
    const inputs: Record<string, any> = {};
    m.feature_columns.forEach((col) => {
      inputs[col] = '';
    });
    setInputValues(inputs);
    setPredictionResult(null);
  };

  const handleTaskTypeChange = (type: any) => {
    setTaskType(type);
    const algos = ALGORITHMS[type];
    setAlgorithm(algos[0]);
  };

  const handleTrain = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrainError(null);
    if (taskType !== 'clustering' && !targetColumn) {
      setTrainError('Please select a valid target column.');
      return;
    }
    if (selectedFeatures.length === 0) {
      setTrainError('Please select at least one feature column.');
      return;
    }

    setTraining(true);
    try {
      const createdModel = await mlService.train({
        dataset_id: selectedDatasetId,
        name: modelName || `${algorithm} Model`,
        task_type: taskType,
        algorithm,
        target_column: taskType !== 'clustering' ? targetColumn : undefined,
        feature_columns: selectedFeatures,
        test_size: testSize
      });

      setModels([createdModel, ...models]);
      setSelectedModel(createdModel);
      initInputsForModel(createdModel);
    } catch (err: any) {
      setTrainError(err.response?.data?.detail || 'Model training failed.');
    } finally {
      setTraining(false);
    }
  };

  const handlePredict = async () => {
    if (!selectedModel) return;
    setPredicting(true);
    try {
      const res = await mlService.predict(selectedModel.id, inputValues);
      setPredictionResult(res);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Prediction failed.');
    } finally {
      setPredicting(false);
    }
  };

  const selectedDsObj = datasets.find((d) => d.id === selectedDatasetId);

  if (loading) {
    return <LoadingSpinner message="Initializing Predictive Machine Learning Studio..." />;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center">
          <Cpu className="w-5 h-5 mr-2 text-indigo-600" />
          Predictive Machine Learning Studio
        </h2>
        <p className="text-xs text-slate-500">
          Train scikit-learn models, analyze feature importances, compare validation holdout metrics, and run real-time inference.
        </p>
      </div>

      {/* Main Studio Grid: Left Configuration / Right Evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Model Training Wizard (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Train New Model</h3>
            <p className="text-xs text-slate-500">Configure algorithm, targets, and train/test splits</p>
          </div>

          {trainError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{trainError}</span>
            </div>
          )}

          <form onSubmit={handleTrain} className="space-y-4 text-xs">
            {/* Dataset Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Dataset</label>
              <select
                value={selectedDatasetId}
                onChange={async (e) => {
                  setSelectedDatasetId(e.target.value);
                  const detailed = await datasetService.get(e.target.value);
                  setupDefaultsForDataset(detailed);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.row_count} rows)
                  </option>
                ))}
              </select>
            </div>

            {/* Task Type Tabs */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Prediction Task</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'regression', label: 'Regression' },
                  { id: 'classification', label: 'Classification' },
                  { id: 'clustering', label: 'Clustering' },
                  { id: 'time_series', label: 'Forecasting' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTaskTypeChange(t.id)}
                    className={`py-1.5 px-3 rounded-lg font-bold text-center border transition-all ${
                      taskType === t.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Algorithm Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Algorithm</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                {ALGORITHMS[taskType]?.map((algo) => (
                  <option key={algo} value={algo}>
                    {algo}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Column (if supervised) */}
            {taskType !== 'clustering' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Variable (Y to predict)</label>
                <select
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                >
                  <option value="">-- Select Target Column --</option>
                  {selectedDsObj?.columns?.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.data_type})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Feature Columns Checkboxes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Predictive Features (X Inputs)</label>
                <span className="text-slate-400 font-mono text-[11px]">{selectedFeatures.length} selected</span>
              </div>
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1.5 bg-slate-50/50">
                {selectedDsObj?.columns
                  ?.filter((c) => c.name !== targetColumn)
                  .map((c) => {
                    const isChecked = selectedFeatures.includes(c.name);
                    return (
                      <label key={c.id} className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedFeatures(selectedFeatures.filter((f) => f !== c.name));
                            } else {
                              setSelectedFeatures([...selectedFeatures, c.name]);
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">({c.data_type})</span>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Test Split Slider */}
            <div>
              <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                <span>Holdout Validation Split</span>
                <span className="font-mono text-indigo-600">{(testSize * 100).toFixed(0)}% Test / {((1 - testSize) * 100).toFixed(0)}% Train</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.4"
                step="0.05"
                value={testSize}
                onChange={(e) => setTestSize(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={training}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {training ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Training & Preprocessing Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Train & Evaluate Model</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Model Performance & Inference (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedModel ? (
            <>
              {/* Selected Model Performance Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-slate-900">{selectedModel.name}</h3>
                      <StatusBadge status={selectedModel.task_type} />
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Algorithm: {selectedModel.algorithm} • Target: {selectedModel.target_column || 'None'}
                    </p>
                  </div>
                  <a
                    href={mlService.downloadArtifactUrl(selectedModel.id)}
                    download
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Artifact (.joblib)
                  </a>
                </div>

                {/* Validation Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedModel.task_type === 'regression' && (
                    <>
                      <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-center">
                        <div className="text-[10px] font-bold text-indigo-500 uppercase">R² Variance</div>
                        <div className="text-lg font-bold text-indigo-900">
                          {selectedModel.metrics.r2 != null ? (selectedModel.metrics.r2 * 100).toFixed(1) + '%' : '-'}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">MAE Error</div>
                        <div className="text-lg font-bold text-slate-800">
                          {selectedModel.metrics.mae != null ? selectedModel.metrics.mae.toLocaleString() : '-'}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">RMSE Error</div>
                        <div className="text-lg font-bold text-slate-800">
                          {selectedModel.metrics.rmse != null ? selectedModel.metrics.rmse.toLocaleString() : '-'}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-center">
                        <div className="text-[10px] font-bold text-emerald-600 uppercase">Accuracy Score</div>
                        <div className="text-lg font-bold text-emerald-900">
                          {selectedModel.metrics.r2 && selectedModel.metrics.r2 > 0 ? `${(selectedModel.metrics.r2 * 100).toFixed(1)}%` : 'Validated'}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedModel.task_type === 'classification' && (
                    <>
                      <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-center">
                        <div className="text-[10px] font-bold text-indigo-500 uppercase">Accuracy</div>
                        <div className="text-lg font-bold text-indigo-900">
                          {selectedModel.metrics.accuracy != null ? (selectedModel.metrics.accuracy * 100).toFixed(1) + '%' : '-'}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">F1-Score</div>
                        <div className="text-lg font-bold text-slate-800">
                          {selectedModel.metrics.f1_score != null ? (selectedModel.metrics.f1_score * 100).toFixed(1) + '%' : '-'}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Precision</div>
                        <div className="text-lg font-bold text-slate-800">
                          {selectedModel.metrics.precision != null ? (selectedModel.metrics.precision * 100).toFixed(1) + '%' : '-'}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Recall</div>
                        <div className="text-lg font-bold text-slate-800">
                          {selectedModel.metrics.recall != null ? (selectedModel.metrics.recall * 100).toFixed(1) + '%' : '-'}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedModel.task_type === 'clustering' && (
                    <div className="col-span-4 p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-center">
                      <div className="text-[10px] font-bold text-indigo-500 uppercase">Silhouette Score</div>
                      <div className="text-lg font-bold text-indigo-900">
                        {selectedModel.metrics.silhouette_score != null ? selectedModel.metrics.silhouette_score.toFixed(3) : '-'}
                      </div>
                    </div>
                  )}

                  {selectedModel.task_type === 'time_series' && (
                    <>
                      <div className="col-span-2 p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-center">
                        <div className="text-[10px] font-bold text-indigo-500 uppercase">MAE Error</div>
                        <div className="text-lg font-bold text-indigo-900">
                          {selectedModel.metrics.mae != null ? selectedModel.metrics.mae.toLocaleString() : '-'}
                        </div>
                      </div>
                      <div className="col-span-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">RMSE Error</div>
                        <div className="text-lg font-bold text-slate-800">
                          {selectedModel.metrics.rmse != null ? selectedModel.metrics.rmse.toLocaleString() : '-'}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Feature Importance Chart */}
                {selectedModel.feature_importance && selectedModel.feature_importance.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">Feature Importance Breakdown</h4>
                    <BarChartComponent
                      data={selectedModel.feature_importance.map((f) => ({
                        feature: f.feature,
                        importance: roundPct(f.importance)
                      }))}
                      xKey="feature"
                      yKey="importance"
                      color="#4338ca"
                      height={200}
                    />
                  </div>
                )}

                {/* Actual vs Predicted Chart */}
                {selectedModel.evaluation_chart_data && selectedModel.evaluation_chart_data.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 mb-2">
                      Validation Holdout (Actual vs Predicted)
                    </h4>
                    <LineChartComponent
                      data={selectedModel.evaluation_chart_data}
                      xKey={selectedModel.task_type === 'time_series' ? 'date' : 'index'}
                      yKey="actual"
                      secondaryKey={selectedModel.task_type === 'time_series' ? 'forecast' : 'predicted'}
                      secondaryColor="#ec4899"
                      height={220}
                    />
                  </div>
                )}
              </div>

              {/* Real-Time Prediction Inference Console */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-800">Live Prediction Inference Studio</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Input custom test variables to generate immediate predictions using serialized pipeline weights.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedModel.feature_columns.map((feat) => (
                    <div key={feat}>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">{feat}</label>
                      <input
                        type="text"
                        placeholder={`Enter ${feat} value...`}
                        value={inputValues[feat] ?? ''}
                        onChange={(e) =>
                          setInputValues({ ...inputValues, [feat]: e.target.value })
                        }
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handlePredict}
                    disabled={predicting}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{predicting ? 'Computing Inference...' : 'Execute Live Prediction'}</span>
                  </button>

                  {predictionResult && (
                    <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-xs font-semibold text-emerald-700">Predicted Output:</span>
                      <span className="text-sm font-extrabold text-emerald-900 font-mono">
                        {typeof predictionResult.prediction === 'number'
                          ? predictionResult.prediction.toLocaleString()
                          : String(predictionResult.prediction)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-400 text-xs">
              Configure parameters on the left and train your first machine learning model.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function roundPct(val: number) {
  return Math.round(val * 100);
}

