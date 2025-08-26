import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const userId = user.id;

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'File is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = worksheet ? (worksheet['!ref'] ? XLSX.utils.sheet_to_json(worksheet) : []) : [];

    if (data.length === 0) {
      return new Response(JSON.stringify({ error: 'No data found in the Excel file' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const quotasToUpsert: any[] = [];
    const historyToInsert: any[] = [];
    const errors: string[] = [];

    for (const row of data) {
      try {
        const client_id = row['BAKERY_CODE']?.toString().trim();
        const client_name = row['BAKERY_NAME']?.toString().trim();
        const old_quota_value = parseFloat(row['OLD_AVG_']?.toString() || '0');
        const new_quota_value = parseFloat(row['NEW_AVG_']?.toString() || '0');
        const raw_quota_date = row['TRUNC_A_OPE_DATE_'];
        
        let quota_date: string;
        if (raw_quota_date) {
          if (typeof raw_quota_date === 'number') {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const date = new Date(excelEpoch.getTime() + raw_quota_date * 24 * 60 * 60 * 1000);
            quota_date = date.toISOString().split('T')[0];
          } else {
            const parsedDate = new Date(raw_quota_date);
            if (!isNaN(parsedDate.getTime())) {
              quota_date = parsedDate.toISOString().split('T')[0];
            } else {
              quota_date = new Date().toISOString().split('T')[0];
            }
          }
        } else {
          quota_date = new Date().toISOString().split('T')[0];
        }

        const notes = `Supply: ${row['SUPPLY_NAME']?.toString() || ''}, Sub-dept: ${row['SUPPLY_SUB_DEPT_NAME']?.toString() || ''}`;

        if (!client_id || !client_name) {
          errors.push(`Skipping row with missing client_id or client_name: ${JSON.stringify(row)}`);
          continue;
        }

        quotasToUpsert.push({
          client_id: client_id,
          client_name: client_name,
          quota_value: new_quota_value,
          quota_date: quota_date,
          notes: `Last updated from Excel import.`,
          updated_at: new Date().toISOString(), // Ensure updated_at is set
        });

        // Store history data temporarily, will link quota_id after upsert
        historyToInsert.push({
          client_id: client_id, // Use client_id temporarily to link later
          user_id: userId,
          change_description: `تم تغيير الحصة من ${old_quota_value} إلى ${new_quota_value}`,
          old_quota_value: old_quota_value,
          new_quota_value: new_quota_value,
          changed_at: quota_date, // Use quota_date for changed_at
          notes: notes,
          trunc_a_ope_date_: quota_date, // Also set this column
        });

      } catch (error: any) {
        console.error('Error processing row for batch:', error);
        errors.push(`Error preparing row ${JSON.stringify(row)}: ${error.message || error}`);
      }
    }

    // Perform batch upsert for bakery_quotas
    const { data: upsertedBakeries, error: upsertError } = await supabaseAdmin
      .from('bakery_quotas')
      .upsert(quotasToUpsert, { onConflict: 'client_id' })
      .select('id, client_id, quota_value'); // Select id and the new quota_value

    if (upsertError) {
      console.error('Batch upsert error:', upsertError);
      throw new Error(`Failed to upsert bakery quotas: ${upsertError.message}`);
    }

    const bakeryIdMap = new Map<string, { id: string, new_quota_value: number }>();
    upsertedBakeries.forEach(b => bakeryIdMap.set(b.client_id, { id: b.id, new_quota_value: b.quota_value }));

    // Now, link quota_id to history entries and perform batch insert
    const finalHistoryEntries = historyToInsert.map(entry => {
      const bakeryInfo = bakeryIdMap.get(entry.client_id);
      if (!bakeryInfo) {
        errors.push(`Could not find bakery ID for client_id: ${entry.client_id} during history creation.`);
        return null;
      }
      return {
        quota_id: bakeryInfo.id,
        user_id: entry.user_id,
        change_description: entry.change_description,
        old_quota_value: entry.old_quota_value,
        new_quota_value: entry.new_quota_value,
        changed_at: entry.changed_at,
        notes: entry.notes,
        trunc_a_ope_date_: entry.trunc_a_ope_date_,
      };
    }).filter(Boolean); // Remove any null entries if ID mapping failed

    if (finalHistoryEntries.length > 0) {
      const { error: historyInsertError } = await supabaseAdmin
        .from('bakery_quota_history')
        .insert(finalHistoryEntries);

      if (historyInsertError) {
        console.error('Batch history insert error:', historyInsertError);
        throw new Error(`Failed to insert bakery quota history: ${historyInsertError.message}`);
      }
    }

    return new Response(JSON.stringify({
      total: data.length,
      processed: finalHistoryEntries.length, // Number of history entries successfully inserted
      errors: errors,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in import-bakery-quotas edge function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred during import.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});