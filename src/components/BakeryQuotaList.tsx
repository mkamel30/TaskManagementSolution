import React from 'react';
import { BakeryQuota } from '@/api/bakery-quotas';
import { BakeryQuotaCard } from './BakeryQuotaCard';

interface BakeryQuotaListProps {
  quotas: BakeryQuota[];
  onEdit: (quota: BakeryQuota) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
}

export const BakeryQuotaList: React.FC<BakeryQuotaListProps> = ({ quotas, onEdit, onDelete, searchQuery }) => {
  return (
    <div className="space-y-4">
      {quotas.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <h3 className="text-lg font-semibold">لا توجد حصص تأمينية تطابق بحثك</h3>
          <p className="text-sm">حاول تعديل مصطلح البحث أو قم بإضافة حصة جديدة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" dir="rtl">
          {quotas.map((quota) => (
            <BakeryQuotaCard
              key={quota.id}
              quota={quota}
              onEdit={onEdit}
              onDelete={onDelete}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};