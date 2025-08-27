import React, { useState } from 'react';
import { Button } from './ui/button';
import { DatePicker } from './ui/date-picker';
import { getPaginatedBakeryQuotas, getBakeryQuotaHistory } from '@/api/bakery-quotas'; // Added getBakeryQuotaHistory
import { utils, writeFile } from 'xlsx';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const ExportBakeryQuotas: React.FC = () => {
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

        // Fetch all quotas using getPaginatedBakeryQuotas with a very large limit
        const allQuotasResponse = await getPaginatedBakeryQuotas(1, Number.MAX_SAFE_INTEGER, '', 'quota_date', 'desc');
        const allQuotas = allQuotasResponse.data;
        
        // Filter by date range on the client-side
        const filteredQuotas = allQuotas.filter(quota => {
          const quotaDate = new Date(quota.quota_date);
          return quotaDate >= startDate && quotaDate <= adjustedEndDate;
        });

        if (filteredQuotas.length === 0) {
          resolve('no_data'); // Custom signal for no data
          return;
        }

        const mainQuotasDataToExport = filteredQuotas.map(quota => ({
          'كود العميل': quota.client_id,
          'اسم العميل': quota.client_name,
          'قيمة الحصة': quota.quota_value,
          'تاريخ الحصة': format(new Date(quota.quota_date), 'dd.MM.yyyy', { locale: ar }),
          'نوع الخصم': quota.discount_type || '',
          'ملاحظات': quota.notes || '',
          'تاريخ الإنشاء': format(new Date(quota.created_at), 'd MMMM yyyy, h:mm a', { locale: ar }),
          'آخر تحديث': format(new Date(quota.updated_at), 'd MMMM yyyy, h:mm a', { locale: ar }),
        }));

        const historyPromises = filteredQuotas.map(async (quota) => {
          try {
            const history = await getBakeryQuotaHistory(quota.id);
            return history.map(entry => ({
              'كود العميل': quota.client_id, // Add client_id for linking
              'اسم العميل': quota.client_name, // Add client_name for context
              'وصف التغيير': entry.change_description,
              'القيمة القديمة': entry.old_quota_value,
              'القيمة الجديدة': entry.new_quota_value,
              'تاريخ التغيير': entry.changed_at ? format(new Date(entry.changed_at), 'd MMMM yyyy, h:mm a', { locale: ar }) : '',
              'ملاحظات': entry.notes || '',
              'المستخدم': entry.user_email || 'غير معروف',
            }));
          } catch (historyError) {
            console.error(`Error fetching history for quota ${quota.client_id} (ID: ${quota.id}):`, historyError);
            return []; // Return empty array for this quota's history if it fails
          }
        });

        const allHistoryDataArrays = await Promise.all(historyPromises);
        const allHistoryDataToExport = allHistoryDataArrays.flat(); // Flatten array of arrays

        const workbook = utils.book_new();

        // Add main quotas sheet
        const mainQuotasWorksheet = utils.json_to_sheet(mainQuotasDataToExport);
        utils.book_append_sheet(workbook, mainQuotasWorksheet, 'بيانات المخابز');

        // Add history sheet if there's any history data
        if (allHistoryDataToExport.length > 0) {
          const historyWorksheet = utils.json_to_sheet(allHistoryDataToExport);
          utils.book_append_sheet(workbook, historyWorksheet, 'سجل تغييرات الحصص');
        }

        writeFile(workbook, 'BakeryQuotas_FullExport.xlsx');

        resolve('success');
      } catch (error) {
        reject(error);
      }
    });

    toast.promise(exportPromise, {
      loading: 'جاري تصدير بيانات المخابز وسجل التغييرات...',
      success: (data) => {
        if (data === 'no_data') {
          return 'لا توجد بيانات في النطاق الزمني المحدد.';
        }
        return 'تم تصدير بيانات المخابز وسجل التغييرات بنجاح!';
      },
      error: 'حدث خطأ أثناء التصدير.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-right">تصدير بيانات المخابز إلى Excel</CardTitle>
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