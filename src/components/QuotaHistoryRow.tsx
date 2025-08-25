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
                  {history.map((entry) => (
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
＜/dyad-write>

Now, let's update the `BakeryQuotaTable` to include this `QuotaHistoryRow` component in the nested table for each quota.

 We'll add a new column in the nested table for the history button and then a row below it that contains the `QuotaHistoryRow` component.

 However, note that the `QuotaHistoryRow` component is designed to be a row that spans all columns. We can place it after each quota row.

 Let's modify the nested table in `BakeryQuotaTable`:

   - Add a new column in the nested table header for "السجل".
   - In each quota row, add a cell with a button to expand the history.
   - After each quota row, conditionally render the `QuotaHistoryRow` component.

 But note: the `QuotaHistoryRow` component already has its own collapsible. We can simplify by just showing the history in a separate row without an extra button, or we can use the `QuotaHistoryRow` as a standalone row that expands.

 Alternatively, we can change the `QuotaHistoryRow` to be a simple row that shows the history without an extra collapsible, but that might be too long.

 Let's stick with the `QuotaHistoryRow` having its own collapsible. We'll add a column in the nested table for a button that toggles the history row.

 We'll do:

   - In the nested table, add a new column for the history button.
   - Each quota row will have a button in that column.
   - When clicked, it will show a row below that contains the `QuotaHistoryRow` component.

 We'll manage the open state for each quota's history in the `BakeryQuotaTable` using a state that tracks which quota's history is open.

 However, this will require a lot of state management. Alternatively, we can use the `Collapsible` component from shadcn/ui to manage the state for each history row.

 Let's restructure the nested table:

   - We'll map over the `group.quotas` and for each quota, render:
        <React.Fragment key={quota.id}>
          <TableRow> ... with the quota data and a button to toggle history </TableRow>
          <Collapsible>
            <CollapsibleContent>
              <QuotaHistoryRow quotaId={quota.id} />
            </CollapsibleContent>
          </Collapsible>
        </React.Fragment>

 We'll use the `Collapsible` component to manage the open state for each history row.

 Let's update the `BakeryQuotaTable`:

＜dyad-write path="src/components/BakeryQuotaTable.tsx" description="Updating the BakeryQuotaTable to include a collapsible history row for each quota.">
import React from 'react';
import { BakeryQuota } from '@/api/bakery-quotas';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Edit, Trash2, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Highlighter } from './Highlighter';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { QuotaHistoryRow } from './QuotaHistoryRow'; // Import the new component

interface GroupedBakeryQuota {
  client_id: string;
  client_name: string;
  total_quota_value: number;
  quotas: BakeryQuota[];
}

interface BakeryQuotaTableProps {
  groupedQuotas: GroupedBakeryQuota[];
  onEdit: (quota: BakeryQuota) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
}

export const BakeryQuotaTable: React.FC<BakeryQuotaTableProps> = ({
  groupedQuotas,
  onEdit,
  onDelete,
  searchQuery,
}) => {
  return (
    <div className="rounded-md border overflow-hidden" dir="rtl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] text-right">التفاصيل</TableHead>
            <TableHead className="text-right">كود العميل</TableHead>
            <TableHead className="text-right">اسم العميل</TableHead>
            <TableHead className="text-right">إجمالي الحصة</TableHead>
            <TableHead className="text-right w-[100px]">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedQuotas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                لا توجد حصص تأمينية تطابق بحثك.
              </TableCell>
            </TableRow>
          ) : (
            groupedQuotas.map((group) => (
              <Collapsible asChild key={group.client_id}>
                <>
                  <TableRow className="bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <TableCell>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronDown className="h-4 w-4 data-[state=open]:hidden" />
                          <ChevronUp className="h-4 w-4 data-[state=closed]:hidden" />
                          <span className="sr-only">Toggle details</span>
                        </Button>
                      </CollapsibleTrigger>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Highlighter text={group.client_id} highlight={searchQuery} />
                    </TableCell>
                    <TableCell>
                      <Highlighter text={group.client_name} highlight={searchQuery} />
                    </TableCell>
                    <TableCell className="font-bold">
                      {group.total_quota_value.toLocaleString('ar-EG')}
                    </TableCell>
                    <TableCell>
                      {/* No actions for the group row itself, only for individual quotas */}
                    </TableCell>
                  </TableRow>
                  <CollapsibleContent asChild>
                    <TableRow className="bg-gray-100 dark:bg-gray-900">
                      <TableCell colSpan={5} className="p-0">
                        <div className="overflow-x-auto">
                          <Table className="w-full">
                            <TableHeader>
                              <TableRow className="bg-gray-200 dark:bg-gray-700">
                                <TableHead className="text-right w-[150px]">تاريخ الحصة</TableHead>
                                <TableHead className="text-right w-[100px]">القيمة</TableHead>
                                <TableHead className="text-right">ملاحظات</TableHead>
                                <TableHead className="text-right w-[100px]">الإجراءات</TableHead>
                                <TableHead className="text-right w-[100px]">السجل</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {group.quotas.map((quota) => (
                                <React.Fragment key={quota.id}>
                                  <TableRow className="hover:bg-gray-200 dark:hover:bg-gray-700">
                                    <TableCell>
                                      {format(new Date(quota.quota_date), 'd MMMM yyyy', { locale: ar })}
                                    </TableCell>
                                    <TableCell>{quota.quota_value.toLocaleString('ar-EG')}</TableCell>
                                    <TableCell>
                                      <Highlighter text={quota.notes || ''} highlight={searchQuery} />
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-1 justify-end">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(quota)}>
                                          <Edit size={16} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(quota.id)}>
                                          <Trash2 size={16} />
                                        </Button>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Collapsible>
                                        <CollapsibleTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <History size={16} />
                                          </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                          <QuotaHistoryRow quotaId={quota.id} />
                                        </CollapsibleContent>
                                      </Collapsible>
                                    </TableCell>
                                  </TableRow>
                                </React.Fragment>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </>
              </Collapsible>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};