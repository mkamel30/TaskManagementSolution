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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

type BakeryQuotaFormData = Omit<BakeryQuota, 'id' | 'created_at' | 'updated_at'>;

interface BakeryQuotaFormProps {
  initialData?: BakeryQuota | BakeryQuotaFormData; // Updated type here
  onSubmit: (quota: BakeryQuotaFormData, existingQuotaId?: string) => Promise<void>;
  onCancel: () => void;
}

export const BakeryQuotaForm: React.FC<BakeryQuotaFormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel 
}) => {
  const isEditing = !!(initialData as BakeryQuota)?.id; // Cast to BakeryQuota for id check
  const isAddingForExistingClient = !!initialData && !isEditing;

  const [formData, setFormData] = useState<BakeryQuotaFormData>({
    client_id: initialData?.client_id || '',
    client_name: initialData?.client_name || '',
    quota_value: isAddingForExistingClient ? 0 : (initialData?.quota_value || 0),
    quota_date: isAddingForExistingClient ? new Date().toISOString().split('T')[0] : (initialData?.quota_date ? new Date(initialData.quota_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
    notes: initialData?.notes || '',
    discount_type: initialData?.discount_type || '', // New: Initialize discount_type
  });
  const [previousQuotaValue, setPreviousQuotaValue] = useState<number | null>(null);
  const [isFetchingPreviousQuota, setIsFetchingPreviousQuota] = useState(false);
  const [existingQuotaForClientId, setExistingQuotaForClientId] = useState<BakeryQuota | null>(null);

  useEffect(() => {
    if (isEditing) {
      setPreviousQuotaValue((initialData as BakeryQuota).quota_value); // Cast for direct access
      setExistingQuotaForClientId(initialData as BakeryQuota);
    } else if (isAddingForExistingClient) {
      const fetchExisting = async () => {
        setIsFetchingPreviousQuota(true);
        try {
          const existingQuota = await getBakeryQuotaByClientId(initialData.client_id);
          if (existingQuota) {
            setPreviousQuotaValue(existingQuota.quota_value);
            setExistingQuotaForClientId(existingQuota);
            if (!formData.client_name) {
              setFormData(prev => ({ ...prev, client_name: existingQuota.client_name }));
            }
          } else {
            setPreviousQuotaValue(null);
            setExistingQuotaForClientId(null);
          }
        } catch (error) {
          console.error("Error fetching previous quota for existing client:", error);
          setPreviousQuotaValue(null);
          setExistingQuotaForClientId(null);
        } finally {
          setIsFetchingPreviousQuota(false);
        }
      };
      fetchExisting();
    } else {
      setPreviousQuotaValue(null);
      setExistingQuotaForClientId(null);
    }
  }, [initialData, isEditing, isAddingForExistingClient]);

  const handleInputChange = (field: keyof BakeryQuotaFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClientIdBlur = async () => {
    if (!isEditing && !isAddingForExistingClient && formData.client_id) {
      setIsFetchingPreviousQuota(true);
      try {
        const existingQuota = await getBakeryQuotaByClientId(formData.client_id);
        if (existingQuota) {
          setPreviousQuotaValue(existingQuota.quota_value);
          setExistingQuotaForClientId(existingQuota);
          if (!formData.client_name) {
            setFormData(prev => ({ ...prev, client_name: existingQuota.client_name }));
          }
          // Also set discount_type if it exists on the fetched quota
          if (!formData.discount_type && existingQuota.discount_type) {
            setFormData(prev => ({ ...prev, discount_type: existingQuota.discount_type }));
          }
        } else {
          setPreviousQuotaValue(null);
          setExistingQuotaForClientId(null);
        }
      } catch (error) {
        console.error("Error fetching previous quota:", error);
        setPreviousQuotaValue(null);
        setExistingQuotaForClientId(null);
      } finally {
        setIsFetchingPreviousQuota(false);
      }
    } else if (!isEditing && !isAddingForExistingClient && !formData.client_id) {
      setPreviousQuotaValue(null);
      setExistingQuotaForClientId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData, existingQuotaForClientId?.id);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(!isEditing && existingQuotaForClientId) && (
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
          onBlur={handleClientIdBlur}
          required
          dir="rtl"
          disabled={isEditing || isAddingForExistingClient || isFetchingPreviousQuota}
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
        {(isEditing || previousQuotaValue !== null) && (
          <div>
            <Label className="block text-sm font-medium mb-1 text-right">القيمة السابقة للحصة</Label>
            <Input
              type="number"
              value={previousQuotaValue !== null ? previousQuotaValue : ''}
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
        <Label className="block text-sm font-medium mb-1 text-right">تاريخ الحصة (dd.mm.yyyy)</Label>
        <Input
          type="date"
          value={formData.quota_date}
          onChange={(e) => handleInputChange('quota_date', e.target.value)}
          required
        />
      </div>

      <div>
        <Label className="block text-sm font-medium mb-1 text-right">نوع الخصم</Label>
        <Input
          value={formData.discount_type}
          onChange={(e) => handleInputChange('discount_type', e.target.value)}
          dir="rtl"
          placeholder="مثال: خصم حكومي، خصم خاص"
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
      
      {isEditing && (
        <>
          <Separator className="my-4" />
          <BakeryQuotaHistory quotaId={(initialData as BakeryQuota).id} />
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