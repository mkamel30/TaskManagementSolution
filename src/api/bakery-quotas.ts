import { supabase } from "@/integrations/supabase/client";

export type BakeryQuota = {
  id: string;
  client_id: string;
  client_name: string;
  quota_value: number;
  quota_date: string;
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
  changed_at: string;
  user_email?: string;
  notes?: string; // Added notes field
};

export const getBakeryQuotas = async (): Promise<BakeryQuota[]> => {
  // Use the new RPC function to get only the latest quota for each client
  // The function now uses ORDER BY client_id, updated_at DESC, id DESC
  // to ensure the most recently updated record is selected.
  const { data, error } = await supabase.rpc('get_latest_bakery_quotas_per_client');

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
    .order('id', { ascending: false }) // Tie-breaker: get the one created later
    .limit(1)
    .single(); // Expecting at most one result

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

  // The RPC function already returns user_email and notes, so no need for client-side mapping
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

  // Log history
  const { error: historyError } = await supabase.from('bakery_quota_history').insert({
    quota_id: data.id,
    user_id: user.id,
    change_description: 'تم إنشاء حصة تأمينية جديدة.',
    new_quota_value: quota.quota_value,
    notes: quota.notes, // Include notes from the new quota
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

  // Log history after successful update
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
      notes: updates.notes || existingQuotaData.notes, // Include notes from updates or existing
    });

    if (historyError) {
      console.error('Error creating bakery quota history:', historyError);
    }
  }

  return data as BakeryQuota;
};

export const deleteBakeryQuota = async (id: string) => {
  // Fetch the history for this quota to determine if we should revert or fully delete
  const history = await getBakeryQuotaHistory(id);

  if (history.length > 1) {
    // If there's more than one history entry, revert to the previous state
    const secondLastEntry = history[1]; // The entry before the most recent one
    const previousQuotaValue = secondLastEntry.new_quota_value;

    if (previousQuotaValue !== undefined && previousQuotaValue !== null) {
      // Update the main bakery_quotas record with the previous value
      const { error: updateError } = await supabase
        .from('bakery_quotas')
        .update({ quota_value: previousQuotaValue, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) {
        console.error('Error reverting bakery quota:', updateError);
        throw updateError;
      }

      // Delete only the most recent history entry (the one being "undone")
      const { error: deleteHistoryError } = await supabase
        .from('bakery_quota_history')
        .delete()
        .eq('id', history[0].id); // history[0] is the most recent entry

      if (deleteHistoryError) {
        console.error('Error deleting most recent history entry:', deleteHistoryError);
        // Don't throw, as the main quota was reverted successfully
      }
    } else {
      // If previousQuotaValue is somehow null/undefined, proceed with full delete
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
    // If there's only one or no history entries, perform a full delete of the quota
    // The ON DELETE CASCADE will handle deleting the single history entry if it exists
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

  // Use the correct function name without the full URL
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
    .eq('user_id', user.id) // Ensure only the user who created it can update
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
    .eq('user_id', user.id); // Ensure only the user who created it can delete

  if (error) {
    console.error('Error deleting bakery quota history entry:', error);
    throw error;
  }
};