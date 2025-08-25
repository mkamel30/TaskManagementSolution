import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { parse } from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'File is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the service role key to bypass RLS for this specific query
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse the Excel file
    const buffer = await file.arrayBuffer();
    const workbook = parse(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = worksheet ? worksheet['!ref'] ? workbook.utils.sheet_to_json(worksheet) : [] : [];

    if (data.length === 0) {
      return new Response(JSON.stringify({ error: 'No data found in the Excel file' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Process and insert data
    const results = {
      total: data.length,
      inserted: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const row of data) {
      try {
        const client_id = row['معرّ العميل'] || row['Client ID'] || '';
        const client_name = row['اسم العميل'] || row['Client Name'] || '';
        const quota_value = parseFloat(row['قيمة الحصة'] || row['Quota Value'] || '0');
        const quota_date = row['تاريخ الحصة'] || row['Quota Date'] || new Date().toISOString().split('T')[0];
        const notes = row['ملاحظات'] || row['Notes'] || '';

        if (!client_id || !client_name) {
          results.errors.push(`Skipping row with missing client ID or name: ${JSON.stringify(row)}`);
          continue;
        }

        // Check if quota already exists for this client
        const { data: existingQuota, error: fetchError } = await supabaseAdmin
          .from('bakery_quotas')
          .select('*')
          .eq('client_id', client_id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows returned
          throw fetchError;
        }

        if (existingQuota) {
          // Update existing quota
          const { error: updateError } = await supabaseAdmin
            .from('bakery_quotas')
            .update({
              client_name,
              quota_value,
              quota_date,
              notes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingQuota.id);

          if (updateError) throw updateError;
          results.updated++;
        } else {
          // Create new quota
          const { error: insertError } = await supabaseAdmin
            .from('bakery_quotas')
            .insert({
              client_id,
              client_name,
              quota_value,
              quota_date,
              notes,
            });

          if (insertError) throw insertError;
          results.inserted++;
        }
      } catch (error) {
        results.errors.push(`Error processing row ${JSON.stringify(row)}: ${error.message}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in import-bakery-quotas edge function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});