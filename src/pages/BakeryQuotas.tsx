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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Pagination } from '@/components/Pagination';
import { ExportBakeryQuotas } from '@/components/ExportBakeryQuotas';

type BakeryQuotaFormData = Omit<BakeryQuota, 'id' | 'created_at' | 'updated_at'>;

const BakeryQuotasPage = () => {
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<BakeryQuota | null>(null);
  const [addingRecordForQuota, setAddingRecordForQuota] = useState<BakeryQuota | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [quotaIdToDelete, setQuotaIdToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'client_name' | 'quota_date' | 'client_id'>('quota_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: paginatedData, isLoading, isError } = useQuery({
    queryKey: ['bakeryQuotas', currentPage, itemsPerPage, searchQuery, sortBy, sortOrder],
    queryFn: () => getBakeryQuotas(currentPage, itemsPerPage, searchQuery, sortBy, sortOrder),
    keepPreviousData: true, // Keep previous data while fetching new page
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
    enabled: !!paginatedData,
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
      setAddingRecordForQuota(null);
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

  const handleFormSubmit = async (quotaData: BakeryQuotaFormData, existingQuotaId?: string) => {
    const loadingToast = showLoading('جاري حفظ الحصة التأمينية...');
    try {
      if (editingQuota || existingQuotaId) {
        const idToUpdate = editingQuota?.id || existingQuotaId;
        if (idToUpdate) {
          await updateMutation.mutateAsync({ id: idToUpdate, updates: quotaData });
        } else {
          throw new Error("No ID provided for update operation.");
        }
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
    setAddingRecordForQuota(null);
    setIsFormDialogOpen(true);
  };

  const handleAddNewRecordForClient = (quota: BakeryQuota) => {
    setAddingRecordForQuota({
      client_id: quota.client_id,
      client_name: quota.client_name,
      quota_value: 0,
      quota_date: new Date().toISOString().split('T')[0],
      notes: quota.notes,
      id: '',
      created_at: '',
      updated_at: '',
    });
    setEditingQuota(null);
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
      setAddingRecordForQuota(null);
    }
    setIsFormDialogOpen(open);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const formInitialData = editingQuota || addingRecordForQuota || undefined;
  const dialogTitle = editingQuota 
    ? 'تعديل بيانات المخبز' 
    : (addingRecordForQuota ? `إضافة سجل جديد لـ ${addingRecordForQuota.client_name}` : 'إضافة مخبز جديد');

  if (isLoading) return <div className="text-center p-8">جاري تحميل بيانات المخابز...</div>;
  if (isError) return <div className="text-center p-8 text-red-500">حدث خطأ أثناء جلب بيانات المخابز</div>;

  const { data: bakeries, total } = paginatedData || { data: [], total: 0 };

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
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page on new search
            }}
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
          <p>إجمالي عدد المخابز: {total}</p>
          <p className="text-sm text-muted-foreground">عرض {bakeries.length} من أصل {total} سجل</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="quotas" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="quotas">بيانات المخابز</TabsTrigger>
          <TabsTrigger value="import">استيراد من Excel</TabsTrigger>
          <TabsTrigger value="export">تصدير إلى Excel</TabsTrigger>
        </TabsList>
        <TabsContent value="quotas" className="space-y-4">
          <BakeryQuotaTable
            bakeries={bakeries}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onAddRecord={handleAddNewRecordForClient}
            searchQuery={searchQuery}
          />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm">عدد السجلات لكل صفحة:</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Pagination
              totalItems={total}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={handlePageChange}
            />
          </div>
        </TabsContent>
        <TabsContent value="import" className="space-y-4">
          <ImportBakeryQuotas />
        </TabsContent>
        <TabsContent value="export" className="space-y-4">
          <ExportBakeryQuotas />
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