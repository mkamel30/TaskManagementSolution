import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UploadCloud, File as FileIcon, X, Download } from 'lucide-react';

interface FileUploadProps {
  existingFilePaths: string[];
  onExistingFilePathsChange: (paths: string[]) => void;
  newFiles: File[];
  onNewFilesChange: (files: File[]) => void;
}

const getPublicUrl = (filePath: string) => {
  const { data } = supabase.storage.from('task_files').getPublicUrl(filePath);
  return data.publicUrl;
};

export const FileUpload: React.FC<FileUploadProps> = ({
  existingFilePaths,
  onExistingFilePathsChange,
  newFiles,
  onNewFilesChange,
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onNewFilesChange([...newFiles, ...acceptedFiles]);
  }, [newFiles, onNewFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeNewFile = (index: number) => {
    const updatedFiles = [...newFiles];
    updatedFiles.splice(index, 1);
    onNewFilesChange(updatedFiles);
  };

  const removeExistingFile = (path: string) => {
    onExistingFilePathsChange(existingFilePaths.filter(p => p !== path));
  };

  const getFileName = (path: string) => {
    try {
      const parts = path.split('/');
      const lastPart = parts[parts.length - 1];
      return lastPart.substring(lastPart.indexOf('-') + 1);
    } catch {
      return path;
    }
  };

  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={`border-2 border-dashed hover:border-primary transition-colors ${
          isDragActive ? 'border-primary bg-primary/10' : ''
        }`}
      >
        <CardContent className="p-6 text-center cursor-pointer">
          <input {...getInputProps()} />
          <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
          {isDragActive ? (
            <p className="mt-2">أفلت الملفات هنا...</p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              اسحب وأفلت بعض الملفات هنا، أو انقر لتحديد الملفات
            </p>
          )}
        </CardContent>
      </Card>

      {(existingFilePaths.length > 0 || newFiles.length > 0) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-right">الملفات المرفقة</h4>
          <ul className="divide-y rounded-md border">
            {existingFilePaths.map((path) => (
              <li key={path} className="flex items-center justify-between p-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{getFileName(path)}</span>
                </div>
                <div className="flex items-center gap-1">
                   <a href={getPublicUrl(path)} target="_blank" rel="noopener noreferrer" download>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeExistingFile(path)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
            {newFiles.map((file, index) => (
              <li key={file.name + index} className="flex items-center justify-between p-2 text-sm">
                <div className="flex items-center gap-2">
                  <FileIcon className="h-4 w-4 text-muted-foreground" />
                  <span>{file.name}</span>
                  <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(2)} KB)</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeNewFile(index)}>
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};