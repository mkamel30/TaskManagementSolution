import React from 'react';
import { Task } from '@/types/task';
import { TaskCard } from './TaskCard';
import { Skeleton } from '@/components/ui/skeleton';

interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
  searchQuery: string;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, isLoading, onEdit, onDelete, onStatusChange, searchQuery }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" dir="rtl">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="border border-border rounded-xl p-5 space-y-4 bg-card shadow-sm">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <div className="pt-2 border-t border-border flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <h3 className="text-lg font-semibold">لا توجد مهام تطابق بحثك</h3>
          <p className="text-sm">حاول تعديل مصطلح البحث أو قم بإضافة مهمة جديدة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" dir="rtl">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};