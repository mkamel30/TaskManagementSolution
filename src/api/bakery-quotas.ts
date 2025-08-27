import { supabase } from "@/integrations/supabase/client";

export interface BakeryQuota {
  id: string;
  client_id: string;
  client_name: string;
  quota_value: number;
  quota_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  discount_type?: string;
}

export interface BakeryQuotaHistory {
  id: string;
  quota_id: string;
  user_id: string;
  change_description: string;
  old_quota_value?: number;
  new_quota_value?: number;
  changed_at: string;
  notes?: string;
  trunc_a_ope_date_?: string;
  user_email: string; // Added user_email
}

export interface ChunkProgress {
  processedRows: number;
  processedBakeries: number;
  currentChunk: number;
  totalChunks: number;
  errors: string[];
}

export type PaginatedBakeryQuotasResponse = {
  data: (BakeryQuota & { total_changes_count: number })[];
  count: number;
};

export const getPaginatedBakeryQuotas = async (
  page: number,
  itemsPerPage: number,
  searchQuery: string,
  sortBy: string,
  sortOrder: string
): Promise<PaginatedBakeryQuotasResponse> => {
  const { data, error } = await supabase.rpc('get_paginated_bakery_quotas', {
    page,
    items_per_page: itemsPerPage,
    search_query: searchQuery,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  if (error) {
    console.error('Error fetching paginated bakery quotas:', error);
    throw error;
  }

  // The RPC now returns a JSON object with 'data' and 'count'
  const response = data as { data: (BakeryQuota & { total_changes_count: number })[]; count: number };
  return {
    data: response.data || [],
    count: response.count || 0,
  };
};

export const getBakeryQuotaByClientId = async (clientId: string): Promise<BakeryQuota | null> => {
  const { data, error } = await supabase
    .from('bakery_quotas')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No record found
    }
    console.error('Error fetching bakery quota by client ID:', error);
    throw error;
  }

  return data as BakeryQuota;
};

export const getBakeryQuotaHistory = async (quotaId: string): Promise<BakeryQuotaHistory[]> => {
  const { data, error } = await supabase.rpc('get_bakery_quota_history_with_user', {
    p_quota_id: quotaId,
  });

  if (error) {
    console.error('Error fetching bakery quota history:', error);
    throw error;
  }

  return data || [];
};

export const createBakeryQuota = async (quota: Omit<BakeryQuota, 'id' | 'created_at' | 'updated_at'>): Promise<BakeryQuota> => {
  const { data, error } = await supabase
    .from('bakery_quotas')
    .insert(quota)
    .select()
    .single();

  if (error) {
    console.error('Error creating bakery quota:', error);
    throw error;
  }

  return data as BakeryQuota;
};

export const updateBakeryQuota = async (id: string, updates: Partial<BakeryQuota>): Promise<BakeryQuota> => {
  const { data, error } = await supabase
    .from('bakery_quotas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating bakery quota:', error);
    throw error;
  }

  return data as BakeryQuota;
};

export const deleteBakeryQuota = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('bakery_quotas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting bakery quota:', error);
    throw error;
  }
};

export const updateBakeryQuotaHistoryEntry = async (historyId: string, updates: Partial<BakeryQuotaHistory>): Promise<BakeryQuotaHistory> => {
  const { data, error } = await supabase
    .from('bakery_quota_history')
    .update(updates)
    .eq('id', historyId)
    .select()
    .single();

  if (error) {
    console.error('Error updating bakery quota history entry:', error);
    throw error;
  }

  return data as BakeryQuotaHistory;
};

export const deleteBakeryQuotaHistoryEntry = async (historyId: string): Promise<void> => {
  const { error } = await supabase
    .from('bakery_quota_history')
    .delete()
    .eq('id', historyId);

  if (error) {
    console.error('Error deleting bakery quota history entry:', error);
    throw error;
  }
};

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