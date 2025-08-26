import { supabase } from "@/integrations/supabase/client";

export type BakeryQuota = {
  id: string;
  client_id: string;
  client_name: string;
  quota_value: number;
  quota_date: string; // This will be stored as YYYY-MM-DD for database compatibility
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type BakeryQuotaHistoryEntry = {
  id: string;
  quota_id: string;
  user_id: string;
  change_description: string;
  old_quota_value?: number;
  new_quota_value?: number;
  changed_at: string; // This will be a full timestamp with time
  user_email?: string;
  notes?: string;
};

export const getBakeryQuotas = async (): Promise<BakeryQuota[]> => {
  const { data, error } = await supabase
    .from('bakery_quotas')
    .select('*')
    .order('quota_date', { ascending: false }); // Sort by quota_date descending

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
    .order('quota_date', { ascending: false }) // Get the latest by date
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
    console.error('Error fetching bakery quota by client ID:', error);
    throw error;
  }

  return data as BakeryQuota | null;
};

export const getBakeryQuotaHistory = async (quotaId: string): Promise<BakeryQuotaHistoryEntry[]> => {
  const { data, error } = await supabase.rpc('get_bakery_quota_history_with_user', {
    p_quota_id: quotaId,
  });

  if (error) {
    console.error('Error fetching bakery quota history:', error);
    throw error;
  }

  return data || [];
};

export const createBakeryQuota = async (quota: Omit<BakeryQuota, 'id' | 'created_at' | 'updated_at'>) => {
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

  // Log history with current timestamp
  const { error: historyError } = await supabase.from('bakery_quota_history').insert({
    quota_id: data.id,
    user_id: user.id,
    change_description: 'تم إنشاء حصة تأمينية جديدة.',
    new_quota_value: quota.quota_value,
    notes: quota.notes,
    changed_at: new Date().toISOString(), // Use current timestamp for changed_at
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

  // Log history after successful update with current timestamp
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    let description = 'تم تحديث تفاصيل الحصة التأمينية.';
    if (updates.quota_value && updates.quota_value !== existingQuotaData.quota_value) {
      description = `تم تغيير القيمة من ${existingQuotaData.quota_value} إلى ${updates.quota_value}.`;
    }
    
    const { error: historyError } = await supabase.from('bakery_quota_history').insert({
      quota_id: id,
      user_id: user.id,
      change_description: description,
      old_quota_value: existingQuotaData.quota_value,
      new_quota_value: updates.quota_value,
      notes: updates.notes || existingQuotaData.notes,
      changed_at: new Date().toISOString(), // Use current timestamp for changed_at
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

    if (previousQuotaValue !== undefined && previousQuotaValue !== null) {
      const { error: updateError } = await supabase
        .from('bakery_quotas')
        .update({ quota_value: previousQuotaValue, updated_at: new Date().toISOString() })
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
      console.warn('Previous quota value not found in history, performing full delete.');
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

export const importBakeryQuotasFromExcel = async (file: File) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const formData = new FormData();
  formData.append('file', file);

  const { data, error } = await supabase.functions.invoke('import-bakery-quotas', {
    body: formData,
  });

  if (error) {
    console.error('Error importing bakery quotas:', error);
    throw error;
  }

  return data;
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