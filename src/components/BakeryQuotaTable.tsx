import React, { useState } from 'react';
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
import { ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Highlighter } from './Highlighter';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { GroupedBakeryQuota } from '@/pages/BakeryQuotas';

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
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  // Automatically expand the group if there's only one group and a search query
  React.useEffect(() => {
    if (searchQuery && groupedQuotas.length === 1) {
      setOpenGroupId(groupedQuotas[0].client_id);
    } else {
      setOpenGroupId(null);
    }
  }, [searchQuery, groupedQuotas]);

  const handleToggleGroup = (clientId: string) => {
    setOpenGroupId(openGroupId === clientId ? null : clientId);
  };

  return (
    <div className="rounded-md border overflow-hidden" dir="rtl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] text-right">التفاصيل</TableHead>
            <TableHead className="text-right">كود العميل</TableHead>
            <TableHead className="text-right">اسم العميل</TableHead>
            <TableHead className="text-right">إجمالي التغييرات</TableHead>
            <TableHead className="text-right w-[100px]">الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedQuotas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                لا توجد حصص تأمينية تطابق بحثك.
                <br />
                <span className="text-xs">جرب تعديل مصطلح البحث أو قم بإضافة حصة جديدة.</span>
              </TableCell>
            </TableRow>
          ) : (
            groupedQuotas.map((group) => (
              <Collapsible asChild key={group.client_id} open={openGroupId === group.client_id}>
                <>
                  <TableRow 
                    className={cn(
                      "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
                      openGroupId === group.client_id && "ring-2 ring-primary/50"
                    )}
                    onClick={() => handleToggleGroup(group.client_id)}
                  >
                    <TableCell>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronDown className={cn("h-4 w-4 data-[state=open]:hidden", openGroupId === group.client_id && "hidden")} />
                          <ChevronUp className={cn("h-4 w-4 data-[state=closed]:hidden", openGroupId !== group.client_id && "hidden")} />
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
                      {group.total_changes_count}
                    </TableCell>
                    <TableCell>
                      {/* لا توجد إجراءات للصف الرئيسي للمجموعة، فقط للحصص الفردية */}
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
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                                          e.stopPropagation(); // Prevent row click from toggling group
                                          onEdit(quota);
                                        }}>
                                          <Edit size={16} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => {
                                          e.stopPropagation(); // Prevent row click from toggling group
                                          onDelete(quota.id);
                                        }}>
                                          <Trash2 size={16} />
                                        </Button>
                                      </div>
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