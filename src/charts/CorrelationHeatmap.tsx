import React from 'react';

interface CorrelationHeatmapProps {
  correlations: Record<string, Record<string, number>>;
  title?: string;
}

export const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({
  correlations,
  title = 'Pearson Correlation Matrix',
}) => {
  const columns = Object.keys(correlations);

  if (columns.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
        No numerical correlation data available.
      </div>
    );
  }

  const getColor = (value: number) => {
    // Value between -1 and 1
    if (value >= 0.7) return 'bg-indigo-600 text-white';
    if (value >= 0.4) return 'bg-indigo-400 text-white';
    if (value >= 0.1) return 'bg-indigo-200 text-indigo-900';
    if (value > -0.1) return 'bg-slate-100 text-slate-700';
    if (value > -0.4) return 'bg-rose-200 text-rose-900';
    if (value > -0.7) return 'bg-rose-400 text-white';
    return 'bg-rose-600 text-white';
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-medium">
          <span className="flex items-center"><span className="w-2.5 h-2.5 bg-rose-500 rounded-sm mr-1"></span> Neg (-1)</span>
          <span className="flex items-center"><span className="w-2.5 h-2.5 bg-slate-200 rounded-sm mr-1"></span> 0</span>
          <span className="flex items-center"><span className="w-2.5 h-2.5 bg-indigo-600 rounded-sm mr-1"></span> Pos (+1)</span>
        </div>
      </div>
      <table className="min-w-full text-center border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-xs font-semibold text-slate-400 text-left"></th>
            {columns.map((col) => (
              <th key={col} className="p-2 text-[11px] font-semibold text-slate-700 max-w-[90px] truncate" title={col}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {columns.map((rowCol) => (
            <tr key={rowCol}>
              <td className="p-2 text-xs font-semibold text-slate-700 text-left truncate max-w-[120px]" title={rowCol}>
                {rowCol}
              </td>
              {columns.map((colCol) => {
                const val = correlations[rowCol]?.[colCol] ?? 0;
                return (
                  <td key={colCol} className="p-1">
                    <div
                      className={`h-9 w-14 mx-auto flex items-center justify-center rounded text-xs font-mono font-medium transition-transform hover:scale-105 cursor-default ${getColor(val)}`}
                      title={`${rowCol} ↔ ${colCol}: ${val}`}
                    >
                      {val.toFixed(2)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

