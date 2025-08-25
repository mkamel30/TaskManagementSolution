import React from 'react';
import { BakeryQuota } from '@/api/bakery-quotas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Highlighter } from './Highlighter';

interface BakeryQuotaCardProps {
  quota: BakeryQuota;
  onEdit: (quota: BakeryQuota) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
}

export const BakeryQuotaCard: React.FC<BakeryQuotaCardProps> = ({ quota, onEdit, onDelete, searchQuery }) => {
  return (
    <Card 
      className={cn(
        "w-full transition-all hover:shadow-lg flex flex-col cursor-pointer",
        "border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary" // Neutral border, highlights on hover
      )}
      onClick={() => onEdit(quota)} // Make the entire card clickable for editing
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-center gap-4">
          <CardTitle className="text-lg font-mono tracking-wider text-right">
            <Highlighter text={quota.client_id} highlight={searchQuery} />
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-4 flex-grow text-right">
        <p className="font-semibold text-base">
          <Highlighter text={quota.client_name} highlight={searchQuery} />
        </p>
      </CardContent>
      <CardFooter className="flex justify-end items-center bg-slate-50 dark:bg-slate-800/50 py-2 px-4 mt-auto">
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-8 h-8 text-destructive hover:text-destructive" 
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click from triggering edit
            onDelete(quota.id);
          }}
        >
          <Trash2 size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
};