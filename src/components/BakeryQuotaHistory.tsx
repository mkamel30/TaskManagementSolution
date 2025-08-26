import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBakeryQuotaHistory } from '@/api/bakery-quotas';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface BakeryQuotaHistoryProps {
  quotaId: string;
}

export const BakeryQuotaHistory: React.FC<BakeryQuotaHistoryProps> = ({ quotaId }) => {
  const { data: history, isLoading, isError } = useQuery({
    queryKey: ['bakeryQuotaHistory', quotaId],
    queryFn: () => getBakeryQuotaHistory(quotaId),
    enabled: !!quotaId,
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
        لا يوجد سجل تغييرات لهذه الحصة.
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
              بواسطة {entry.user_email} في {format(new Date(entry.changed_at), 'd MMMM yyyy', { locale: ar })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};