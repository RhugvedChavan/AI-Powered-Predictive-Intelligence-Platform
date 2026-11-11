import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts';

interface BarChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  title?: string;
  color?: string;
  height?: number;
}

export const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  xKey,
  yKey,
  title,
  color = '#4f46e5',
  height = 300,
}) => {
  return (
    <div className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      {title && <h4 className="text-sm font-bold text-slate-800 mb-3">{title}</h4>}
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-25}
              textAnchor="end"
              interval={0}
              height={40}
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '8px',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
              }}
              formatter={(val: any) => [typeof val === 'number' ? val.toLocaleString() : val, yKey]}
            />
            <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

