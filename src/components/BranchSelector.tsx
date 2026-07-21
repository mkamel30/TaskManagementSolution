import React from 'react';
import { useBranch, BranchOption } from '@/contexts/BranchContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export const BranchSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { selectedBranch, setSelectedBranch, availableBranches } = useBranch();

  return (
    <div className={`flex items-center gap-2 ${className}`} dir="rtl">
      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Select value={selectedBranch} onValueChange={(val) => setSelectedBranch(val as BranchOption)}>
        <SelectTrigger className="w-[140px] h-9 text-xs font-semibold bg-background border-input">
          <SelectValue placeholder="اختر الفرع" />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {availableBranches.map((branch) => (
            <SelectItem key={branch} value={branch} className="text-xs font-medium cursor-pointer">
              {branch === 'الكل' ? 'جميع الفروع' : `فرع ${branch}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
