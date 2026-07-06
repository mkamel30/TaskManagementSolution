import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Task, TaskStatus } from '@/types/task';
import { format, parseISO } from 'date-fns';

interface TaskChartProps {
  tasks: Task[];
}

const STATUS_ORDER: TaskStatus[] = ['تم التنفيذ', 'ستتم المتابعة مرة اخرى', 'لم يتم'];
const COLORS_MAP: Record<TaskStatus, string> = {
  'تم التنفيذ': 'hsl(var(--primary))',
  'ستتم المتابعة مرة اخرى': '#f59e0b', // Amber
  'لم يتم': 'hsl(var(--destructive))', // Red
};

export const TaskChart: React.FC<TaskChartProps> = ({ tasks }) => {
  const statusCounts: Record<TaskStatus, number> = {
    'لم يتم': 0,
    'ستتم المتابعة مرة اخرى': 0,
    'تم التنفيذ': 0,
  };

  tasks.forEach(task => {
    statusCounts[task.status]++;
  });

  const data = STATUS_ORDER.map(status => ({
    name: status,
    value: statusCounts[status],
  }));

  // Custom label for Pie chart slices (percentage inside slice)
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    if (percent * 100 > 5) { // Only show label if slice is large enough
      return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    }
    return null;
  };

  // Custom legend to show name and count
  const renderColorfulLegendText = (value: string, entry: any) => {
    const { color } = entry;
    const item = data.find(d => d.name === value);
    return <span style={{ color }}>{value} ({item?.value || 0})</span>;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100} // Increased outerRadius for better visibility
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${entry.name}`} fill={COLORS_MAP[entry.name as TaskStatus]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend
            wrapperStyle={{ direction: 'rtl', paddingTop: '20px' }}
            formatter={renderColorfulLegendText}
            layout="horizontal" // Display legend items horizontally
            align="center"
            verticalAlign="bottom"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};