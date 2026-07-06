import React from 'react';
import { useBakeryQuotas } from '@/hooks/useBakeryQuotas';
import { BakeryQuotaForm } from '@/components/bakery-quotas/BakeryQuotaForm';
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
import { dismissToast, showError, showLoading } from '@/utils/toast';
import { BakeryQuotaTable } from '@/components/bakery-quotas/BakeryQuotaTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/Pagination';
import { BakeryQuotaStats } from '@/components/bakery-quotas/BakeryQuotaStats';
import { DatePicker } from '@/components/ui/date-picker';

const BakeryQuotasPageContent = () => {
  const {
    bakeries,
    totalBakeriesCount,
    isLoading,
    isError,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    searchQuery,
    setSearchQuery,
    submittedSearchQuery,
    isFormDialogOpen,
    editingQuota,
    setEditingQuota,
    addingRecordForQuota,
    setAddingRecordForQuota,
    isDeleteAlertOpen,
    setDeleteAlertOpen,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    createMutation,
    updateMutation,
    deleteMutation,
    handleEdit,
    handleAddNewRecordForClient,
    handleDeleteRequest,
    handleConfirmDelete,
    handleDialogChange,
    handleSearchButtonClick,
    formInitialData,
    dialogTitle
  } = useBakeryQuotas();

  const handleFormSubmit = async (quotaData: any, existingQuotaId?: string) => {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchButtonClick();
    }
  };

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

      <BakeryQuotaStats />

      <Card className="p-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-right flex items-center gap-2">
            <Search className="h-5 w-5" />
            <span>بحث وتصفية المخابز</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex flex-col gap-4">
          <div className="relative flex-grow w-full">
            <Input
              placeholder="بحث بالكود أو اسم المخبز أو نوع الخصم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-4 text-right"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-right">تاريخ البدء (الحصة)</label>
              <DatePicker date={startDate} setDate={setStartDate} />
            </div>
            <div className="flex flex-col gap-1 w-full">
              <label className="text-sm font-medium text-right">تاريخ الانتهاء (الحصة)</label>
              <DatePicker date={endDate} setDate={setEndDate} />
            </div>
            <Button onClick={handleSearchButtonClick} className="w-full md:w-auto self-end">
              <Search className="h-4 w-4 ml-2" />
              تطبيق البحث والتصفية
            </Button>
          </div>
        </CardContent>
      </Card>

      {submittedSearchQuery || startDate || endDate ? (
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

          {isError ? (
            <div className="text-center p-8 text-red-500">حدث خطأ أثناء جلب بيانات المخابز</div>
          ) : (
            <>
              <BakeryQuotaTable
                bakeries={bakeries}
                isLoading={isLoading}
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
          <h3 className="text-lg font-semibold">يرجى إدخال مصطلح بحث أو تحديد نطاق تاريخ لعرض بيانات المخابز.</h3>
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