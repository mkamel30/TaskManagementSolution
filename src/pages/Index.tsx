import React, { useState, useEffect } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { Task, TaskStatus } from '@/types/task';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskForm } from '@/components/tasks/TaskForm';
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
import { dismissToast, showError, showLoading } from '@/utils/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportsPage from "@/pages/Reports";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BakeryQuotasPageContent from './BakeryQuotas';
import { ImportBakeryQuotas } from '@/components/bakery-quotas/ImportBakeryQuotas';
import { ExportBakeryQuotas } from '@/components/bakery-quotas/ExportBakeryQuotas';
import { useSearchParams } from 'react-router-dom';
import { Pagination } from '@/components/Pagination';

const Index = () => {
  const {
    tasks,
    totalTasksCount,
    isLoading,
    isError,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    searchQuery,
    setSearchQuery,
    submittedSearchQuery,
    setSubmittedSearchQuery,
    isFormDialogOpen,
    setIsFormDialogOpen,
    editingTask,
    setEditingTask,
    isDeleteAlertOpen,
    setDeleteAlertOpen,
    taskIdToDelete,
    setTaskIdToDelete,
    filterStatus,
    setFilterStatus,
    filterResponsibleEmployee,
    setFilterResponsibleEmployee,
    filterRequestingParty,
    setFilterRequestingParty,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    createMutation,
    updateMutation,
    deleteMutation,
    statusUpdateMutation,
    uniqueResponsibleEmployees,
    uniqueRequestingParties,
  } = useTasks();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'tasks';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (activeTab === 'tasks') {
      newSearchParams.delete('tab');
    } else {
      newSearchParams.set('tab', activeTab);
    }
    setSearchParams(newSearchParams, { replace: true });
  }, [activeTab, searchParams, setSearchParams]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'tasks';
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  const handleFormSubmit = async (taskData: any) => {
    const loadingToast = showLoading('جاري حفظ المهمة...');
    try {
      if (editingTask) {
        await updateMutation.mutateAsync({ id: editingTask.id, updates: taskData });
      } else {
        await createMutation.mutateAsync(taskData);
      }
    } catch (error: any) {
      showError(error.message || 'An unexpected error occurred');
    } finally {
      dismissToast(loadingToast);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsFormDialogOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    setTaskIdToDelete(id);
    setDeleteAlertOpen(true);
  };

  const handleConfirmDelete = () => {
    if (taskIdToDelete) {
      deleteMutation.mutate(taskIdToDelete);
    }
    setDeleteAlertOpen(false);
    setTaskIdToDelete(null);
  };
  
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setEditingTask(null);
    }
    setIsFormDialogOpen(open);
  };

  const handleStatusChange = (id: string, status: Task['status']) => {
    statusUpdateMutation.mutate({ id, status });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="tasks">المهام</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
          <TabsTrigger value="bakery-quotas">حصص المخابز</TabsTrigger>
          <TabsTrigger value="bakery-tools">أدوات المخابز</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="space-y-4">
          {isError ? (
            <div className="text-center p-8 text-red-500 font-medium bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              حدث خطأ أثناء جلب المهام. يرجى محاولة إعادة التحميل.
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex gap-2 w-full md:flex-grow max-w-lg">
                <Input
                  placeholder="بحث في المهام..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSubmittedSearchQuery(searchQuery);
                      setCurrentPage(1);
                    }
                  }}
                  className="text-right pl-10"
                />
                <Button 
                  onClick={() => { setSubmittedSearchQuery(searchQuery); setCurrentPage(1); }}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  <span>بحث</span>
                </Button>
              </div>
              <Dialog open={isFormDialogOpen} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                  <Button className="shrink-0 flex items-center gap-2">
                    <PlusCircle className="h-4 w-4" />
                    <span>إضافة مهمة</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px]">
                  <DialogHeader>
                    <DialogTitle className="text-right">{editingTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[75vh] overflow-y-auto p-1">
                    <TaskForm
                      onSubmit={handleFormSubmit}
                      onCancel={() => handleDialogChange(false)}
                      initialData={editingTask ?? undefined}
                    />
                  </div>
                </DialogContent>
              </Dialog>
          </div>

          {/* Filtering and Sorting Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" dir="rtl">
            <div>
              <label className="block text-sm font-medium mb-1 text-right">الحالة</label>
              <Select value={filterStatus} onValueChange={(value: TaskStatus | 'all') => setFilterStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="تصفية حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="لم يتم">لم يتم</SelectItem>
                  <SelectItem value="ستتم المتابعة مرة اخرى">ستتم المتابعة مرة اخرى</SelectItem>
                  <SelectItem value="تم التنفيذ">تم التنفيذ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-right">الموظف المسؤول</label>
              <Select value={filterResponsibleEmployee} onValueChange={(value: string | 'all') => setFilterResponsibleEmployee(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="تصفية حسب الموظف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {uniqueResponsibleEmployees.map(employee => (
                    <SelectItem key={employee} value={employee}>{employee}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-right">الجهة الطالبة</label>
              <Select value={filterRequestingParty} onValueChange={(value: string | 'all') => setFilterRequestingParty(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="تصفية حسب الجهة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {uniqueRequestingParties.map(party => (
                    <SelectItem key={party} value={party}>{party}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-right">الترتيب حسب</label>
              <Select value={sortBy} onValueChange={(value: 'created_at' | 'reminder_at' | 'task_number') => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="الترتيب حسب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">تاريخ الإنشاء</SelectItem>
                  <SelectItem value="reminder_at">تاريخ التذكير</SelectItem>
                  <SelectItem value="task_number">رقم المهمة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-right">ترتيب</label>
              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="ترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">تنازلي</SelectItem>
                  <SelectItem value="asc">تصاعدي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TaskList
            tasks={tasks}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onStatusChange={handleStatusChange}
            searchQuery={submittedSearchQuery}
          />
          {totalTasksCount > itemsPerPage && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalTasksCount / itemsPerPage)}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
            </>
          )}
        </TabsContent>
        <TabsContent value="reports">
          <ReportsPage />
        </TabsContent>
        <TabsContent value="bakery-quotas">
          <BakeryQuotasPageContent />
        </TabsContent>
        <TabsContent value="bakery-tools" className="space-y-6">
          <ImportBakeryQuotas />
          <ExportBakeryQuotas />
        </TabsContent>
      </Tabs>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف المهمة بشكل دائم.
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

export default Index;