import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Task, TaskStatus } from '@/types/task';
import { TaskHistory } from './TaskHistory';
import { Separator } from '@/components/ui/separator';
import { DatePicker } from '@/components/ui/date-picker';
import { TaskComments } from './TaskComments';
import { useBranch } from '@/contexts/BranchContext';
import { RESPONSIBLE_EMPLOYEES } from '@/constants/employees';

type TaskFormData = Omit<Task, 'id' | 'user_id' | 'updated_at' | 'task_number' | 'creator_email'>;

interface TaskFormProps {
  initialData?: Task;
  onSubmit: (task: TaskFormData) => Promise<void>;
  onCancel: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel 
}) => {
  const { selectedBranch } = useBranch();
  const [isCustomEmployee, setIsCustomEmployee] = useState<boolean>(() => {
    return !!initialData?.responsible_employee && !RESPONSIBLE_EMPLOYEES.includes(initialData.responsible_employee as any);
  });
  const [formData, setFormData] = useState<TaskFormData>({
    required_action: initialData?.required_action || '',
    notes: initialData?.notes || '',
    status: initialData?.status || 'لم يتم',
    reminder_at: initialData?.reminder_at ? initialData.reminder_at.split('T')[0] : '',
    requesting_party: initialData?.requesting_party || '',
    responsible_employee: initialData?.responsible_employee || '',
    customer_code: initialData?.customer_code || '',
    created_at: initialData?.created_at || new Date().toISOString(),
    branch_name: initialData?.branch_name || (selectedBranch !== 'الكل' ? selectedBranch : 'الجيش'),
  });

  const handleStatusChange = (value: TaskStatus) => {
    const newFormData = { ...formData, status: value };
    if (value !== 'ستتم المتابعة مرة اخرى') {
      newFormData.reminder_at = '';
    }
    setFormData(newFormData);
  };

  const handleCreatedAtChange = (date: Date | undefined) => {
    if (date) {
      // To prevent timezone issues, create a new Date object in UTC
      // using the year, month, and day from the selected local date.
      const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      setFormData({ ...formData, created_at: utcDate.toISOString() });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onSubmit({
      ...formData,
      reminder_at: formData.reminder_at || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 text-right">الإجراء المطلوب</label>
        <Input
          value={formData.required_action}
          onChange={(e) => setFormData({...formData, required_action: e.target.value})}
          required
          dir="rtl"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-right">كود العميل</label>
          <Input
            value={formData.customer_code}
            onChange={(e) => setFormData({...formData, customer_code: e.target.value})}
            dir="rtl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-right">الفرع</label>
          <Select
            value={formData.branch_name || 'الجيش'}
            onValueChange={(val) => setFormData({...formData, branch_name: val})}
            dir="rtl"
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الفرع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="الجيش">فرع الجيش</SelectItem>
              <SelectItem value="المعادي">فرع المعادي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-right">الجهة الطالبة</label>
          <Input
            value={formData.requesting_party}
            onChange={(e) => setFormData({...formData, requesting_party: e.target.value})}
            dir="rtl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-right">الموظف المسؤول</label>
          <Select
            value={isCustomEmployee ? 'custom' : (formData.responsible_employee || '')}
            onValueChange={(val) => {
              if (val === 'custom') {
                setIsCustomEmployee(true);
                setFormData({...formData, responsible_employee: ''});
              } else {
                setIsCustomEmployee(false);
                setFormData({...formData, responsible_employee: val});
              }
            }}
            dir="rtl"
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الموظف المسؤول" />
            </SelectTrigger>
            <SelectContent>
              {RESPONSIBLE_EMPLOYEES.map((emp) => (
                <SelectItem key={emp} value={emp}>{emp}</SelectItem>
              ))}
              <SelectItem value="custom">إدخال اسم آخر...</SelectItem>
            </SelectContent>
          </Select>
          {isCustomEmployee && (
            <Input
              className="mt-2"
              placeholder="أدخل اسم الموظف"
              value={formData.responsible_employee}
              onChange={(e) => setFormData({...formData, responsible_employee: e.target.value})}
              dir="rtl"
            />
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-right">الحالة</label>
          <Select
            value={formData.status}
            onValueChange={handleStatusChange}
            dir="rtl"
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="لم يتم">لم يتم</SelectItem>
              <SelectItem value="ستتم المتابعة مرة اخرى">ستتم المتابعة مرة اخرى</SelectItem>
              <SelectItem value="تم التنفيذ">تم التنفيذ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {formData.status === 'ستتم المتابعة مرة اخرى' && (
          <div>
            <label className="block text-sm font-medium mb-1 text-right">تاريخ التذكير</label>
            <Input
              type="date"
              value={formData.reminder_at || ''}
              onChange={(e) => setFormData({...formData, reminder_at: e.target.value})}
            />
          </div>
        )}
      </div>

      {!initialData && (
        <div>
          <label className="block text-sm font-medium mb-1 text-right">تاريخ الإنشاء</label>
          <DatePicker
            date={new Date(formData.created_at)}
            setDate={handleCreatedAtChange}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1 text-right">ملاحظات</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          dir="rtl"
        />
      </div>
      
      {initialData && (
        <>
          <Separator className="my-4" />
          <TaskHistory taskId={initialData.id} />
          <Separator className="my-4" /> {/* Add another separator */}
          <TaskComments taskId={initialData.id} /> {/* Add TaskComments */}
        </>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit">
          حفظ
        </Button>
      </div>
    </form>
  );
};