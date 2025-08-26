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

    const results = {
      total: data.length,
      processed: 0,
      errors: [] as string[],
    };

    for (const row of data) {
      try {
        const client_id = row['BAKERY_CODE']?.toString().trim() || '';
        const client_name = row['BAKERY_NAME']?.toString().trim() || '';
        const old_quota_value = parseFloat(row['OLD_AVG_']?.toString() || '0');
        const new_quota_value = parseFloat(row['NEW_AVG_']?.toString() || '0');
        const raw_quota_date = row['TRUNC_A_OPE_DATE_'];
        let quota_date: string;

        if (raw_quota_date) {
          if (typeof raw_quota_date === 'number') {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const date = new Date(excelEpoch.getTime() + raw_quota_date * 24 * 60 * 60 * 1000);
            quota_date = date.toISOString();
          } else {
            const parsedDate = new Date(raw_quota_date);
            quota_date = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date().toISOString();
          }
        } else {
          quota_date = new Date().toISOString();
        }

        const notes = `Supply: ${row['SUPPLY_NAME']?.toString() || ''}, Sub-dept: ${row['SUPPLY_SUB_DEPT_NAME']?.toString() || ''}`;

        if (!client_id || !client_name) {
          results.errors.push(`Skipping row with missing data: ${JSON.stringify(row)}`);
          continue;
        }

        // Upsert the main bakery record to keep it up-to-date
        const { data: bakery, error: upsertError } = await supabaseAdmin
          .from('bakery_quotas')
          .upsert(
            {
              client_id: client_id,
              client_name: client_name,
              quota_value: new_quota_value,
              quota_date: quota_date.split('T')[0],
              notes: `Last updated from Excel import.`,
            },
            { onConflict: 'client_id' }
          )
          .select()
          .single();

        if (upsertError) throw upsertError;

        // Always insert a new record into the history table for each row in Excel
        const { error: historyError } = await supabaseAdmin
          .from('bakery_quota_history')
          .insert({
            quota_id: bakery.id,
            user_id: userId,
            change_description: `تم تغيير الحصة من ${old_quota_value} إلى ${new_quota_value}`,
            old_quota_value: old_quota_value,
            new_quota_value: new_quota_value,
            changed_at: quota_date, // Use the date from Excel as the change date
          });

        if (historyError) {
          console.error(`Error logging history for client ${client_id}:`, historyError);
        }
        
        results.processed++;
      } catch (error: any) {
        console.error('Error processing row:', error);
        results.errors.push(`Error processing row ${JSON.stringify(row)}: ${error.message || error}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in import-bakery-quotas edge function:', error);
    return new Response(JSON.stringify({ error: error.message || error }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});