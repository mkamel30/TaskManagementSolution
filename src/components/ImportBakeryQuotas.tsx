import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Eye, CheckCircle, AlertCircle, X } from 'lucide-react';
import { importBakeryQuotasFromExcel } from '@/api/bakery-quotas';
import * as XLSX from 'xlsx';

type ImportResult = {
  total: number;
  processed: number;
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
};

export const ImportBakeryQuotas: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setShowPreview(false);
      setImportResult(null);
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = (fileToParse: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = worksheet ? (worksheet['!ref'] ? XLSX.utils.sheet_to_json(worksheet) : []) : [];

        if (jsonData.length === 0) {
          toast.error('لا توجد بيانات في ملف Excel المحدد.');
          return;
        }

        setPreviewData(jsonData.slice(0, 5)); // Show only first 5 rows for preview
      } catch (parseError: any) {
        console.error('Error parsing Excel file:', parseError);
        toast.error(`خطأ في قراءة ملف Excel: ${parseError.message}`);
      }
    };
    reader.readAsArrayBuffer(fileToParse);
  };

  const handleImport = async () => {
    if (!file || previewData.length === 0) {
      toast.error('يرجى اختيار ملف Excel أولاً');
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading('جاري معالجة الملف...');

    try {
      const result = await importBakeryQuotasFromExcel(previewData);
      console.log('Import result:', result);
      
      setImportResult(result);
      
      if (result.errors.length > 0) {
        toast.warning(`تمت معالجة الملف بنجاح، ولكن حدثت أخطاء في ${result.errors.length} صف(وف).`);
      } else {
        toast.success(`تم استيراد/تحديث ${result.processed} سجل بنجاح!`);
      }
      
      setFile(null);
      setShowPreview(false);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`حدث خطأ أثناء الاستيراد: ${error.message}`);
    } finally {
      dismissToast(loadingToast);
      setIsUploading(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setPreviewData([]);
    setShowPreview(false);
    setImportResult(null);
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-right flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>استيراد من Excel</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!file && !importResult && (
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
        )}

        {file && !showPreview && !importResult && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground text-right w-full">
              الملف المختار: {file.name}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowPreview(true)} className="flex items-center gap-2">
                <Eye size={16} />
                معاينة البيانات
              </Button>
              <Button variant="outline" onClick={resetImport}>
                <X size={16} />
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {showPreview && previewData.length > 0 && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <p className="text-sm text-blue-800 dark:text-blue-200 text-right">
                تم العثور على <span className="font-bold">{previewData.length}</span> صف في الملف المعاينة. سيتم استيراد جميع الصفوف.
              </p>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {Object.keys(previewData[0] || {}).map((key) => (
                      <th key={key} className="px-4 py-2 text-right border-b">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      {Object.values(row).map((value: any, i: number) => (
                        <td key={i} className="px-4 py-2 border-b text-right">
                          {value?.toString() || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={isUploading} className="flex items-center gap-2">
                <Upload size={16} />
                {isUploading ? 'جاري الاستيراد...' : 'استيراد البيانات'}
              </Button>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                <X size={16} />
                إلغاء المعاينة
              </Button>
            </div>
          </div>
        )}

        {importResult && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle size={20} />
                <span className="font-bold">اكتملت عملية الاستيراد</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold">{importResult.total}</p>
                <p className="text-xs text-muted-foreground">إجمالي الصفوف</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importResult.processed}</p>
                <p className="text-xs text-muted-foreground">المعالجة</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importResult.created}</p>
                <p className="text-xs text-muted-foreground">جديدة</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{importResult.updated}</p>
                <p className="text-xs text-muted-foreground">محدثة</p>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle size={16} />
                  الأخطاء ({importResult.errors.length})
                </h4>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-red-50 dark:bg-red-900/10">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-800 dark:text-red-200 text-right py-1 border-b last:border-b-0">
                      <span className="font-medium">الصف {error.row}:</span> {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={resetImport} variant="outline" className="w-full">
              <X size={16} className="ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};