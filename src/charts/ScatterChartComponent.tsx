import React from 'react';
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts';

interface ScatterChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  title?: string;
  height?: number;
}

export const ScatterChartComponent: React.FC<ScatterChartProps> = ({
  data,
  xKey,
  yKey,
  title,
  height = 300,
}) => {
  return (
    <div className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      {title && <h4 className="text-sm font-bold text-slate-800 mb-3">{title}</h4>}
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              type="number"
              dataKey={xKey}
              name={xKey}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              type="number"
              dataKey={yKey}
              name={yKey}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '8px',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
              }}
            />
            <Scatter name="Data Point" data={data} fill="#6366f1" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

