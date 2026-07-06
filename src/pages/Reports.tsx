import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTasksByDateRange } from '@/api/tasks';
import { Task } from '@/types/task';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskChart } from '@/components/tasks/TaskChart';
import { ExportTasks } from '@/components/tasks/ExportTasks';
import { startOfMonth, endOfMonth, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KPICards } from '@/components/tasks/KPICards';
import { TaskLoadChart } from '@/components/tasks/TaskLoadChart';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

const ReportsPage = () => {
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [filterResponsibleEmployee, setFilterResponsibleEmployee] = useState<string | 'all'>('all');
  const [filterRequestingParty, setFilterRequestingParty] = useState<string | 'all'>('all');

  // Fetch only tasks within selected date range
  const { data: tasks, isLoading, isError } = useQuery<Task[]>({
    queryKey: ['tasksReport', startDate, endDate],
    queryFn: () => {
      const s = startDate ? startDate.toISOString() : startOfMonth(new Date()).toISOString();
      const e = endDate ? endDate.toISOString() : endOfMonth(new Date()).toISOString();
      return getTasksByDateRange(s, e);
    },
  });

  // Query filter helper data (reused from Index page global cache)
  const { data: filterFieldsData } = useQuery({
    queryKey: ['tasksFilterFields'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('responsible_employee, requesting_party');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10 // 10 minutes cache
  });

  const uniqueResponsibleEmployees = useMemo(() => {
    const employees = new Set<string>();
    filterFieldsData?.forEach(item => {
      if (item.responsible_employee) employees.add(item.responsible_employee);
    });
    return Array.from(employees).sort();
  }, [filterFieldsData]);

  const uniqueRequestingParties = useMemo(() => {
    const parties = new Set<string>();
    filterFieldsData?.forEach(item => {
      if (item.requesting_party) parties.add(item.requesting_party);
    });
    return Array.from(parties).sort();
  }, [filterFieldsData]);

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

    // Double check date range filter client-side just in case
    if (startDate && endDate) {
      const adjustedEndDate = endOfDay(endDate);
      currentTasks = currentTasks.filter(task => {
        const taskDate = parseISO(task.created_at);
        return isWithinInterval(taskDate, { start: startDate, end: adjustedEndDate });
      });
    }

    return currentTasks;
  }, [tasks, startDate, endDate, filterResponsibleEmployee, filterRequestingParty]);

  if (isError) return <div className="text-center p-8 text-red-500">حدث خطأ أثناء تحميل البيانات.</div>;

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

      {isLoading ? (
        <div className="space-y-6">
          {/* KPI Cards Skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Charts Skeletons */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex justify-between items-center"><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center"><Skeleton className="h-full w-full" /></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex justify-between items-center"><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center"><Skeleton className="h-full w-full" /></CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <>
          <KPICards tasks={filteredTasks} />

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-right">حالة المهام (النطاق المحدد)</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskChart tasks={filteredTasks} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-right">توزيع المهام حسب الموظف المسؤول</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskLoadChart tasks={filteredTasks} />
              </CardContent>
            </Card>
          </div>
          <ExportTasks />
        </>
      )}
    </div>
  );
};

export default ReportsPage;