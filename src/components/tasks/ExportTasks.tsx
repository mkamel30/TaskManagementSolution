import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { getTasksByDateRange } from '@/api/tasks';
import { utils, writeFile } from 'xlsx';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ExportTasks: React.FC = () => {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error('يرجى تحديد تاريخ البدء وتاريخ الانتهاء');
      return;
    }
    if (startDate > endDate) {
      toast.error('تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء');
      return;
    }

    const exportPromise = new Promise(async (resolve, reject) => {
      try {
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setHours(23, 59, 59, 999);

        const tasks = await getTasksByDateRange(startDate.toISOString(), adjustedEndDate.toISOString());

        if (tasks.length === 0) {
          resolve('no_tasks'); // Custom signal for no tasks
          return;
        }

        const dataToExport = tasks.map(task => ({
          'رقم المهمة': task.task_number,
          'الإجراء المطلوب': task.required_action,
          'ملاحظات': task.notes,
          'الحالة': task.status,
          'تاريخ التذكير': task.reminder_at ? new Date(task.reminder_at).toLocaleDateString('ar-EG') : '',
          'الجهة الطالبة': task.requesting_party,
          'الموظف المسؤول': task.responsible_employee,
          'كود العميل': task.customer_code,
          'تاريخ الإنشاء': new Date(task.created_at).toLocaleDateString('ar-EG'),
        }));

        const worksheet = utils.json_to_sheet(dataToExport);
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, 'Tasks');
        writeFile(workbook, 'TasksExport.xlsx'); // This is the synchronous part

        resolve('success'); // Indicate success
      } catch (error) {
        reject(error); // Indicate failure
      }
    });

    toast.promise(exportPromise, {
      loading: 'جاري تصدير المهام...',
      success: (data) => {
        if (data === 'no_tasks') {
          return 'لا توجد مهام في النطاق الزمني المحدد.';
        }
        return 'تم تصدير المهام بنجاح!';
      },
      error: 'حدث خطأ أثناء التصدير.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-right">تصدير المهام إلى Excel</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex flex-col gap-1 w-full">
          <label className="text-sm font-medium">تاريخ البدء</label>
          <DatePicker date={startDate} setDate={setStartDate} />
        </div>
        <div className="flex flex-col gap-1 w-full">
          <label className="text-sm font-medium">تاريخ الانتهاء</label>
          <DatePicker date={endDate} setDate={setEndDate} />
        </div>
        <Button onClick={handleExport} className="mt-auto self-end md:self-auto">تصدير</Button>
      </CardContent>
    </Card>
  );
};