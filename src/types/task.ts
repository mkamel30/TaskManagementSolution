export type TaskStatus = 'لم يتم' | 'ستتم المتابعة مرة اخرى' | 'تم التنفيذ';

export type Task = {
  id: string;
  user_id: string;
  task_number: string;
  required_action: string;
  notes?: string;
  status: TaskStatus;
  reminder_at?: string;
  requesting_party?: string;
  responsible_employee?: string;
  customer_code?: string;
  created_at: string;
  updated_at: string;
  creator_email?: string; // The email of the user who created the task
  file_paths?: string[]; // Paths to any associated files
};