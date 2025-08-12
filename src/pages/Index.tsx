import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, createTask, updateTask, deleteTask } from '@/api/tasks';
import { Task } from '@/types/task';
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
import { showError, showSuccess } from '@/utils/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReportsPage from "@/pages/Reports";
import { useAuth } from '@/components/AuthManager';
import { Logo } from '@/components/Logo';

type TaskFormData = Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'task_number'>;

const Index = () => {
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [taskIdToDelete, setTaskIdToDelete] = useState<string | null>(null);

  const { session } = useAuth();

  const { data: tasks, isLoading, isError } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: getTasks
  });

  const createMutation = useMutation({
    mutationFn: (newTask: TaskFormData) => createTask(newTask as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showSuccess('تم إنشاء المهمة بنجاح');
      setIsFormDialogOpen(false);
    },
    onError: (error) => {
      showError(`خطأ في إنشاء المهمة: ${error.message}`);
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
      showError(`خطأ في تحديث المهمة: ${error.message}`);
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

  const handleFormSubmit = (taskData: TaskFormData) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, updates: taskData });
    } else {
      createMutation.mutate(taskData);
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

  const filteredTasks = tasks?.filter(task => {
    const query = searchQuery.toLowerCase();
    return (
      (task.task_number && task.task_number.toLowerCase().includes(query)) ||
      task.required_action.toLowerCase().includes(query) ||
      (task.notes && task.notes.toLowerCase().includes(query)) ||
      (task.requesting_party && task.requesting_party.toLowerCase().includes(query)) ||
      (task.responsible_employee && task.responsible_employee.toLowerCase().includes(query)) ||
      (task.customer_code && task.customer_code.toLowerCase().includes(query))
    );
  }) || [];

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
          <TaskList
            tasks={filteredTasks}
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