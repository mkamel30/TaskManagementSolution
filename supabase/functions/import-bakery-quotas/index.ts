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

    let insertedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

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

        if (!client_id || !client_name) {
          errors.push(`Skipping row with missing data: ${JSON.stringify(row)}`);
          continue;
        }

        // Check if bakery already exists
        const { data: existingBakery, error: selectError } = await supabaseAdmin
          .from('bakery_quotas')
          .select('id, quota_value')
          .eq('client_id', client_id)
          .single();

        let bakeryId: string;
        let changeDescription: string;

        if (existingBakery) {
          // Update existing bakery
          const { data: updatedBakery, error: updateError } = await supabaseAdmin
            .from('bakery_quotas')
            .update({
              client_name: client_name,
              quota_value: new_quota_value,
              quota_date: quota_date.split('T')[0],
              notes: `Last updated from Excel import.`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingBakery.id)
            .select()
            .single();

          if (updateError) throw updateError;
          bakeryId = updatedBakery.id;
          updatedCount++;
          changeDescription = `تم تحديث الحصة من ${existingBakery.quota_value} إلى ${new_quota_value}`;
        } else {
          // Insert new bakery
          const { data: newBakery, error: insertError } = await supabaseAdmin
            .from('bakery_quotas')
            .insert({
              client_id: client_id,
              client_name: client_name,
              quota_value: new_quota_value,
              quota_date: quota_date.split('T')[0],
              notes: `Imported from Excel.`,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          bakeryId = newBakery.id;
          insertedCount++;
          changeDescription = `تم إنشاء حصة تأمينية جديدة بقيمة ${new_quota_value}`;
        }

        // Always insert a new record into the history table for each row in Excel
        const { error: historyError } = await supabaseAdmin
          .from('bakery_quota_history')
          .insert({
            quota_id: bakeryId,
            user_id: userId,
            change_description: changeDescription,
            old_quota_value: old_quota_value,
            new_quota_value: new_quota_value,
            changed_at: quota_date, // Use the date from Excel as the change date
            notes: `Supply: ${row['SUPPLY_NAME']?.toString() || ''}, Sub-dept: ${row['SUPPLY_SUB_DEPT_NAME']?.toString() || ''}`,
          });

        if (historyError) {
          console.error(`Error logging history for client ${client_id}:`, historyError);
        }
        
      } catch (error: any) {
        console.error('Error processing row:', error);
        errors.push(`Error processing row ${JSON.stringify(row)}: ${error.message || error}`);
      }
    }

    return new Response(JSON.stringify({ inserted: insertedCount, updated: updatedCount, errors: errors }), {
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