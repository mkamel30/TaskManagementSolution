import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getComments, addComment } from '@/api/tasks';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { showError, showSuccess } from '@/utils/toast';

interface TaskCommentsProps {
  taskId: string;
}

export const TaskComments: React.FC<TaskCommentsProps> = ({ taskId }) => {
  const queryClient = useQueryClient();
  const [newCommentText, setNewCommentText] = useState('');

  const { data: comments, isLoading, isError } = useQuery({
    queryKey: ['taskComments', taskId],
    queryFn: () => getComments(taskId),
    enabled: !!taskId,
  });

  const addCommentMutation = useMutation({
    mutationFn: (comment: { taskId: string; commentText: string }) =>
      addComment(comment.taskId, comment.commentText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] });
      setNewCommentText('');
      showSuccess('تم إضافة التعليق بنجاح!');
    },
    onError: (error) => {
      showError(`خطأ في إضافة التعليق: ${error.message}`);
    },
  });

  const handleAddComment = () => {
    if (newCommentText.trim()) {
      addCommentMutation.mutate({ taskId, commentText: newCommentText });
    }
  };

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
    return <div className="text-sm text-red-500 text-right pt-4">لا يمكن تحميل التعليقات.</div>;
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-right flex items-center justify-end gap-2">
        <MessageSquare size={16} />
        <span>التعليقات</span>
      </h4>
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md text-right">
              <p className="text-sm font-medium">{comment.comment_text}</p>
              <p className="text-xs text-muted-foreground mt-1">
                بواسطة {comment.user_email} في {format(new Date(comment.created_at), 'd MMMM yyyy, h:mm a', { locale: ar })}
              </p>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            لا توجد تعليقات لهذه المهمة.
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-2">
        <Textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="أضف تعليقًا..."
          rows={2}
          dir="rtl"
          className="flex-grow"
        />
        <Button onClick={handleAddComment} disabled={!newCommentText.trim() || addCommentMutation.isPending}>
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
};