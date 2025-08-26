import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { importBakeryQuotasFromExcel } from '@/api/bakery-quotas';
import { dismissToast } from '@/utils/toast';

export const ImportBakeryQuotas: React.FC = () => {
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
      
      if (result && result.inserted > 0) {
        toast.success(`تم استيراد ${result.inserted} سجل بنجاح!`);
      } else if (result && result.updated > 0) {
        toast.success(`تم تحديث ${result.updated} سجل بنجاح!`);
      } else {
        toast.success('تمت معالجة الملف بنجاح!');
      }
      
      setFile(null);
      // Clear the file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
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