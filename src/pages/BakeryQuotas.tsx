import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBakeryQuotas, createBakeryQuota, updateBakeryQuota, deleteBakeryQuota } from '@/api/bakery-quotas';
import { BakeryQuota } from '@/api/bakery-quotas';
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
import { PlusCircle, Search, Calendar, SortAsc, SortDesc } from 'lucide-react';
import { dismissToast, showError, showLoading, showSuccess } from '@/utils/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportBakeryQuotas } from '@/components/ImportBakeryQuotas';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BakeryQuotaTable } from '@/components/BakeryQuotaTable';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added import

type BakeryQuotaFormData = Omit<BakeryQuota, 'id' | 'created_at' | 'updated_at'>;

const BakeryQuotasPage = () => {
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<BakeryQuota | null>(null);
  const [addingRecordForQuota, setAddingRecordForQuota] = useState<BakeryQuota | null>(null); // New state
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [quotaIdToDelete, setQuotaIdToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'client_name' | 'quota_date' | 'client_id'>('quota_date'); // Changed default sort to quota_date
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Changed default order to ASC

  const { data: quotas, isLoading, isError } = useQuery<BakeryQuota[]>({
    queryKey: ['bakeryQuotas'],
    queryFn: getBakeryQuotas
  });

  const { data: historyCounts } = useQuery({
    queryKey: ['bakeryQuotaHistoryCounts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_client_history_counts');
      if (error) {
        console.error("Error fetching history counts:", error);
        return new Map<string, number>();
      }
      const countMap = new Map<string, number>();
      (data as { client_id: string; change_count: number }[]).forEach(item => {
        countMap.set(item.client_id, item.change_count);
      });
      return countMap;
    },
    enabled: !!quotas,
  });

  const createMutation = useMutation({
    mutationFn: (newQuota: BakeryQuotaFormData) => createBakeryQuota(newQuota),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotas'] });
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaHistoryCounts'] });
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
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaHistoryCounts'] });
      showSuccess('تم تحديث الحصة التأمينية بنجاح');
      setIsFormDialogOpen(false);
      setEditingQuota(null);
      setAddingRecordForQuota(null); // Clear this state too
    },
    onError: (error) => {
      showError(`خطأ في تحديث الحصة التأمينية: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBakeryQuota,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotas'] });
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaHistoryCounts'] });
      showSuccess('تم حذف الحصة التأمينية بنجاح');
    },
    onError: (error) => {
      showError(`خطأ في حذف الحصة التأمينية: ${error.message}`);
    }
  });

  const handleFormSubmit = async (quotaData: BakeryQuotaFormData, existingQuotaId?: string) => { // Modified signature
    const loadingToast = showLoading('جاري حفظ الحصة التأمينية...');
    try {
      if (editingQuota || existingQuotaId) { // If editing an existing quota or updating an existing client
        const idToUpdate = editingQuota?.id || existingQuotaId;
        if (idToUpdate) {
          await updateMutation.mutateAsync({ id: idToUpdate, updates: quotaData });
        } else {
          throw new Error("No ID provided for update operation.");
        }
      } else { // If creating a brand new quota
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
    setAddingRecordForQuota(null); // Ensure this is null
    setIsFormDialogOpen(true);
  };

  const handleAddNewRecordForClient = (quota: BakeryQuota) => {
    // Create a temporary object for initialData without an ID,
    // but with client_id, client_name, and notes pre-filled.
    setAddingRecordForQuota({
      client_id: quota.client_id,
      client_name: quota.client_name,
      quota_value: 0, // Default to 0 or empty for new record
      quota_date: new Date().toISOString().split('T')[0], // Default to today
      notes: quota.notes,
      id: '', // Important: indicate this is NOT an existing record ID
      created_at: '', // Will be set by DB
      updated_at: '', // Will be set by DB
    });
    setEditingQuota(null); // Ensure this is null
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
      setAddingRecordForQuota(null); // Clear when dialog closes
    }
    setIsFormDialogOpen(open);
  };

  const filteredAndSortedBakeries = useMemo(() => {
    if (!quotas) return [];
    
    let currentBakeries = quotas;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      currentBakeries = currentBakeries.filter(bakery => 
        bakery.client_id.toLowerCase().includes(query) ||
        bakery.client_name.toLowerCase().includes(query) ||
        bakery.notes?.toLowerCase().includes(query)
      );
    }

    currentBakeries.sort((a, b) => {
      let valA: any = a[sortBy] || '';
      let valB: any = b[sortBy] || '';

      if (sortBy === 'quota_date') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return currentBakeries;
  }, [quotas, searchQuery, sortBy, sortOrder]);

  const bakeriesWithHistoryCount = useMemo(() => {
    return filteredAndSortedBakeries.map(bakery => ({
        ...bakery,
        total_changes_count: historyCounts?.get(bakery.client_id) || 0,
    }));
  }, [filteredAndSortedBakeries, historyCounts]);

  const totalBakeries = quotas?.length || 0;

  // Determine which initialData to pass to the form
  const formInitialData = editingQuota || addingRecordForQuota || undefined;
  const dialogTitle = editingQuota 
    ? 'تعديل بيانات المخبز' 
    : (addingRecordForQuota ? `إضافة سجل جديد لـ ${addingRecordForQuota.client_name}` : 'إضافة مخبز جديد');

  if (isLoading) return <div className="text-center p-8">جاري تحميل بيانات المخابز...</div>;
  if (isError) return <div className="text-center p-8 text-red-500">حدث خطأ أثناء جلب بيانات المخابز</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">الحصص التأمينية للمخابز</h1>
        <Dialog open={isFormDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="shrink-0 flex items-center gap-2" onClick={() => { setEditingQuota(null); setAddingRecordForQuota(null); }}>
              <PlusCircle className="h-4 w-4" />
              <span>إضافة مخبز جديد</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle className="text-right">{dialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[75vh] overflow-y-auto p-1">
              <BakeryQuotaForm
                onSubmit={handleFormSubmit}
                onCancel={() => handleDialogChange(false)}
                initialData={formInitialData}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-grow max-w-lg">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالكود أو اسم المخبز..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 text-right"
          />
        </div>
        
        <div className="flex gap-2 items-center">
          <Select value={sortBy} onValueChange={(value: 'client_name' | 'quota_date' | 'client_id') => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="الترتيب حسب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="client_name">اسم العميل</SelectItem>
              <SelectItem value="quota_date">تاريخ الحصة</SelectItem>
              <SelectItem value="client_id">كود العميل</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1"
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-right">نظرة عامة</CardTitle>
        </CardHeader>
        <CardContent>
          <p>إجمالي عدد المخابز: {totalBakeries}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="quotas" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="quotas">بيانات المخابز</TabsTrigger>
          <TabsTrigger value="import">استيراد من Excel</TabsTrigger>
        </TabsList>
        <TabsContent value="quotas" className="space-y-4">
          <BakeryQuotaTable
            bakeries={bakeriesWithHistoryCount}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onAddRecord={handleAddNewRecordForClient} // Pass the new handler
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
              هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف بيانات المخبز وجميع سجلات تغييراته بشكل دائم.
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