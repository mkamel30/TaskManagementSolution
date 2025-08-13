import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTasks } from '@/api/tasks';
import { Task, TaskStatus } from '@/types/task';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskChart } from '@/components/TaskChart';
import { ExportTasks } from '@/components/ExportTasks';
import { startOfMonth, endOfMonth, startOfWeek, addDays, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ReportsPage = () => {
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [filterResponsibleEmployee, setFilterResponsibleEmployee] = useState<string | 'all'>('all');
  const [filterRequestingParty, setFilterRequestingParty] = useState<string | 'all'>('all');

  const { data: tasks, isLoading, isError } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: getTasks,
  });

  const filteredTasks = useMemo(() => {
    let currentTasks = tasks || [];

    // Apply responsible employee filter
    if (filterResponsibleEmployee !== 'all') {
      currentTasks = currentTasks.filter(task => task.responsible_employee === filterResponsibleEmployee);
    }

    // Apply requesting party filter
    if (filterRequestingParty !== 'all') {
      currentTasks = currentTasks.filter(task => task.requesting_party === filterRequestingParty);
    }

    // Apply date range filter
    if (startDate && endDate) {
      const adjustedEndDate = endOfDay(endDate); // Ensure end of day for inclusive range
      currentTasks = currentTasks.filter(task => {
        const taskDate = parseISO(task.created_at);
        return isWithinInterval(taskDate, { start: startDate, end: adjustedEndDate });
      });
    }

    return currentTasks;
  }, [tasks, startDate, endDate, filterResponsibleEmployee, filterRequestingParty]);

  const uniqueResponsibleEmployees = useMemo(() => {
    const employees = new Set<string>();
    tasks?.forEach(task => {
      if (task.responsible_employee) employees.add(task.responsible_employee);
    });
    return Array.from(employees).sort();
  }, [tasks]);

  const uniqueRequestingParties = useMemo(() => {
    const parties = new Set<string>();
    tasks?.forEach(task => {
      if (task.requesting_party) parties.add(task.requesting_party);
    });
    return Array.from(parties).sort();
  }, [tasks]);

  if (isLoading) return <div className="text-center p-8">جاري تحميل التقارير...</div>;
  if (isError || !tasks) return <div className="text-center p-8 text-red-500">حدث خطأ أثناء تحميل البيانات.</div>;

  // The charts will now use the globally filtered tasks
  // The "weekly" and "monthly" concepts are now less relevant for the main charts
  // but we can still show them based on the filtered data if desired, or remove them.
  // For now, I'll keep the charts showing data based on the `filteredTasks` array.

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">تصفية التقرير</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1 w-full">
            <label className="text-sm font-medium text-right">تاريخ البدء</label>
            <DatePicker date={startDate} setDate={setStartDate} />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <label className="text-sm font-medium text-right">تاريخ الانتهاء</label>
            <DatePicker date={endDate} setDate={setEndDate} />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <label className="text-sm font-medium text-right">الموظف المسؤول</label>
            <Select value={filterResponsibleEmployee} onValueChange={(value: string | 'all') => setFilterResponsibleEmployee(value)}>
              <SelectTrigger>
                <SelectValue placeholder="تصفية حسب الموظف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {uniqueResponsibleEmployees.map(employee => (
                  <SelectItem key={employee} value={employee}>{employee}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 w-full">
            <label className="text-sm font-medium text-right">الجهة الطالبة</label>
            <Select value={filterRequestingParty} onValueChange={(value: string | 'all') => setFilterRequestingParty(value)}>
              <SelectTrigger>
                <SelectValue placeholder="تصفية حسب الجهة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {uniqueRequestingParties.map(party => (
                  <SelectItem key={party} value={party}>{party}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-right">حالة المهام (النطاق المحدد)</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskChart tasks={filteredTasks} />
          </CardContent>
        </Card>
        {/* You can add another chart here, or modify the existing ones to show different views of filteredTasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-right">توزيع المهام حسب الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskChart tasks={filteredTasks} /> {/* Re-using TaskChart for the same data, but could be a different chart type */}
          </CardContent>
        </Card>
      </div>
      <ExportTasks />
    </div>
  );
};

export default ReportsPage;