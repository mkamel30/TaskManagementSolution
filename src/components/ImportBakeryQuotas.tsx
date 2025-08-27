import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Loader2, BarChart3, Info } from 'lucide-react';
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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState<{
    totalRows: number;
    uniqueBakeryCodes: number;
    bakeryCodes: string[];
    columns: string[];
    sampleData: any[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);
      setProgress(0);
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
          setFileInfo(null);
          return;
        }

        const firstRow = jsonData[0] || {};
        const columns = Object.keys(firstRow);

        const bakeryCodes = new Set<string>();
        jsonData.forEach((row: any) => {
          const code = row['كود المخبز']?.toString().trim();
          if (code) {
            bakeryCodes.add(code);
          }
        });

        setFileInfo({
          totalRows: jsonData.length,
          uniqueBakeryCodes: bakeryCodes.size,
          bakeryCodes: Array.from(bakeryCodes),
          columns,
          sampleData: jsonData.slice(0, 3),
        });
      } catch (parseError: any) {
        console.error('Error parsing Excel file:', parseError);
        toast.error(`خطأ في قراءة ملف Excel: ${parseError.message}`);
        setFileInfo(null);
      }
    };
    reader.readAsArrayBuffer(fileToParse);
  };

  const handleImport = async () => {
    if (!file || !fileInfo) {
      toast.error('يرجى اختيار ملف Excel أولاً');
      return;
    }

    setIsUploading(true);
    setProgress(0);
    const loadingToast = toast.loading('جاري معالجة الملف...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(buffer);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const fullData = worksheet ? (worksheet['!ref'] ? XLSX.utils.sheet_to_json(worksheet) : []) : [];

          if (fullData.length === 0) {
            toast.error('لا توجد بيانات في ملف Excel المحدد.');
            setIsUploading(false);
            return;
          }

          const result = await importBakeryQuotasFromExcel(fullData, (progress) => {
            setProgress(progress);
          });
          
          setImportResult(result);
          
          if (result.errors.length > 0) {
            toast.warning(`تمت معالجة الملف بنجاح، ولكن حدثت أخطاء في ${result.errors.length} صف(وف).`);
          } else {
            toast.success(`تم استيراد/تحديث ${result.processed} سجل بنجاح!`);
          }
        } catch (error: any) {
          console.error('Import error:', error);
          toast.error(`حدث خطأ أثناء الاستيراد: ${error.message}`);
        } finally {
          setIsUploading(false);
          toast.dismiss(loadingToast);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(`حدث خطأ أثناء الاستيراد: ${error.message}`);
      setIsUploading(false);
      toast.dismiss(loadingToast);
    }
  };

  const resetImport = () => {
    setFile(null);
    setFileInfo(null);
    setImportResult(null);
    setProgress(0);
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const downloadErrorReport = () => {
    if (!importResult || importResult.errors.length === 0) return;

    const csvContent = [
      ['رقم الصف', 'رسالة الخطأ'],
      ...importResult.errors.map(error => [error.row, error.message])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `import_errors_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

        {file && !importResult && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground text-right w-full">
              الملف المختار: {file.name}
            </div>
            
            {fileInfo && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">إجمالي الصفوف</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{fileInfo.totalRows.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">عدد المخابز الفريدة</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{fileInfo.uniqueBakeryCodes.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium text-right mb-2 flex items-center gap-2 justify-end">
                      <Info size={14} className="text-blue-500" />
                      <span>الأعمدة المتوقعة: <span className="font-normal text-muted-foreground">كود المخبز, اسم المخبز, NEW_AVG_, TRUNC_A_OPE_DATE_, discount_type, ملاحظات</span></span>
                    </p>
                    <p className="text-sm font-medium text-right mb-2">الأعمدة الموجودة في الملف:</p>
                    <div className="flex flex-wrap gap-2">
                      {fileInfo.columns.map((col, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium text-right mb-2">أمثلة على البيانات (الصفوف 1-3):</p>
                    <div className="border rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                          <tr>
                            {fileInfo.columns.map((col, index) => (
                              <th key={index} className="px-2 py-1 text-right border-b">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {fileInfo.sampleData.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              {fileInfo.columns.map((col, colIndex) => (
                                <td key={colIndex} className="px-2 py-1 border-b text-right">
                                  {row[col]?.toString() || ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleImport} 
                disabled={isUploading || !fileInfo} 
                className="flex items-center gap-2"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload size={16} />}
                {isUploading ? 'جاري الاستيراد...' : 'استيراد البيانات'}
              </Button>
              <Button variant="outline" onClick={resetImport}>
                <X size={16} />
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {isUploading && progress > 0 && progress < 100 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>جاري المعالجة...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
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
                <p className="text-2xl font-bold">{importResult.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">إجمالي الصفوف</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importResult.processed.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">المعالجة</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importResult.created.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">جديدة</p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{importResult.updated.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">محدثة</p>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle size={16} />
                    الأخطاء ({importResult.errors.length})
                  </h4>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadErrorReport}
                    className="text-xs"
                  >
                    تحميل تقرير الأخطاء
                  </Button>
                </div>
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
              إغلاق
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};