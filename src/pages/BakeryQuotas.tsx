import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPaginatedBakeryQuotas, createBakeryQuota, updateBakeryQuota, deleteBakeryQuota } from '@/api/bakery-quotas';
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
import { PlusCircle, Search, SortAsc, SortDesc } from 'lucide-react';
import { dismissToast, showError, showLoading, showSuccess } from '@/utils/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BakeryQuotaTable } from '@/components/BakeryQuotaTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/Pagination';
import { BakeryQuotaStats } from '@/components/BakeryQuotaStats'; // Import the new component

type BakeryQuotaFormData = Omit<BakeryQuota, 'id' | 'created_at' | 'updated_at'>;

const BakeryQuotasPageContent = () => {
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<BakeryQuota | null>(null);
  const [addingRecordForQuota, setAddingRecordForQuota] = useState<BakeryQuotaFormData | null>(null); // Fixed type here
  const [searchQuery, setSearchQuery] = useState(''); // For input field
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState(''); // For actual query to API
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [quotaIdToDelete, setQuotaIdToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'client_name' | 'quota_date' | 'client_id'>('quota_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: paginatedResponse, isLoading, isError } = useQuery({
    queryKey: ['bakeryQuotas', currentPage, itemsPerPage, submittedSearchQuery, sortBy, sortOrder],
    queryFn: () => getPaginatedBakeryQuotas(currentPage, itemsPerPage, submittedSearchQuery, sortBy, sortOrder),
  });

  const bakeries = paginatedResponse?.data || [];
  const totalBakeriesCount = paginatedResponse?.count || 0;

  const createMutation = useMutation({
    mutationFn: (newQuota: BakeryQuotaFormData) => createBakeryQuota(newQuota),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotas'] });
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStatsToday'] }); // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStatsWeek'] }); // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStatsMonth'] }); // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStatsPerClientToday'] }); // Invalidate stats
      showSuccess('تم إنشاء الحصة التأمينية بنجاح');
      setIsFormDialogOpen(false);
      // If a new item is created, and there's an active search, re-run the search
      if (submittedSearchQuery) {
        setSubmittedSearchQuery(searchQuery); // Re-trigger search with current input
      }
    },
    onError: (error) => {
      showError(`خطأ في إنشاء الحصة التأمينية: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (variables: { id: string, updates: Partial<BakeryQuotaFormData> }) => updateBakeryQuota(variables.id, variables.updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotas'] });
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaHistory', variables.id] }); // Invalidate history for the specific quota
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStatsToday'] }); // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStatsWeek'] }); // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStatsMonth'] }); // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStatsPerClientToday'] }); // Invalidate stats
      showSuccess('تم تحديث الحصة التأمينية بنجاح');
      setIsFormDialogOpen(false);
      setEditingQuota(null);
      setAddingRecordForQuota(null);
      // If an item is updated, and there's an active search, re-run the search
      if (submittedSearchQuery) {
        setSubmittedSearchQuery(searchQuery); // Re-trigger search with current input
      }
    },
    onError: (error) => {
      showError(`خطأ في تحديث الحصة التأمينية: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBakeryQuota,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotas'] });
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStatsToday'] }); // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStatsWeek'] }); // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStatsMonth'] }); // Invalidate stats
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStatsPerClientToday'] }); // Invalidate stats
      showSuccess('تم حذف الحصة التأمينية بنجاح');
      // If an item is deleted, and there's an active search, re-run the search
      if (submittedSearchQuery) {
        setSubmittedSearchQuery(searchQuery); // Re-trigger search with current input
      }
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
      discount_type: quota.discount_type,
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

  const handleSearchButtonClick = () => {
    setSubmittedSearchQuery(searchQuery);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchButtonClick();
    }
  };

  // Reset page to 1 when sort or items per page changes (but not search, as that's handled by handleSearchButtonClick)
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, sortOrder, itemsPerPage]);

  const formInitialData = editingQuota || addingRecordForQuota || undefined;
  const dialogTitle = editingQuota 
    ? 'تعديل بيانات المخبز' 
    : (addingRecordForQuota ? `إضافة سجل جديد لـ ${addingRecordForQuota.client_name}` : 'إضافة مخبز جديد');

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

      <BakeryQuotaStats /> {/* New: Display the statistics cards */}

      <Card className="p-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-right flex items-center gap-2">
            <Search className="h-5 w-5" />
            <span>بحث عن مخبز</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full">
            <Input
              placeholder="بحث بالكود أو اسم المخبز أو نوع الخصم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-4 text-right"
            />
          </div>
          <Button onClick={handleSearchButtonClick} className="w-full md:w-auto shrink-0">
            <Search className="h-4 w-4 ml-2" />
            بحث
          </Button>
        </CardContent>
      </Card>

      {submittedSearchQuery ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-right">نظرة عامة</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>جاري تحميل العدد الإجمالي...</p>
              ) : isError ? (
                <p className="text-red-500">خطأ في تحميل العدد الإجمالي.</p>
              ) : (
                <p>إجمالي عدد المخابز المطابقة: {totalBakeriesCount}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2 items-center justify-end">
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

          {isLoading ? (
            <div className="text-center p-8">جاري تحميل بيانات المخابز...</div>
          ) : isError ? (
            <div className="text-center p-8 text-red-500">حدث خطأ أثناء جلب بيانات المخابز</div>
          ) : (
            <>
              <BakeryQuotaTable
                bakeries={bakeries}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
                onAddRecord={handleAddNewRecordForClient}
                searchQuery={submittedSearchQuery}
              />
              {totalBakeriesCount > itemsPerPage && (
                <Pagination
                  totalItems={totalBakeriesCount}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </>
      ) : (
        <Card className="text-center py-16 text-gray-500 dark:text-gray-400">
          <h3 className="text-lg font-semibold">يرجى إدخال مصطلح بحث لعرض بيانات المخابز.</h3>
          <p className="text-sm">يمكنك البحث بكود العميل، اسم العميل، الملاحظات، أو نوع الخصم.</p>
        </Card>
      )}

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

export default BakeryQuotasPageContent;