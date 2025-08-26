import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BakeryQuota } from '@/api/bakery-quotas';
import { BakeryQuotaHistory } from './BakeryQuotaHistory';
import { Separator } from './ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type BakeryQuotaFormData = Omit<BakeryQuota, 'id' | 'created_at' | 'updated_at'>;

interface BakeryQuotaFormProps {
  initialData?: BakeryQuota;
  onSubmit: (quota: BakeryQuotaFormData) => Promise<void>;
  onCancel: () => void;
}

export const BakeryQuotaForm: React.FC<BakeryQuotaFormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<BakeryQuotaFormData>({
    client_id: initialData?.client_id || '',
    client_name: initialData?.client_name || '',
    quota_value: initialData?.quota_value || 0,
    quota_date: initialData?.quota_date ? new Date(initialData.quota_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    notes: initialData?.notes || '',
  });

  const handleInputChange = (field: keyof BakeryQuotaFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="block text-sm font-medium mb-1 text-right">معرّ العميل</Label>
        <Input
          value={formData.client_id}
          onChange={(e) => handleInputChange('client_id', e.target.value)}
          required
          dir="rtl"
          disabled={!!initialData} /* Disable client_id when editing */
        />
      </div>
      
      <div>
        <Label className="block text-sm font-medium mb-1 text-right">اسم العميل</Label>
        <Input
          value={formData.client_name}
          onChange={(e) => handleInputChange('client_name', e.target.value)}
          required
          dir="rtl"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initialData && (
          <div>
            <Label className="block text-sm font-medium mb-1 text-right">القيمة السابقة للحصة</Label>
            <Input
              type="number"
              value={initialData.quota_value}
              disabled
              dir="rtl"
              className="bg-gray-100 dark:bg-gray-700"
            />
          </div>
        )}
        
        <div>
          <Label className="block text-sm font-medium mb-1 text-right">قيمة الحصة (الجديدة)</Label>
          <Input
            type="number"
            value={formData.quota_value}
            onChange={(e) => handleInputChange('quota_value', parseFloat(e.target.value))}
            required
            dir="rtl"
          />
        </div>
      </div>

      <div>
        <Label className="block text-sm font-medium mb-1 text-right">تاريخ الحصة</Label>
        <Input
          type="date"
          value={formData.quota_date}
          onChange={(e) => handleInputChange('quota_date', e.target.value)}
          required
        />
      </div>

      <div>
        <Label className="block text-sm font-medium mb-1 text-right">ملاحظات</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          dir="rtl"
        />
      </div>
      
      {initialData && (
        <>
          <Separator className="my-4" />
          <BakeryQuotaHistory quotaId={initialData.id} />
        </>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit">
          حفظ
        </Button>
      </div>
    </form>
  );
};