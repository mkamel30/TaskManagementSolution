import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { importBakeryQuotasFromExcel } from '@/api/bakery-quotas';
import { dismissToast } from '@/utils/toast';
import * as XLSX from 'xlsx'; // Import xlsx for client-side parsing

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
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = worksheet ? (worksheet['!ref'] ? XLSX.utils.sheet_to_json(worksheet) : []) : [];

          if (jsonData.length === 0) {
            toast.error('لا توجد بيانات في ملف Excel المحدد.');
            dismissToast(loadingToast);
            setIsUploading(false);
            return;
          }

          const result = await importBakeryQuotasFromExcel(jsonData);
          console.log('Import result:', result);
          
          if (result && result.processed > 0) {
            toast.success(`تم استيراد/تحديث ${result.processed} سجل بنجاح!`);
          } else {
            toast.success('تمت معالجة الملف بنجاح!');
          }
          
          setFile(null);
          // Clear the file input
          const fileInput = document.getElementById('file-input') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        } catch (parseError: any) {
          console.error('Error parsing Excel file:', parseError);
          toast.error(`خطأ في قراءة ملف Excel: ${parseError.message}`);
        } finally {
          dismissToast(loadingToast);
          setIsUploading(false);
        }
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        toast.error('خطأ في قراءة الملف.');
        dismissToast(loadingToast);
        setIsUploading(false);
      };
      reader.readAsArrayBuffer(file);

    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`حدث خطأ أثناء الاستيراد: ${error.message}`);
      dismissToast(loadingToast);
      setIsUploading(false);
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