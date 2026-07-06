import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task } from '@/types/task';
import { CheckCircle, Clock, ListTodo, CalendarPlus } from 'lucide-react';
import { isPast, isToday, isThisWeek, parseISO, endOfWeek, startOfWeek } from 'date-fns';

interface KPICardsProps {
  tasks: Task[];
}

export const KPICards: React.FC<KPICardsProps> = ({ tasks }) => {
  const totalOpenTasks = tasks.filter(task => task.status !== 'تم التنفيذ').length;
  const overdueTasks = tasks.filter(task => 
    task.status !== 'تم التنفيذ' && task.reminder_at && isPast(parseISO(task.reminder_at))
  ).length;

  const tasksCompletedThisWeek = tasks.filter(task => {
    if (task.status === 'تم التنفيذ' && task.updated_at) {
      const updatedAt = parseISO(task.updated_at);
      const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 0 }); // Sunday as start of week
      const endOfCurrentWeek = endOfWeek(new Date(), { weekStartsOn: 0 }); // Saturday as end of week
      return updatedAt >= startOfCurrentWeek && updatedAt <= endOfCurrentWeek;
    }
    return false;
  }).length;

  const newTasksToday = tasks.filter(task => 
    isToday(parseISO(task.created_at))
  ).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-right">إجمالي المهام المفتوحة</CardTitle>
          <ListTodo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="text-right">
          <div className="text-2xl font-bold">{totalOpenTasks}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-right">مهام متأخرة</CardTitle>
          <Clock className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent className="text-right">
          <div className="text-2xl font-bold">{overdueTasks}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-right">مهام مكتملة هذا الأسبوع</CardTitle>
          <CheckCircle className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="text-right">
          <div className="text-2xl font-bold">{tasksCompletedThisWeek}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-right">مهام جديدة اليوم</CardTitle>
          <CalendarPlus className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="text-right">
          <div className="text-2xl font-bold">{newTasksToday}</div>
        </CardContent>
      </Card>
    </div>
  );
};