import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBakeryQuotaHistory } from '@/api/bakery-quotas';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BakeryQuotaHistory as BakeryQuotaHistoryType } from '@/api/bakery-quotas'; // Import the type

interface QuotaHistoryRowProps {
  quotaId: string;
}

export const QuotaHistoryRow: React.FC<QuotaHistoryRowProps> = ({ quotaId }) => {
  const { data: history, isLoading, isError } = useQuery({
    queryKey: ['bakeryQuotaHistory', quotaId],
    queryFn: () => getBakeryQuotaHistory(quotaId),
    enabled: !!quotaId,
  });

  if (isLoading) {
    return (
      <tr>
        <td colSpan={4}>
          <div className="p-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full mt-2" />
          </div>
        </td>
      </tr>
    );
  }

  if (isError) {
    return (
      <tr>
        <td colSpan={4} className="text-sm text-red-500 text-center p-4">
          لا يمكن تحميل سجل التغييرات.
        </td>
      </tr>
    );
  }

  if (!history || history.length === 0) {
    return (
      <tr>
        <td colSpan={4} className="text-sm text-muted-foreground text-center p-4">
          لا يوجد سجل تغييرات لهذه الحصة.
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr>
        <td colSpan={4} className="p-0">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full p-2 h-auto justify-start">
                <History className="h-4 w-4 mr-2" />
                <span>عرض سجل التغييرات</span>
                <ChevronDown className="h-4 w-4 ml-auto" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <ul className="space-y-3">
                  {history.map((entry: BakeryQuotaHistoryType) => ( // Cast entry to the imported type
                    <li key={entry.id} className="relative pl-6">
                      <div className="absolute left-0 top-1 w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full ring-4 ring-background" />
                      <p className="font-medium text-sm text-right">{entry.change_description}</p>
                      <p className="text-xs text-muted-foreground text-right">
                        بواسطة {entry.user_email} في {format(new Date(entry.changed_at), 'd MMMM yyyy, h:mm a', { locale: ar })}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </td>
      </tr>
    </>
  );
};