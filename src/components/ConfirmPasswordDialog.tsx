import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ConfirmPasswordDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}

export const ConfirmPasswordDialog: React.FC<ConfirmPasswordDialogProps> = ({
  isOpen,
  setIsOpen,
  onConfirm,
  onCancel,
}) => {
  const [password, setPassword] = useState('');

  const handleConfirm = () => {
    onConfirm(password);
    setPassword(''); // Clear password after attempt
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setPassword(''); // Clear password when dialog closes
      onCancel(); // Call cancel if dialog is closed without confirming
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-right">تأكيد الحذف</DialogTitle>
          <DialogDescription className="text-right">
            للحذف، يرجى إدخال كلمة مرور المسؤول.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="admin-password"
            type="password"
            placeholder="كلمة مرور المسؤول"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="col-span-3 text-right"
            dir="rtl"
          />
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button type="button" onClick={handleConfirm}>
            تأكيد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};