import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Task, TaskStatus } from '@/types/task';

const STATUS_ORDER: TaskStatus[] = ['لم يتم', 'ستتم المتابعة مرة اخرى', 'تم التنفيذ'];
const COLORS_MAP: Record<TaskStatus, string> = {
  'لم يتم': 'hsl(var(--destructive))', // Red
  'ستتم المتابعة مرة اخرى': '#f59e0b', // Amber
  'تم التنفيذ': 'hsl(var(--primary))', // Primary color
};

// Custom component to render Y-axis ticks inside the bars
const CustomYAxisTick = ({ x, y, payload }: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={5} y={0} dy={4} textAnchor="start" fill="#fff" className="text-xs font-semibold">
        {payload.value}
      </text>
    </g>
  );
};

export const TaskLoadChart: React.FC<TaskLoadChartProps> = ({ tasks }) => {
  const employeeDataMap = new Map<string, { name: string; 'لم يتم': number; 'ستتم المتابعة مرة اخرى': number; 'تم التنفيذ': number }>();

  tasks.forEach(task => {
    const employeeName = task.responsible_employee || 'غير محدد';
    if (!employeeDataMap.has(employeeName)) {
      employeeDataMap.set(employeeName, {
        name: employeeName,
        'لم يتم': 0,
        'ستتم المتابعة مرة اخرى': 0,
        'تم التنفيذ': 0,
      });
    }
    const employeeData = employeeDataMap.get(employeeName)!;
    employeeData[task.status]++;
  });

  const data = Array.from(employeeDataMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  // Custom legend to show name and count
  const renderColorfulLegendText = (value: string, entry: any) => {
    const { color } = entry;
    return <span style={{ color }}>{value}</span>;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
          layout="vertical" // Make it a horizontal bar chart
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis 
            type="category" 
            dataKey="name" 
            tickLine={false} 
            axisLine={false}
            tick={<CustomYAxisTick />}
            width={10} // Minimal width since labels are now "inside"
          />
          <Tooltip />
          <Legend formatter={renderColorfulLegendText} wrapperStyle={{ direction: 'rtl', paddingTop: '20px' }} />
          {STATUS_ORDER.map(status => (
            <Bar key={status} dataKey={status} stackId="a" fill={COLORS_MAP[status]} name={status} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};