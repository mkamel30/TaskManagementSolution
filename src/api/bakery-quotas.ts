import { supabase } from "@/integrations/supabase/client";

export type BakeryQuota = {
  id: string;
  client_id: string;
  client_name: string;
  quota_value: number;
  quota_date: string;
  notes?: string;
  discount_type?: string;
  created_at: string;
  updated_at: string;
  operation_date?: string; // Added operation_date
};

export type BakeryQuotaHistoryEntry = {
  id: string;
  quota_id: string;
  user_id: string;
  change_description: string;
  old_quota_value?: number;
  new_quota_value?: number;
  changed_at: string;
  user_email?: string;
  notes?: string;
  trunc_a_ope_date_?: string; // Added for history tracking
};

export const getBakeryQuotas = async (): Promise<BakeryQuota[]> => {
  const { data, error } = await supabase.rpc('get_bakery_quotas_with_operation_date');

  if (error) {
    console.error('Error fetching bakery quotas:', error);
    throw error;
  }

  return data as BakeryQuota[];
};

export const getBakeryQuotaByClientId = async (clientId: string): Promise<BakeryQuota | null> => {
  const { data, error } = await supabase
    .from('bakery_quotas')
    .select('*')
    .eq('client_id', clientId)
    .order('quota_date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching bakery quota by client ID:', error);
    throw error;
  }

  return data as BakeryQuota | null;
};

export const getBakeryQuotaHistory = async (quotaId: string): Promise<BakeryQuotaHistoryEntry[]> => {
  const { data, error } = await supabase.rpc('get_bakery_quota_history_with_user', {
    p_quota_id: quotaId,
  }).limit(null);

  if (error) {
    console.error('Error fetching bakery quota history:', error);
    throw error;
  }

  return data || [];
};

export const createBakeryQuota = async (quota: Omit<BakeryQuota, 'id' | 'created_at' | 'updated_at' | 'operation_date'>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from('bakery_quotas')
    .insert(quota)
    .select()
    .single();

  if (error) {
    console.error('Error creating bakery quota:', error);
    throw error;
  }

  const { error: historyError } = await supabase.from('bakery_quota_history').insert({
    quota_id: data.id,
    user_id: user.id,
    change_description: `تم إنشاء حصة تأمينية جديدة بقيمة ${quota.quota_value} وتاريخ ${new Date(quota.quota_date).toLocaleDateString('ar-EG')}.`,
    new_quota_value: quota.quota_value,
    notes: quota.notes,
    changed_at: new Date().toISOString(),
    trunc_a_ope_date_: quota.quota_date, // Store the quota_date as operation date in history
  });

  if (historyError) {
    console.error('Error creating bakery quota history:', historyError);
  }

  return data as BakeryQuota;
};

export const updateBakeryQuota = async (id: string, updates: Partial<BakeryQuota>) => {
  const { data: existingQuotaData, error: fetchError } = await supabase
    .from('bakery_quotas')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existingQuotaData) {
    console.error('Error fetching bakery quota before update:', fetchError);
    throw fetchError || new Error('Bakery quota not found');
  }

  const { data, error } = await supabase
    .from('bakery_quotas')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating bakery quota:', error);
    throw error;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    let description = 'تم تحديث تفاصيل الحصة التأمينية.';
    let oldQuotaValue = existingQuotaData.quota_value;
    let newQuotaValue = updates.quota_value !== undefined ? updates.quota_value : existingQuotaData.quota_value;
    let oldQuotaDate = existingQuotaData.quota_date;
    let newQuotaDate = updates.quota_date !== undefined ? updates.quota_date : existingQuotaData.quota_date;

    if (updates.quota_value !== undefined && updates.quota_value !== existingQuotaData.quota_value &&
        updates.quota_date !== undefined && updates.quota_date !== existingQuotaData.quota_date) {
      description = `تم تغيير القيمة من ${oldQuotaValue} إلى ${newQuotaValue} والتاريخ من ${new Date(oldQuotaDate).toLocaleDateString('ar-EG')} إلى ${new Date(newQuotaDate).toLocaleDateString('ar-EG')}.`;
    } else if (updates.quota_value !== undefined && updates.quota_value !== existingQuotaData.quota_value) {
      description = `تم تغيير القيمة من ${oldQuotaValue} إلى ${newQuotaValue}.`;
    } else if (updates.quota_date !== undefined && updates.quota_date !== existingQuotaData.quota_date) {
      description = `تم تغيير التاريخ من ${new Date(oldQuotaDate).toLocaleDateString('ar-EG')} إلى ${new Date(newQuotaDate).toLocaleDateString('ar-EG')}.`;
    }
    
    const { error: historyError } = await supabase.from('bakery_quota_history').insert({
      quota_id: id,
      user_id: user.id,
      change_description: description,
      old_quota_value: oldQuotaValue,
      new_quota_value: newQuotaValue,
      notes: updates.notes || existingQuotaData.notes,
      changed_at: new Date().toISOString(),
      trunc_a_ope_date_: newQuotaDate, // Store the new quota_date as operation date in history
    });

    if (historyError) {
      console.error('Error creating bakery quota history:', historyError);
    }
  }

  return data as BakeryQuota;
};

export const deleteBakeryQuota = async (id: string) => {
  const history = await getBakeryQuotaHistory(id);

  if (history.length > 1) {
    const secondLastEntry = history[1];
    const previousQuotaValue = secondLastEntry.new_quota_value;
    const previousQuotaDate = secondLastEntry.trunc_a_ope_date_; // Get previous date from history

    if (previousQuotaValue !== undefined && previousQuotaValue !== null && previousQuotaDate) {
      const { error: updateError } = await supabase
        .from('bakery_quotas')
        .update({ 
          quota_value: previousQuotaValue, 
          quota_date: previousQuotaDate, // Revert date as well
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error reverting bakery quota:', updateError);
        throw updateError;
      }

      const { error: deleteHistoryError } = await supabase
        .from('bakery_quota_history')
        .delete()
        .eq('id', history[0].id);

      if (deleteHistoryError) {
        console.error('Error deleting most recent history entry:', deleteHistoryError);
      }
    } else {
      console.warn('Previous quota value or date not found in history, performing full delete.');
      const { error } = await supabase
        .from('bakery_quotas')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting bakery quota:', error);
        throw error;
      }
    }
  } else {
    const { error } = await supabase
      .from('bakery_quotas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting bakery quota:', error);
      throw error;
    }
  }
};

export const importBakeryQuotasFromExcel = async (excelData: any[], onProgress?: (progress: number) => void) => {
  const CHUNK_SIZE = 20; // Reduced chunk size to make each Edge Function call lighter
  let totalProcessed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let allErrors: { row: number; message: string }[] = [];

  const totalChunks = Math.ceil(excelData.length / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const chunkIndex = i;
    const startIndex = chunkIndex * CHUNK_SIZE;
    const chunkToSend = excelData.slice(startIndex, startIndex + CHUNK_SIZE);

    console.log(`Client: Sending chunk ${chunkIndex + 1}/${totalChunks} (records ${startIndex + 1}-${startIndex + chunkToSend.length})`);

    const { data, error } = await supabase.functions.invoke('import-bakery-quotas', {
      body: { 
        data: chunkToSend,
        chunkSize: CHUNK_SIZE, 
        chunkIndex 
      },
    });

    if (error) {
      console.error(`Client: Error invoking edge function for chunk ${chunkIndex + 1}:`, error);
      throw new Error(`فشل في معالجة الجزء ${chunkIndex + 1}: ${error.message}`);
    }

    if (data.success) {
      totalProcessed += chunkToSend.length;
      totalCreated += data.created;
      totalUpdated += data.updated;
      allErrors = [...allErrors, ...data.errors];
      
      const progress = (totalProcessed / excelData.length) * 100;
      if (onProgress) {
        onProgress(progress);
      }
    } else {
      console.error(`Client: Edge function reported error for chunk ${chunkIndex + 1}:`, data.error);
      allErrors = [...allErrors, ...data.errors];
      throw new Error(data.error || `حدث خطأ غير معروف أثناء معالجة الجزء ${chunkIndex + 1}.`);
    }
  }

  return {
    total: excelData.length,
    processed: totalProcessed,
    created: totalCreated,
    updated: totalUpdated,
    errors: allErrors,
  };
};

export const updateBakeryQuotaHistoryEntry = async (
  historyId: string,
  updates: { change_description?: string; notes?: string }
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from('bakery_quota_history')
    .update(updates)
    .eq('id', historyId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating bakery quota history entry:', error);
    throw error;
  }
  return data;
};

export const deleteBakeryQuotaHistoryEntry = async (historyId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from('bakery_quota_history')
    .delete()
    .eq('id', historyId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting bakery quota history entry:', error);
    throw error;
  }
};