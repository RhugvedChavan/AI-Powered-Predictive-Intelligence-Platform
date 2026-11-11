import React from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts';

interface PieChartProps {
  data: any[];
  nameKey: string;
  dataKey: string;
  title?: string;
  height?: number;
}

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

export const PieChartComponent: React.FC<PieChartProps> = ({
  data,
  nameKey,
  dataKey,
  title,
  height = 300,
}) => {
  return (
    <div className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      {title && <h4 className="text-sm font-bold text-slate-800 mb-2">{title}</h4>}
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey={dataKey}
              nameKey={nameKey}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '8px',
                border: 'none',
                color: '#fff',
                fontSize: '12px',
              }}
              formatter={(val: any) => [typeof val === 'number' ? val.toLocaleString() : val, 'Count / Value']}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

