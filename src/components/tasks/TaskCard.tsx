import React from 'react';
import { Task, TaskStatus } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Clock, Trash2, Edit, AlertTriangle, User, Building, Code, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Highlighter } from '../Highlighter';

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  'لم يتم': <Clock className="text-destructive" size={20} />,
  'ستتم المتابعة مرة اخرى': <Clock className="text-amber-500" size={20} />,
  'تم التنفيذ': <Check className="text-primary" size={20} />,
};

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
  searchQuery: string;
}

const isOverdue = (reminderDate?: string) => {
  if (!reminderDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(reminderDate) < today;
};

const InfoItem: React.FC<{icon: React.ElementType, label: string, value: string, highlight: string, canWrap?: boolean}> = ({ icon: Icon, label, value, highlight, canWrap = false }) => (
  <div className="flex items-start gap-2 flex-row-reverse text-right overflow-hidden">
    <Icon className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
    <div className="flex flex-col min-w-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <strong className={cn("font-medium text-sm", !canWrap && "truncate")}>
        <Highlighter text={value} highlight={highlight} />
      </strong>
    </div>
  </div>
);

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onStatusChange, searchQuery }) => {
  return (
    <Card className={cn("w-full transition-all hover:shadow-lg flex flex-col", isOverdue(task.reminder_at) ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700" : "")}>
      <CardHeader className="p-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 flex-row-reverse">
            <button onClick={() => onStatusChange(task.id, task.status === 'تم التنفيذ' ? 'لم يتم' : 'تم التنفيذ')} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              {statusIcons[task.status]}
            </button>
            <CardTitle className="text-lg font-mono tracking-wider">
              <Highlighter text={task.task_number} highlight={searchQuery} />
            </CardTitle>
          </div>
          <Badge variant={task.status === 'تم التنفيذ' ? 'default' : 'secondary'}>{task.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-4 space-y-1 flex-grow text-right">
        <p className="font-semibold text-base text-left" dir="ltr">
          <Highlighter text={task.required_action} highlight={searchQuery} />
        </p>
        {task.notes && (
          <p className="text-sm text-muted-foreground">
            <Highlighter text={task.notes} highlight={searchQuery} />
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm pt-1">
          {task.requesting_party && <InfoItem icon={Building} label="الجهة الطالبة" value={task.requesting_party} highlight={searchQuery} />}
          {task.responsible_employee && <InfoItem icon={User} label="الموظف المسؤول" value={task.responsible_employee} highlight={searchQuery} />}
          {task.customer_code && <InfoItem icon={Code} label="كود العميل" value={task.customer_code} highlight={searchQuery} />}
          {task.creator_email && <InfoItem icon={UserPlus} label="المنشئ" value={task.creator_email} highlight={searchQuery} canWrap={true} />}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 py-2 px-4 mt-auto">
        <div className="flex items-center gap-1 flex-row-reverse">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onEdit(task)}><Edit size={16} /></Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => onDelete(task.id)}><Trash2 size={16} /></Button>
        </div>
        <div className="flex items-center gap-2">
          {task.reminder_at && (
            <div className={cn("text-xs flex items-center gap-1 flex-row-reverse", isOverdue(task.reminder_at) ? "text-red-500 font-semibold" : "text-muted-foreground")}>
              {isOverdue(task.reminder_at) && <AlertTriangle size={14} />}
              <span>تاريخ التذكير: {new Date(task.reminder_at).toLocaleDateString('ar-EG')}</span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};