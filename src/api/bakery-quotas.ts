import { supabase } from "@/integrations/supabase/client";

// ... (keep existing types and other functions)

export interface ChunkProgress {
  processedRows: number;
  processedBakeries: number;
  currentChunk: number;
  totalChunks: number;
  errors: string[];
}

export const importBakeryQuotasFromExcel = async (
  excelData: any[], 
  onProgress?: (progress: ChunkProgress) => void
): Promise<{ total: number; processed: number; errors: string[] }> => {
  let totalProcessed = 0;
  let allErrors: string[] = [];
  const CHUNK_SIZE = 100;
  const totalChunks = Math.ceil(excelData.length / CHUNK_SIZE);

  for (let i = 0; i < excelData.length; i += CHUNK_SIZE) {
    const chunk = excelData.slice(i, i + CHUNK_SIZE);
    const currentChunk = Math.floor(i / CHUNK_SIZE) + 1;
    
    if (onProgress) {
      onProgress({
        processedRows: i,
        processedBakeries: totalProcessed,
        currentChunk,
        totalChunks,
        errors: allErrors,
      });
    }

    try {
      const { data, error } = await supabase.functions.invoke('import-bakery-quotas', {
        body: { data: chunk },
      });

      if (error) {
        console.error(`Error importing chunk ${currentChunk}:`, error);
        allErrors.push(`Error processing chunk ${currentChunk}: ${error.message}`);
      } else if (data) {
        totalProcessed += data.processed;
        if (data.errors && data.errors.length > 0) {
          allErrors = allErrors.concat(data.errors);
        }
      }
    } catch (e: any) {
      console.error(`Exception during chunk import ${currentChunk}:`, e);
      allErrors.push(`Exception processing chunk ${currentChunk}: ${e.message || 'Unknown error'}`);
    }
    
    if (onProgress) {
      onProgress({
        processedRows: Math.min(i + chunk.length, excelData.length),
        processedBakeries: totalProcessed,
        currentChunk,
        totalChunks,
        errors: allErrors,
      });
    }
  }

  return {
    total: excelData.length,
    processed: totalProcessed,
    errors: allErrors,
  };
};