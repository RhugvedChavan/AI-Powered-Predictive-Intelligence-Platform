import React from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts';

interface LineChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  title?: string;
  color?: string;
  secondaryKey?: string;
  secondaryColor?: string;
  height?: number;
}

export const LineChartComponent: React.FC<LineChartProps> = ({
  data,
  xKey,
  yKey,
  title,
  color = '#6366f1',
  secondaryKey,
  secondaryColor = '#10b981',
  height = 300,
}) => {
  return (
    <div className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      {title && <h4 className="text-sm font-bold text-slate-800 mb-3">{title}</h4>}
      <div style={{ height, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: '#64748b' }}
              angle={-25}
              textAnchor="end"
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
              formatter={(val: any) => [typeof val === 'number' ? val.toLocaleString() : val]}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 6 }}
            />
            {secondaryKey && (
              <Line
                type="monotone"
                dataKey={secondaryKey}
                stroke={secondaryColor}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2, fill: secondaryColor }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

