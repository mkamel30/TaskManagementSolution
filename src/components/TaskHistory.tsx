import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTaskHistory } from '@/api/tasks';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TaskHistoryProps {
  taskId: string;
}

export const TaskHistory: React.FC<TaskHistoryProps> = ({ taskId }) => {
  const { data: history, isLoading, isError } = useQuery({
    queryKey: ['taskHistory', taskId],
    queryFn: () => getTaskHistory(taskId),
    enabled: !!taskId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-sm text-red-500 text-right pt-4">لا يمكن تحميل سجل التغييرات.</div>;
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        لا يوجد سجل تغييرات لهذه المهمة.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-right flex items-center justify-end gap-2">
        <History size={16} />
        <span>سجل التغييرات</span>
      </h4>
      <ul className="space-y-4 border-r-2 border-gray-200 dark:border-gray-700 pr-4 mr-1">
        {history.map((entry) => (
          <li key={entry.id} className="relative">
            <div className="absolute -right-[26px] top-1 h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded-full ring-4 ring-background" />
            <p className="font-medium text-sm text-right">{entry.change_description}</p>
            <p className="text-xs text-muted-foreground text-right">
              بواسطة {entry.user_email} في {format(new Date(entry.changed_at), 'd MMMM yyyy, h:mm a', { locale: ar })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};