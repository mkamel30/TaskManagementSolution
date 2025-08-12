import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTasks } from '@/api/tasks';
import { Task } from '@/types/task';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskChart } from '@/components/TaskChart';
import { ExportTasks } from '@/components/ExportTasks';
import { startOfMonth, endOfMonth, startOfWeek, addDays, endOfDay } from 'date-fns';

const ReportsPage = () => {
  const { data: tasks, isLoading, isError } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: getTasks,
  });

  if (isLoading) return <div className="text-center p-8">جاري تحميل التقارير...</div>;
  if (isError || !tasks) return <div className="text-center p-8 text-red-500">حدث خطأ أثناء تحميل البيانات.</div>;

  const today = new Date();
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
  const endOfWorkWeek = endOfDay(addDays(startOfThisWeek, 4)); // End of Thursday

  const weeklyTasks = tasks.filter(task => {
    const taskDate = new Date(task.created_at);
    return taskDate >= startOfThisWeek && taskDate <= endOfWorkWeek;
  });

  const startOfThisMonth = startOfMonth(today);
  const endOfThisMonth = endOfMonth(today);
  const monthlyTasks = tasks.filter(task => {
    const taskDate = new Date(task.created_at);
    return taskDate >= startOfThisMonth && taskDate <= endOfThisMonth;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-right">المهام خلال الأسبوع الحالي (الأحد - الخميس)</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskChart tasks={weeklyTasks} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-right">المهام خلال الشهر الحالي</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskChart tasks={monthlyTasks} />
          </CardContent>
        </Card>
      </div>
      <ExportTasks />
    </div>
  );
};

export default ReportsPage;