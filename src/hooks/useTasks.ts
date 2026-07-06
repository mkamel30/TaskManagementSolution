import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPaginatedTasks, createTask, updateTask, deleteTask } from '@/api/tasks';
import { Task, TaskStatus } from '@/types/task';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { toast } from 'sonner';

type TaskFormData = Omit<Task, 'id' | 'user_id' | 'updated_at' | 'task_number' | 'creator_email'>;

export const useTasks = () => {
  const queryClient = useQueryClient();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [taskIdToDelete, setTaskIdToDelete] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterResponsibleEmployee, setFilterResponsibleEmployee] = useState<string | 'all'>('all');
  const [filterRequestingParty, setFilterRequestingParty] = useState<string | 'all'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'reminder_at' | 'task_number'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [notifiedOverdueTasks, setNotifiedOverdueTasks] = useState<Set<string>>(new Set());

  // Paginated tasks query
  const { data: paginatedResponse, isLoading, isError } = useQuery({
    queryKey: ['tasks', currentPage, itemsPerPage, submittedSearchQuery, filterStatus, filterResponsibleEmployee, filterRequestingParty, sortBy, sortOrder],
    queryFn: () => getPaginatedTasks(currentPage, itemsPerPage, submittedSearchQuery, filterStatus, filterResponsibleEmployee, filterRequestingParty, sortBy, sortOrder)
  });

  const tasks = paginatedResponse?.data || [];
  const totalTasksCount = paginatedResponse?.count || 0;

  // Query filter helper data (responsible employee & requesting party lists)
  const { data: filterFieldsData } = useQuery({
    queryKey: ['tasksFilterFields'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('responsible_employee, requesting_party');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10 // 10 minutes cache
  });

  const uniqueResponsibleEmployees = useMemo(() => {
    const employees = new Set<string>();
    filterFieldsData?.forEach(item => {
      if (item.responsible_employee) employees.add(item.responsible_employee);
    });
    return Array.from(employees).sort();
  }, [filterFieldsData]);

  const uniqueRequestingParties = useMemo(() => {
    const parties = new Set<string>();
    filterFieldsData?.forEach(item => {
      if (item.requesting_party) parties.add(item.requesting_party);
    });
    return Array.from(parties).sort();
  }, [filterFieldsData]);

  // Query for overdue tasks specifically to trigger background alerts
  const { data: overdueTasks } = useQuery({
    queryKey: ['overdueTasksNotification'],
    queryFn: async () => {
      const nowStr = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('tasks')
        .select('id, task_number, required_action, reminder_at, status')
        .neq('status', 'تم التنفيذ')
        .lt('reminder_at', nowStr);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5 // 5 minutes cache
  });

  const createMutation = useMutation({
    mutationFn: (newTask: TaskFormData) => createTask(newTask),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasksFilterFields'] });
      queryClient.invalidateQueries({ queryKey: ['overdueTasksNotification'] });
      showSuccess('تم إنشاء المهمة بنجاح');
      setIsFormDialogOpen(false);
    },
    onError: (error) => {
      console.error(`خطأ في إنشاء المهمة: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (variables: { id: string, updates: Partial<TaskFormData> }) => updateTask(variables.id, variables.updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasksFilterFields'] });
      queryClient.invalidateQueries({ queryKey: ['overdueTasksNotification'] });
      if (variables.updates.status === 'تم التنفيذ') {
        toast.dismiss(`overdue-${variables.id}`);
      }
      showSuccess('تم تحديث المهمة بنجاح');
      setIsFormDialogOpen(false);
      setEditingTask(null);
    },
    onError: (error) => {
      console.error(`خطأ في تحديث المهمة: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasksFilterFields'] });
      queryClient.invalidateQueries({ queryKey: ['overdueTasksNotification'] });
      showSuccess('تم حذف المهمة بنجاح');
    },
    onError: (error) => {
      showError(`خطأ في حذف المهمة: ${error.message}`);
    }
  });
  
  const statusUpdateMutation = useMutation({
    mutationFn: (variables: { id: string, status: Task['status'] }) => updateTask(variables.id, { status: variables.status }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['overdueTasksNotification'] });
      if (variables.status === 'تم التنفيذ') {
        toast.dismiss(`overdue-${variables.id}`);
      }
      showSuccess('تم تحديث حالة المهمة');
    },
    onError: (error) => {
      showError(`خطأ في تحديث الحالة: ${error.message}`);
    }
  });

  // Reset page to 1 when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [submittedSearchQuery, filterStatus, filterResponsibleEmployee, filterRequestingParty, sortBy, sortOrder]);

  // Effect for overdue task notifications
  useEffect(() => {
    if (overdueTasks && overdueTasks.length > 0) {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Compare dates only

      overdueTasks.forEach(task => {
        if (task.status !== 'تم التنفيذ' && task.reminder_at) {
          const reminderDate = new Date(task.reminder_at);
          reminderDate.setHours(0, 0, 0, 0); // Compare dates only

          if (reminderDate < now && !notifiedOverdueTasks.has(task.id)) {
            toast.warning(`المهمة رقم ${task.task_number} متأخرة! الإجراء المطلوب: ${task.required_action}`, {
              duration: 10000, // Keep toast visible for 10 seconds
              action: {
                label: 'عرض',
                onClick: () => {
                  supabase.from('tasks').select('*').eq('id', task.id).single().then(({ data }) => {
                    if (data) {
                      setEditingTask(data as Task);
                      setIsFormDialogOpen(true);
                    }
                  });
                },
              },
              id: `overdue-${task.id}` // Unique ID for the toast
            });
            setNotifiedOverdueTasks(prev => new Set(prev).add(task.id));
          }
        }
      });
    }
  }, [overdueTasks, notifiedOverdueTasks]);

  // Effect for new comment notifications via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel('public:comments') // Listen to changes in the 'comments' table
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        async (payload) => {
          const newComment = payload.new as { task_id: string; comment_text: string; user_id: string; };
          
          // Fetch full task details
          const { data: taskData } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', newComment.task_id)
            .single();

          const taskNumber = taskData?.task_number || 'مهمة غير معروفة';
          
          let commenterEmail = 'مستخدم آخر';
          try {
            const { data: emailData, error: edgeFunctionError } = await supabase.functions.invoke('get-user-email', {
              body: { user_id: newComment.user_id },
            });

            if (edgeFunctionError) {
              console.error('Error invoking get-user-email edge function:', edgeFunctionError);
            } else if (emailData && emailData.email) {
              commenterEmail = emailData.email;
            }
          } catch (e) {
            console.error('Exception calling get-user-email edge function:', e);
          }

          toast.info(`تعليق جديد على المهمة رقم ${taskNumber} من ${commenterEmail}: "${newComment.comment_text.substring(0, 50)}..."`, {
            duration: 5000,
            action: {
              label: 'عرض المهمة',
              onClick: () => {
                if (taskData) {
                  setEditingTask(taskData as Task);
                  setIsFormDialogOpen(true);
                } else {
                  showError('المهمة غير موجودة أو لم يتم تحميلها.');
                }
              },
            },
          });
          queryClient.invalidateQueries({ queryKey: ['taskComments', newComment.task_id] }); // Invalidate comments for that task
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return {
    tasks,
    totalTasksCount,
    isLoading,
    isError,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
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
    notifiedOverdueTasks,
    setNotifiedOverdueTasks,
    overdueTasks,
    createMutation,
    updateMutation,
    deleteMutation,
    statusUpdateMutation,
    uniqueResponsibleEmployees,
    uniqueRequestingParties
  };
};
