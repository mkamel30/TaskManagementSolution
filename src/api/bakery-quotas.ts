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
      // Use a direct SQL query instead of the RPC function
      const { data, error } = await supabase
        .from('bakery_quotas')
        .select('*')
        .order('client_id', { ascending: false })
        .order('updated_at', { ascending: false });

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
        .order('updated_at', { ascending: false }) // Order by updated_at to get the truly latest record
        .order('id', { ascending: false }) // Tie-breaker: get the one created later
        .limit(1)
        .single(); // Expecting at most one result

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
        console.error('Error fetching bakery quota by client ID:', error);
        throw error;
      }

      return data as BakeryQuota | null;
    };

    // Rest of the code remains the same...