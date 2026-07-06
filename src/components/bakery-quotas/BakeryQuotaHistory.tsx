import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBakeryQuotaHistory, updateBakeryQuotaHistoryEntry, deleteBakeryQuotaHistoryEntry } from '@/api/bakery-quotas';
import { Skeleton } from '@/components/ui/skeleton';
import { History, Edit, Trash2, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/components/AuthManager';

interface BakeryQuotaHistoryProps {
  quotaId: string;
}

export const BakeryQuotaHistory: React.FC<BakeryQuotaHistoryProps> = ({ quotaId }) => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const currentUserId = session?.user?.id;

  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [historyEntryToDelete, setHistoryEntryToDelete] = useState<string | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{ id: string; change_description: string; notes?: string } | null>(null);

  const { data: history, isLoading, isError } = useQuery({
    queryKey: ['bakeryQuotaHistory', quotaId],
    queryFn: () => getBakeryQuotaHistory(quotaId),
    enabled: !!quotaId,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBakeryQuotaHistoryEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaHistory', quotaId] });
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaHistoryCounts'] }); // Invalidate counts as well
      showSuccess('تم حذف سجل التغيير بنجاح.');
    },
    onError: (error) => {
      showError(`خطأ في حذف سجل التغيير: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (variables: { historyId: string; updates: { change_description?: string; notes?: string } }) =>
      updateBakeryQuotaHistoryEntry(variables.historyId, variables.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaHistory', quotaId] });
      showSuccess('تم تحديث سجل التغيير بنجاح.');
      setIsEditDialogOpen(false);
      setEditingEntry(null);
    },
    onError: (error) => {
      showError(`خطأ في تحديث سجل التغيير: ${error.message}`);
    },
  });

  const handleDeleteRequest = (entryId: string) => {
    setHistoryEntryToDelete(entryId);
    setDeleteAlertOpen(true);
  };

  const handleConfirmDelete = () => {
    if (historyEntryToDelete) {
      deleteMutation.mutate(historyEntryToDelete);
    }
    setDeleteAlertOpen(false);
    setHistoryEntryToDelete(null);
  };

  const handleEditRequest = (entry: { id: string; change_description: string; notes?: string }) => {
    setEditingEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (editingEntry) {
      updateMutation.mutate({
        historyId: editingEntry.id,
        updates: {
          change_description: editingEntry.change_description,
          notes: editingEntry.notes,
        },
      });
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
          <li key={entry.id} className="relative group">
            <div className="absolute -right-[26px] top-1 h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded-full ring-4 ring-background" />
            <div className="flex justify-between items-start gap-2">
              <div className="flex-grow">
                <p className="font-medium text-sm text-right">{entry.change_description}</p>
                {entry.notes && (
                  <p className="text-xs text-muted-foreground text-right mt-0.5">
                    ملاحظات: {entry.notes}
                  </p>
                )}
                <p className="text-xs text-muted-foreground text-right mt-1">
                  تاريخ الحصة: {entry.trunc_a_ope_date_ ? format(new Date(entry.trunc_a_ope_date_), 'dd.MM.yyyy', { locale: ar }) : 'غير محدد'}
                </p>
                <p className="text-xs text-muted-foreground text-right mt-0.5">
                  تاريخ التسجيل بالنظام: بواسطة {entry.user_email} في {format(new Date(entry.changed_at), 'd MMMM yyyy, h:mm a', { locale: ar })}
                </p>
              </div>
              {currentUserId === entry.user_id && ( // Only show buttons if current user created the entry
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditRequest(entry)}>
                    <Edit size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteRequest(entry.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. سيؤدي هذا إلى حذف سجل التغيير المحدد بشكل دائم.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>متابعة</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit History Entry Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-right">تعديل سجل التغيير</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="description" className="text-right col-span-1">
                  الوصف
                </label>
                <Input
                  id="description"
                  value={editingEntry.change_description}
                  onChange={(e) => setEditingEntry(prev => prev ? { ...prev, change_description: e.target.value } : null)}
                  className="col-span-3 text-right"
                  dir="rtl"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="notes" className="text-right col-span-1">
                  ملاحظات
                </label>
                <Textarea
                  id="notes"
                  value={editingEntry.notes || ''}
                  onChange={(e) => setEditingEntry(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  className="col-span-3 text-right"
                  dir="rtl"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  <X size={16} className="ml-2" />
                  إلغاء
                </Button>
                <Button onClick={handleEditSubmit} disabled={updateMutation.isPending}>
                  <Save size={16} className="ml-2" />
                  حفظ التغييرات
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};