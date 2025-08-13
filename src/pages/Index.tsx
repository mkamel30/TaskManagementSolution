import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, createTask, updateTask, deleteTask } from '@/api/tasks';
import { Task, TaskStatus } from '@/types/task';
import { TaskList } from '@/components/TaskList';
import { TaskForm } from '@/components/TaskForm';
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
import { supabase } from '@/integrations/supabase/client';
import { dismissToast, showError, showLoading, showSuccess } from '@/utils/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportsPage from "@/pages/Reports";
import { useAuth } from '@/components/AuthManager';
import { Logo } from '@/components/Logo';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TaskFormData = Omit<Task, 'id' | 'user_id' | 'updated_at' | 'task_number' | 'creator_email'>;

const Index = () => {
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [taskIdToDelete, setTaskIdToDelete] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterResponsibleEmployee, setFilterResponsibleEmployee] = useState<string | 'all'>('all');
  const [filterRequestingParty, setFilterRequestingParty] = useState<string | 'all'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'reminder_at' | 'task_number'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { session } = useAuth();

  const { data: tasks, isLoading, isError } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: getTasks
  });

  const createMutation = useMutation({
    mutationFn: (newTask: TaskFormData) => createTask(newTask),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showSuccess('تم إنشاء المهمة بنجاح');
      setIsFormDialogOpen(false);
    },
    onError: (error) => {
      // Error toast is handled by the caller in handleFormSubmit
      console.error(`خطأ في إنشاء المهمة: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (variables: { id: string, updates: Partial<TaskFormData> }) => updateTask(variables.id, variables.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showSuccess('تم تحديث المهمة بنجاح');
      setIsFormDialogOpen(false);
      setEditingTask(null);
    },
    onError: (error) => {
      // Error toast is handled by the caller in handleFormSubmit
      console.error(`خطأ في تحديث المهمة: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showSuccess('تم حذف المهمة بنجاح');
    },
    onError: (error) => {
      showError(`خطأ في حذف المهمة: ${error.message}`);
    }
  });
  
  const statusUpdateMutation = useMutation({
    mutationFn: (variables: { id: string, status: Task['status'] }) => updateTask(variables.id, { status: variables.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showSuccess('تم تحديث حالة المهمة');
    },
    onError: (error) => {
      showError(`خطأ في تحديث الحالة: ${error.message}`);
    }
  });

  const handleFormSubmit = async (taskData: TaskFormData) => {
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
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  };

  const uniqueResponsibleEmployees = useMemo(() => {
    const employees = new Set<string>();
    tasks?.forEach(task => {
      if (task.responsible_employee) employees.add(task.responsible_employee);
    });
    return Array.from(employees).sort();
  }, [tasks]);

  const uniqueRequestingParties = useMemo(() => {
    const parties = new Set<string>();
    tasks?.forEach(task => {
      if (task.requesting_party) parties.add(task.requesting_party);
    });
    return Array.from(parties).sort();
  }, [tasks]);

  const filteredAndSortedTasks = useMemo(() => {
    let currentTasks = tasks || [];

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      currentTasks = currentTasks.filter(task =>
        (task.task_number && task.task_number.toLowerCase().includes(query)) ||
        task.required_action.toLowerCase().includes(query) ||
        (task.notes && task.notes.toLowerCase().includes(query)) ||
        (task.requesting_party && task.requesting_party.toLowerCase().includes(query)) ||
        (task.responsible_employee && task.responsible_employee.toLowerCase().includes(query)) ||
        (task.customer_code && task.customer_code.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      currentTasks = currentTasks.filter(task => task.status === filterStatus);
    }

    // Apply responsible employee filter
    if (filterResponsibleEmployee !== 'all') {
      currentTasks = currentTasks.filter(task => task.responsible_employee === filterResponsibleEmployee);
    }

    // Apply requesting party filter
    if (filterRequestingParty !== 'all') {
      currentTasks = currentTasks.filter(task => task.requesting_party === filterRequestingParty);
    }

    // Apply sorting
    currentTasks.sort((a, b) => {
      let valA: any, valB: any;

      if (sortBy === 'created_at' || sortBy === 'reminder_at') {
        valA = a[sortBy] ? new Date(a[sortBy]).getTime() : (sortBy === 'reminder_at' ? Infinity : -Infinity);
        valB = b[sortBy] ? new Date(b[sortBy]).getTime() : (sortBy === 'reminder_at' ? Infinity : -Infinity);
      } else { // task_number
        valA = a[sortBy] || '';
        valB = b[sortBy] || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return currentTasks;
  }, [tasks, searchQuery, filterStatus, filterResponsibleEmployee, filterRequestingParty, sortBy, sortOrder]);


  if (isLoading) return <div className="text-center p-8">جاري تحميل المهام...</div>;
  if (isError) return <div className="text-center p-8 text-red-500">حدث خطأ أثناء جلب المهام</div>;

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          {session?.user?.email && (
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
          )}
          <Button variant="outline" onClick={handleSignOut} className="shrink-0">تسجيل الخروج</Button>
        </div>
        <Logo className="h-12" />
      </header>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="tasks">المهام</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:flex-grow max-w-lg">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث في المهام..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 text-right"
                />
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

          {/* New Filtering and Sorting Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
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
            tasks={filteredAndSortedTasks}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onStatusChange={handleStatusChange}
            searchQuery={searchQuery}
          />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsPage />
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