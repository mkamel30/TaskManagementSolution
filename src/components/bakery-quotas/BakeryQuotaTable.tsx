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
import { ChevronDown, Edit, Trash2, PlusCircle } from 'lucide-react';
import { Highlighter } from '../Highlighter';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { BakeryQuotaHistory } from './BakeryQuotaHistory';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from '@/components/ui/skeleton';

interface BakeryQuotaTableProps {
  bakeries: (BakeryQuota & { total_changes_count: number })[];
  isLoading?: boolean;
  onEdit: (quota: BakeryQuota) => void;
  onDelete: (id: string) => void;
  onAddRecord: (quota: BakeryQuota) => void;
  searchQuery: string;
}

export const BakeryQuotaTable: React.FC<BakeryQuotaTableProps> = ({
  bakeries,
  isLoading,
  onEdit,
  onDelete,
  onAddRecord,
  searchQuery,
}) => {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  React.useEffect(() => {
    if (searchQuery && bakeries.length === 1) {
      setOpenGroupId(bakeries[0].id);
    } else if (!searchQuery) {
      setOpenGroupId(null);
    }
  }, [searchQuery, bakeries]);

  const handleToggleGroup = (bakeryId: string) => {
    setOpenGroupId(openGroupId === bakeryId ? null : bakeryId);
  };

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-hidden" dir="rtl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-right">السجل</TableHead>
              <TableHead className="text-right">كود العميل</TableHead>
              <TableHead className="text-right">اسم العميل</TableHead>
              <TableHead className="text-right">الحصة الحالية</TableHead>
              <TableHead className="text-right">تاريخ الحصة</TableHead>
              <TableHead className="text-right">تاريخ التسجيل بالنظام</TableHead>
              <TableHead className="text-right">نوع الخصم</TableHead>
              <TableHead className="text-right">إجمالي التغييرات</TableHead>
              <TableHead className="text-right w-[130px]">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : bakeries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  لا توجد مخابز تطابق بحثك.
                </TableCell>
              </TableRow>
            ) : (
              bakeries.map((bakery) => (
                <Collapsible asChild key={bakery.id} open={openGroupId === bakery.id} onOpenChange={() => handleToggleGroup(bakery.id)}>
                  <>
                    <TableRow 
                      className="bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer data-[state=open]:ring-2 data-[state=open]:ring-primary/50"
                    >
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                            <span className="sr-only">Toggle details</span>
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Highlighter text={bakery.client_id} highlight={searchQuery} />
                      </TableCell>
                      <TableCell>
                        <Highlighter text={bakery.client_name} highlight={searchQuery} />
                      </TableCell>
                      <TableCell>{bakery.quota_value.toLocaleString('ar-EG')}</TableCell>
                      <TableCell>
                        {format(new Date(bakery.quota_date), 'dd.MM.yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {bakery.created_at ? format(new Date(bakery.created_at), 'dd.MM.yyyy, hh:mm a', { locale: ar }) : 'غير مسجل'}
                      </TableCell>
                      <TableCell>
                        <Highlighter text={bakery.discount_type || 'غير محدد'} highlight={searchQuery} />
                      </TableCell>
                      <TableCell className="font-bold">
                        {bakery.total_changes_count}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAddRecord(bakery)}>
                                <PlusCircle size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>إضافة سجل حصة جديد</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(bakery)}>
                                <Edit size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>تعديل بيانات المخبز</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(bakery.id)}>
                                <Trash2 size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>حذف المخبز</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow className="bg-gray-100 dark:bg-gray-900">
                        <TableCell colSpan={9} className="p-4">
                          <BakeryQuotaHistory quotaId={bakery.id} />
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
    </TooltipProvider>
  );
};