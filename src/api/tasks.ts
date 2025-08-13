import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/types/task";

export type TaskHistoryEntry = {
  id: string;
  task_id: string;
  user_id: string;
  change_description: string;
  changed_at: string;
  user_email: string;
};

export type Comment = {
  id: string;
  task_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  user_email?: string; // Added for fetching comments with user email
};

export const getTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase.rpc('get_tasks_with_creator_email');

  if (error) {
    console.error('Error fetching tasks with creator:', error);
    throw error;
  }

  return data as Task[];
};

export const getTasksByDateRange = async (startDate: string, endDate: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tasks by date range:', error);
    throw error;
  }

  return data as Task[];
};


export const createTask = async (task: Omit<Task, 'id' | 'user_id' | 'updated_at' | 'task_number' | 'creator_email'>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }

  return data as Task;
};

export const updateTask = async (id: string, updates: Partial<Task>) => {
  const { data: existingTaskData, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existingTaskData) {
    console.error('Error fetching task before update:', fetchError);
    throw fetchError || new Error('Task not found');
  }

  // Do not allow updating the creation date
  const { created_at, ...validUpdates } = updates;

  const { data, error } = await supabase
    .from('tasks')
    .update({ ...validUpdates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }

  // Log history after successful update
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    let description = 'تم تحديث تفاصيل المهمة.';
    if (updates.status && updates.status !== existingTaskData.status) {
      description = `تم تغيير الحالة من "${existingTaskData.status}" إلى "${updates.status}".`;
    }
    
    const { error: historyError } = await supabase.from('task_history').insert({
      task_id: id,
      user_id: user.id,
      change_description: description,
    });

    if (historyError) {
      // Log the error but don't fail the whole operation
      console.error('Error creating task history:', historyError);
    }
  }

  return data as Task;
};

export const deleteTask = async (id: string) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const getTaskHistory = async (taskId: string): Promise<TaskHistoryEntry[]> => {
  const { data, error } = await supabase.rpc('get_task_history_with_user', {
    p_task_id: taskId,
  });

  if (error) {
    console.error('Error fetching task history:', error);
    throw error;
  }

  return data || [];
};

export const getComments = async (taskId: string): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:user_id ( email )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }

  // Map the data to include user email directly
  return data.map(comment => ({
    ...comment,
    user_email: comment.user?.email || 'Unknown User'
  })) as Comment[];
};

export const addComment = async (taskId: string, commentText: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, user_id: user.id, comment_text: commentText })
    .select()
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    throw error;
  }

  return data as Comment;
};