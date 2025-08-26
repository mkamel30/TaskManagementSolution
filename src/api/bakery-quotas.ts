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
};

export const getBakeryQuotas = async (): Promise<BakeryQuota[]> => {
  const { data, error } = await supabase
    .from('bakery_quotas')
    .select('*')
    .order('created_at', { ascending: false });

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

  // The RPC function already returns user_email, so no need for client-side mapping
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
    });

    if (historyError) {
      console.error('Error creating bakery quota history:', historyError);
    }
  }

  return data as BakeryQuota;
};

export const deleteBakeryQuota = async (id: string) => {
  const { error } = await supabase
    .from('bakery_quotas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting bakery quota:', error);
    throw error;
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