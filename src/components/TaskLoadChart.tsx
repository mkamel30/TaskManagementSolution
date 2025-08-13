import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Task, TaskStatus } from '@/types/task';

const STATUS_ORDER: TaskStatus[] = ['لم يتم', 'ستتم المتابعة مرة اخرى', 'تم التنفيذ'];
const COLORS_MAP: Record<TaskStatus, string> = {
  'لم يتم': 'hsl(var(--destructive))', // Red
  'ستتم المتابعة مرة اخرى': '#f59e0b', // Amber
  'تم التنفيذ': 'hsl(var(--primary))', // Primary color
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
            right: 100, // Increased margin for labels on the right
            left: 20,
            bottom: 5,
          }}
          layout="vertical"
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis 
            type="category" 
            dataKey="name" 
            orientation="right" // Move axis to the right
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--destructive))', fontSize: 12 }} // Style the labels
            width={80} // Give space for the labels
            interval={0} // Ensure all labels are shown
          />
          <Tooltip />
          <Legend formatter={renderColorfulLegendText} wrapperStyle={{ direction: 'rtl', paddingTop: '20px' }} />
          
          {/* Stacked bars for actual data */}
          {STATUS_ORDER.map(status => (
            <Bar key={status} dataKey={status} stackId="a" fill={COLORS_MAP[status]} name={status} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};