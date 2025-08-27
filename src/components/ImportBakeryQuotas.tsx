import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { importBakeryQuotasFromExcel } from '@/api/bakery-quotas';
import { dismissToast } from '@/utils/toast';
import * as XLSX from 'xlsx';
import { debugLogger } from '@/utils/debugLogger';

interface ImportProgress {
  totalRows: number;
  uniqueBakeries: number;
  processedRows: number;
  processedBakeries: number;
  currentChunk: number;
  totalChunks: number;
  errors: string[];
  debugLogs: string[];
}

export const ImportBakeryQuotas: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setProgress(null); // Reset progress on new file selection
      debugLogger.clearLogs();
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف Excel');
      return;
    }

    setIsUploading(true);
    setProgress({
      totalRows: 0,
      uniqueBakeries: 0,
      processedRows: 0,
      processedBakeries: 0,
      currentChunk: 0,
      totalChunks: 0,
      errors: [],
      debugLogs: [],
    });
    debugLogger.enable(); // Enable logging for this import
    debugLogger.info(`Starting import for file: ${file.name}`);

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

          const uniqueBakeries = new Set(jsonData.map((row: any) => row['BAKERY_CODE']?.toString().trim()).filter(Boolean));
          
          setProgress(prev => prev ? { ...prev, totalRows: jsonData.length, uniqueBakeries: uniqueBakeries.size, totalChunks: Math.ceil(jsonData.length / 100) } : null);

          const result = await importBakeryQuotasFromExcel(jsonData, (chunkProgress) => {
            setProgress(prev => {
              if (!prev) return null;
              return { ...prev, ...chunkProgress };
            });
          });

          debugLogger.info(`Import finished. Processed: ${result.processed}, Errors: ${result.errors.length}`);
          
          if (result && result.processed > 0) {
            toast.success(`تم استيراد/تحديث ${result.processed} سجل بنجاح!`);
          } else {
            toast.success('تمت معالجة الملف بنجاح!');
          }
          
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (parseError: any) {
          debugLogger.error(`Error parsing Excel file: ${parseError.message}`);
          toast.error(`خطأ في قراءة ملف Excel: ${parseError.message}`);
        } finally {
          dismissToast(loadingToast);
          setIsUploading(false);
        }
      };
      reader.onerror = (error) => {
        debugLogger.error(`FileReader error: ${error}`);
        toast.error('خطأ في قراءة الملف.');
        dismissToast(loadingToast);
        setIsUploading(false);
      };
      reader.readAsArrayBuffer(file);

    } catch (error: any) {
      debugLogger.error(`Import error: ${error.message}`);
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
            ref={fileInputRef}
            id="file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="text-right"
            disabled={isUploading}
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
          className="flex items-center gap-2 w-full"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? 'جاري الاستيراد...' : 'استيراد البيانات'}
        </Button>

        {progress && (
          <div className="w-full space-y-3">
            <div className="flex justify-between text-sm">
              <span>إجمالي الصفوف: {progress.totalRows}</span>
              <span>عدد المخابز الفريدة: {progress.uniqueBakeries}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${(progress.processedRows / progress.totalRows) * 100}%` }}
              ></div>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              معالجة {progress.processedRows} من {progress.totalRows} صف ({progress.currentChunk}/{progress.totalChunks} كتل)
            </div>
            {progress.errors.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-right">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">حدثت أخطاء:</span>
                </div>
                <ul className="text-xs text-red-600 dark:text-red-400 mt-1 list-disc list-inside">
                  {progress.errors.slice(0, 3).map((error, i) => <li key={i}>{error}</li>)}
                  {progress.errors.length > 3 && <li>+{progress.errors.length - 3} المزيد من الأخطاء</li>}
                </ul>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsDebugExpanded(!isDebugExpanded)}
              className="w-full justify-start"
            >
              <AlertCircle className="h-4 w-4 ml-2" />
              {isDebugExpanded ? 'إخفاء السجلات' : 'عرض السجلات التفصيلية'}
            </Button>
            {isDebugExpanded && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-xs font-mono text-right max-h-40 overflow-y-auto">
                {debugLogger.getLogs().map((log, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-gray-500">[{log.timestamp}]</span>
                    <span className={`ml-2 ${log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-yellow-500' : 'text-green-500'}`}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="ml-2">{log.message}</span>
                  </div>
                ))}
                {debugLogger.getLogs().length === 0 && <p className="text-muted-foreground">لا توجد سجلات.</p>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};