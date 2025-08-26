import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { importBakeryQuotasFromExcel } from '@/api/bakery-quotas';
import { dismissToast } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient

export const ImportBakeryQuotas: React.FC = () => {
  const queryClient = useQueryClient(); // Initialize query client
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف Excel');
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading('جاري معالجة الملف...');

    try {
      const result = await importBakeryQuotasFromExcel(file);
      console.log('Import result:', result);
      
      let successMessage = 'تمت معالجة الملف بنجاح!';
      if (result.inserted > 0 && result.updated > 0) {
        successMessage = `تم استيراد ${result.inserted} سجل جديد وتحديث ${result.updated} سجل موجود بنجاح!`;
      } else if (result.inserted > 0) {
        successMessage = `تم استيراد ${result.inserted} سجل جديد بنجاح!`;
      } else if (result.updated > 0) {
        successMessage = `تم تحديث ${result.updated} سجل موجود بنجاح!`;
      } else if (result.errors && result.errors.length > 0) {
        successMessage = `تمت معالجة الملف مع بعض الأخطاء.`;
      } else {
        successMessage = 'لم يتم استيراد أو تحديث أي سجلات.';
      }

      toast.success(successMessage);

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach((error: string) => {
          toast.error(`خطأ في صف: ${error}`, { duration: 10000 });
        });
      }
      
      setFile(null);
      // Clear the file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Invalidate queries to refetch data after successful import
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotas'] });
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaHistoryCounts'] });

    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`حدث خطأ أثناء الاستيراد: ${error.message}`);
    } finally {
      setIsUploading(false);
      dismissToast(loadingToast);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-right flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>استيراد من Excel</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="w-full">
          <Label htmlFor="file-input" className="block text-sm font-medium mb-2 text-right">
            اختر ملف Excel
          </Label>
          <Input
            id="file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="text-right"
          />
        </div>
        {file && (
          <div className="text-sm text-muted-foreground text-right w-full">
            الملف المختار: {file.name}
          </div>
        )}
        <Button 
          onClick={handleImport} 
          disabled={!file || isUploading}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? 'جاري الاستيراد...' : 'استيراد البيانات'}
        </Button>
      </CardContent>
    </Card>
  );
};