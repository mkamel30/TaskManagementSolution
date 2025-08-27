import React, { useState } from 'react';
import { Button } from './ui/button';
import { DatePicker } from './ui/date-picker';
import { getBakeryQuotas } from '@/api/bakery-quotas';
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

        // Fetch all quotas first (without pagination, search, or sort for export)
        // We need to fetch all data, so we'll call getBakeryQuotas with a very large itemsPerPage
        const allQuotasResponse = await getBakeryQuotas(1, 1000000); // Fetch a large number of items
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

        const dataToExport = filteredQuotas.map(quota => ({
          'كود العميل': quota.client_id,
          'اسم العميل': quota.client_name,
          'قيمة الحصة': quota.quota_value,
          'تاريخ الحصة': format(new Date(quota.quota_date), 'dd.MM.yyyy', { locale: ar }),
          'نوع الخصم': quota.discount_type || '',
          'ملاحظات': quota.notes || '',
          'تاريخ الإنشاء': format(new Date(quota.created_at), 'd MMMM yyyy, h:mm a', { locale: ar }),
          'آخر تحديث': format(new Date(quota.updated_at), 'd MMMM yyyy, h:mm a', { locale: ar }),
        }));

        const worksheet = utils.json_to_sheet(dataToExport);
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, 'BakeryQuotas');
        writeFile(workbook, 'BakeryQuotasExport.xlsx');

        resolve('success');
      } catch (error) {
        reject(error);
      }
    });

    toast.promise(exportPromise, {
      loading: 'جاري تصدير بيانات المخابز...',
      success: (data) => {
        if (data === 'no_data') {
          return 'لا توجد بيانات في النطاق الزمني المحدد.';
        }
        return 'تم تصدير بيانات المخابز بنجاح!';
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