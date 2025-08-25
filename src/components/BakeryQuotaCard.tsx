import React from 'react';
import { BakeryQuota } from '@/api/bakery-quotas';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Clock, Trash2, Edit, AlertTriangle, Building, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Highlighter } from './Highlighter';

interface BakeryQuotaCardProps {
  quota: BakeryQuota;
  onEdit: (quota: BakeryQuota) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
}

const isOverdue = (quotaDate: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(quotaDate) < today;
};

export const BakeryQuotaCard: React.FC<BakeryQuotaCardProps> = ({ quota, onEdit, onDelete, searchQuery }) => {
  return (
    <Card className={cn("w-full transition-all hover:shadow-lg flex flex-col", isOverdue(quota.quota_date) ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700" : "")}>
      <CardHeader className="p-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 flex-row-reverse">
            <CardTitle className="text-lg font-mono tracking-wider">
              <Highlighter text={quota.client_id} highlight={searchQuery} />
            </CardTitle>
          </div>
          <Badge variant={isOverdue(quota.quota_date) ? 'destructive' : 'secondary'}>
            {isOverdue(quota.quota_date) ? 'متأخرة' : 'نشطة'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-4 space-y-1 flex-grow text-right">
        <p className="font-semibold text-base text-left" dir="ltr">
          <Highlighter text={quota.client_name} highlight={searchQuery} />
        </p>
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm pt-1">
          <div className="flex items-start gap-2 flex-row-reverse text-right overflow-hidden">
            <Building className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-muted-foreground">العميل</span>
              <strong className="font-medium text-sm">
                <Highlighter text={quota.client_name} highlight={searchQuery} />
              </strong>
            </div>
          </div>
          <div className="flex items-start gap-2 flex-row-reverse text-right overflow-hidden">
            <Calendar className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-muted-foreground">تاريخ الحصة</span>
              <strong className="font-medium text-sm">
                {new Date(quota.quota_date).toLocaleDateString('ar-EG')}
              </strong>
            </div>
          </div>
          <div className="flex items-start gap-2 flex-row-reverse text-right overflow-hidden">
            <Check className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-muted-foreground">القيمة</span>
              <strong className="font-medium text-sm">
                {quota.quota_value.toLocaleString('ar-EG')}
              </strong>
            </div>
          </div>
        </div>
        {quota.notes && (
          <p className="text-sm text-muted-foreground mt-2">
            <Highlighter text={quota.notes} highlight={searchQuery} />
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 py-2 px-4 mt-auto">
        <div className="flex items-center gap-1 flex-row-reverse">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onEdit(quota)}><Edit size={16} /></Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => onDelete(quota.id)}><Trash2 size={16} /></Button>
        </div>
        <div className="flex items-center gap-2">
          {isOverdue(quota.quota_date) && (
            <div className="text-xs flex items-center gap-1 flex-row-reverse text-red-500 font-semibold">
              <AlertTriangle size={14} />
              <span>متأخرة</span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};