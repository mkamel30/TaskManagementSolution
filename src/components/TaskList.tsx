import React from 'react';
import { Task } from '@/types/task';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
  searchQuery: string;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onEdit, onDelete, onStatusChange, searchQuery }) => {
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