import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { getAllBakeryQuotas, getBakeryQuotaHistory } from '@/api/bakery-quotas'; // Updated import
import { utils, writeFile } from 'xlsx';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet } from 'lucide-react';

type ExportType = 'all' | 'dateRange' | 'clientCodes';

export const ExportBakeryQuotas: React.FC = () => {
  const [exportType, setExportType] = useState<ExportType>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [clientCodesInput, setClientCodesInput] = useState('');

  const handleExport = async () => {
    const exportPromise = new Promise(async (resolve, reject) => {
      try {
        let filteredQuotas = [];
        const allQuotas = await getAllBakeryQuotas(); // Fetch all quotas first

        if (exportType === 'all') {
          filteredQuotas = allQuotas;
        } else if (exportType === 'dateRange') {
          if (!startDate || !endDate) {
            reject(new Error('يرجى تحديد تاريخ البدء وتاريخ الانتهاء'));
            return;
          }
          if (startDate > endDate) {
            reject(new Error('تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء'));
            return;
          }
          const adjustedEndDate = new Date(endDate);
          adjustedEndDate.setHours(23, 59, 59, 999);

          filteredQuotas = allQuotas.filter(quota => {
            const quotaDate = new Date(quota.quota_date);
            return quotaDate >= startDate && quotaDate <= adjustedEndDate;
          });
        } else if (exportType === 'clientCodes') {
          const clientIds = clientCodesInput.split(',').map(id => id.trim()).filter(Boolean);
          if (clientIds.length === 0) {
            reject(new Error('يرجى إدخال أكواد العملاء المراد تصديرها'));
            return;
          }
          filteredQuotas = allQuotas.filter(quota => clientIds.includes(quota.client_id));
        }

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
      } catch (error: any) {
        reject(error);
      }
    });

    toast.promise(exportPromise, {
      loading: 'جاري تصدير بيانات المخابز وسجل التغييرات...',
      success: (data) => {
        if (data === 'no_data') {
          return 'لا توجد بيانات مطابقة لمعايير التصدير.';
        }
        return 'تم تصدير بيانات المخابز وسجل التغييرات بنجاح!';
      },
      error: (err) => `حدث خطأ أثناء التصدير: ${err.message || 'خطأ غير معروف'}`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-right flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>تصدير بيانات المخابز إلى Excel</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <RadioGroup value={exportType} onValueChange={(value: ExportType) => setExportType(value)} className="flex flex-col space-y-3 text-right">
          <div className="flex items-center space-x-2 justify-end">
            <Label htmlFor="export-all">تصدير جميع البيانات</Label>
            <RadioGroupItem value="all" id="export-all" />
          </div>
          <div className="flex items-center space-x-2 justify-end">
            <Label htmlFor="export-date-range">تصدير حسب النطاق الزمني</Label>
            <RadioGroupItem value="dateRange" id="export-date-range" />
          </div>
          {exportType === 'dateRange' && (
            <div className="flex flex-col md:flex-row items-center gap-4 pr-8">
              <div className="flex flex-col gap-1 w-full">
                <label className="text-sm font-medium">تاريخ البدء</label>
                <DatePicker date={startDate} setDate={setStartDate} />
              </div>
              <div className="flex flex-col gap-1 w-full">
                <label className="text-sm font-medium">تاريخ الانتهاء</label>
                <DatePicker date={endDate} setDate={setEndDate} />
              </div>
            </div>
          )}
          <div className="flex items-center space-x-2 justify-end">
            <Label htmlFor="export-client-codes">تصدير أكواد عملاء محددة</Label>
            <RadioGroupItem value="clientCodes" id="export-client-codes" />
          </div>
          {exportType === 'clientCodes' && (
            <div className="pr-8">
              <Label htmlFor="client-codes-input" className="block text-sm font-medium mb-1 text-right">
                أدخل أكواد العملاء (مفصولة بفاصلة)
              </Label>
              <Input
                id="client-codes-input"
                value={clientCodesInput}
                onChange={(e) => setClientCodesInput(e.target.value)}
                placeholder="مثال: 123, 456, 789"
                dir="ltr"
              />
            </div>
          )}
        </RadioGroup>

        <Button onClick={handleExport} className="w-full md:w-auto self-end">تصدير</Button>
      </CardContent>
    </Card>
  );
};