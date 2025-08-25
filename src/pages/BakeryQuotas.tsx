import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBakeryQuotas, createBakeryQuota, updateBakeryQuota, deleteBakeryQuota } from '@/api/bakery-quotas';
import { BakeryQuota } from '@/api/bakery-quotas';
import { BakeryQuotaList } from '@/components/BakeryQuotaList';
import { BakeryQuotaForm } from '@/components/BakeryQuotaForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Search } from 'lucide-react';
import { dismissToast, showError, showLoading, showSuccess } from '@/utils/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICards } from '@/components/KPICards';
import { ImportBakeryQuotas } from '@/components/ImportBakeryQuotas';

type BakeryQuotaFormData = Omit<BakeryQuota, 'id' | 'created_at' | 'updated_at'>;

const BakeryQuotasPage = () => {
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<BakeryQuota | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [quotaIdToDelete, setQuotaIdToDelete] = useState<string | null>(null);

  const { data: quotas, isLoading, isError } = useQuery<BakeryQuota[]>({
    queryKey: ['bakeryQuotas'],
    queryFn: getBakeryQuotas
  });

  const createMutation = useMutation({
    mutationFn: (newQuota: BakeryQuotaFormData) => createBakeryQuota(newQuota),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotas'] });
      showSuccess('تم إنشاء الحصة التأمينية بنجاح');
      setIsFormDialogOpen(false);
    },
    onError: (error) => {
      showError(`خطأ في إنشاء الحصة التأمينية: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (variables: { id: string, updates: Partial<BakeryQuotaFormData> }) => updateBakeryQuota(variables.id, variables.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotas'] });
      showSuccess('تم تحديث الحصة التأمينية بنجاح');
      setIsFormDialogOpen(false);
      setEditingQuota(null);
    },
    onError: (error) => {
      showError(`خطأ في تحديث الحصة التأمينية: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBakeryQuota,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotas'] });
      showSuccess('تم حذف الحصة التأمينية بنجاح');
    },
    onError: (error) => {
      showError(`خطأ في حذف الحصة التأمينية: ${error.message}`);
    }
  });

  const handleFormSubmit = async (quotaData: BakeryQuotaFormData) => {
    const loadingToast = showLoading('جاري حفظ الحصة التأمينية...');
    try {
      if (editingQuota) {
        await updateMutation.mutateAsync({ id: editingQuota.id, updates: quotaData });
      } else {
        await createMutation.mutateAsync(quotaData);
      }
    } catch (error: any) {
      showError(error.message || 'An unexpected error occurred');
    } finally {
      dismissToast(loadingToast);
    }
  };

  const handleEdit = (quota: BakeryQuota) => {
    setEditingQuota(quota);
    setIsFormDialogOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    setQuotaIdToDelete(id);
    setDeleteAlertOpen(true);
  };

  const handleConfirmDelete = () => {
    if (quotaIdToDelete) {
      deleteMutation.mutate(quotaIdToDelete);
    }
    setDeleteAlertOpen(false);
    setQuotaIdToDelete(null);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setEditingQuota(null);
    }
    setIsFormDialogOpen(open);
  };

  const filteredQuotas = useMemo(() => {
    if (!quotas) return [];
    
    if (!searchQuery) return quotas;

    const query = searchQuery.toLowerCase();
    return quotas.filter(quota =>
      quota.client_id.toLowerCase().includes(query) ||
      quota.client_name.toLowerCase().includes(query) ||
      quota.notes?.toLowerCase().includes(query)
    );
  }, [quotas, searchQuery]);

  // Calculate KPIs
  const totalQuotas = quotas?.length || 0;
  const overdueQuotas = quotas?.filter(quota => new Date(quota.quota_date) < new Date()).length || 0;
  const activeQuotas = totalQuotas - overdueQuotas;
  const totalValue = quotas?.reduce((sum, quota) => sum + quota.quota_value, 0) || 0;

  if (isLoading) return <div className="text-center p-8">جاري تحميل الحصص التأمينية...</div>;
  if (isError) return <div className="text-center p-8 text-red-500">حدث خطأ أثناء جلب الحصص التأمينية</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">الحصص التأمينية للمخابز</h1>
        <Dialog open={isFormDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="shrink-0 flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>إضافة حصة جديدة</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle className="text-right">{editingQuota ? 'تعديل الحصة التأمينية' : 'إضافة حصة تأمينية جديدة'}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[75vh] overflow-y-auto p-1">
              <BakeryQuotaForm
                onSubmit={handleFormSubmit}
                onCancel={() => handleDialogChange(false)}
                initialData={editingQuota ?? undefined}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative w-full max-w-lg">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث في الحصص التأمينية..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10 text-right"
        />
      </div>

      <KPICards
        quotas={[
          { id: '', client_id: '', client_name: '', quota_value: totalQuotas, quota_date: '', notes: '', created_at: '', updated_at: '' },
          { id: '', client_id: '', client_name: '', quota_value: overdueQuotas, quota_date: '', notes: '', created_at: '', updated_at: '' },
          { id: '', client_id: '', client_name: '', quota_value: activeQuotas, quota_date: '', notes: '', created_at: '', updated_at: '' },
          { id: '', client_id: '', client_name: '', quota_value: totalValue, quota_date: '', notes: '', created_at: '', updated_at: '' },
        ]}
      />

      <Tabs defaultValue="quotas" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="quotas">الحصص التأمينية</TabsTrigger>
          <TabsTrigger value="import">استيراد من Excel</TabsTrigger>
        </TabsList>
        <TabsContent value="quotas" className="space-y-4">
          <BakeryQuotaList
            quotas={filteredQuotas}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            searchQuery={searchQuery}
          />
        </TabsContent>
        <TabsContent value="import" className="space-y-4">
          <ImportBakeryQuotas />
        </TabsContent>
      </Tabs>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف الحصة التأمينية بشكل دائم.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>متابعة</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BakeryQuotasPage;