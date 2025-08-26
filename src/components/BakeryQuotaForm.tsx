import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BakeryQuota } from '@/api/bakery-quotas';
import { BakeryQuotaHistory } from './BakeryQuotaHistory';
import { Separator } from './ui/separator';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getBakeryQuotaByClientId } from '@/api/bakery-quotas';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Import Alert components
import { Info } from 'lucide-react'; // Import Info icon

type BakeryQuotaFormData = Omit<BakeryQuota, 'id' | 'created_at' | 'updated_at'>;

interface BakeryQuotaFormProps {
  initialData?: BakeryQuota;
  onSubmit: (quota: BakeryQuotaFormData, existingQuotaId?: string) => Promise<void>; // Modified signature
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
  const [previousQuotaValue, setPreviousQuotaValue] = useState<number | null>(null);
  const [isFetchingPreviousQuota, setIsFetchingPreviousQuota] = useState(false);
  const [existingQuotaForClientId, setExistingQuotaForClientId] = useState<BakeryQuota | null>(null); // New state

  // If editing, set the previous quota value to the initial data's quota value
  useEffect(() => {
    if (initialData) {
      setPreviousQuotaValue(initialData.quota_value);
      setExistingQuotaForClientId(initialData); // If editing, this is the existing one
    } else {
      setPreviousQuotaValue(null);
      setExistingQuotaForClientId(null);
    }
  }, [initialData]);

  const handleInputChange = (field: keyof BakeryQuotaFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClientIdBlur = async () => {
    if (!initialData && formData.client_id) { // Only for new forms and if client_id is entered
      setIsFetchingPreviousQuota(true);
      try {
        const existingQuota = await getBakeryQuotaByClientId(formData.client_id);
        if (existingQuota) {
          setPreviousQuotaValue(existingQuota.quota_value);
          setExistingQuotaForClientId(existingQuota); // Store the full object
          // If client name is empty, pre-fill it from the existing quota
          if (!formData.client_name) {
            setFormData(prev => ({ ...prev, client_name: existingQuota.client_name }));
          }
        } else {
          setPreviousQuotaValue(null);
          setExistingQuotaForClientId(null); // No existing quota found
        }
      } catch (error) {
        console.error("Error fetching previous quota:", error);
        setPreviousQuotaValue(null);
        setExistingQuotaForClientId(null);
      } finally {
        setIsFetchingPreviousQuota(false);
      }
    } else if (!initialData && !formData.client_id) {
      setPreviousQuotaValue(null); // Clear if client_id is empty
      setExistingQuotaForClientId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData, existingQuotaForClientId?.id); // Pass existingQuotaId
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* New Alert for existing client */}
      {!initialData && existingQuotaForClientId && (
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 text-right">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle>مخبز موجود!</AlertTitle>
          <AlertDescription>
            كود العميل هذا موجود بالفعل. سيتم تحديث بياناته بدلاً من إنشاء سجل جديد.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <Label className="block text-sm font-medium mb-1 text-right">كود العميل</Label>
        <Input
          value={formData.client_id}
          onChange={(e) => handleInputChange('client_id', e.target.value)}
          onBlur={handleClientIdBlur} // Trigger fetch on blur
          required
          dir="rtl"
          disabled={!!initialData || isFetchingPreviousQuota} /* Disable client_id when editing or fetching */
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
        {(initialData || previousQuotaValue !== null) && ( /* Show if editing OR if a previous value was found */
          <div>
            <Label className="block text-sm font-medium mb-1 text-right">القيمة السابقة للحصة</Label>
            <Input
              type="number"
              value={initialData ? initialData.quota_value : (previousQuotaValue !== null ? previousQuotaValue : '')}
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