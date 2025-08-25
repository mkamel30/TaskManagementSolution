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
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'File is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = worksheet ? worksheet['!ref'] ? XLSX.utils.sheet_to_json(worksheet) : [] : [];

    if (data.length === 0) {
      return new Response(JSON.stringify({ error: 'No data found in the Excel file' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('Excel headers:', Object.keys(data[0]));

    const results = {
      total: data.length,
      inserted: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const row of data) {
      console.log('Processing row:', row); // Log the raw row data
      try {
        const client_id = row['BAKERY_CODE']?.toString() || ''; // Ensure client_id is string
        const client_name = row['BAKERY_NAME']?.toString() || ''; // Ensure client_name is string
        const quota_value = parseFloat(row['NEW_AVG_']?.toString() || '0'); // Ensure value is string before parseFloat
        const raw_quota_date = row['TRUNC_A_OPE_DATE_'];
        let quota_date: string;

        // Attempt to parse date, fallback to current date if invalid
        if (raw_quota_date) {
          // Assuming raw_quota_date might be a number (Excel date) or a string
          if (typeof raw_quota_date === 'number') {
            // Excel dates are days since 1900-01-01 (or 1904-01-01 for Mac)
            // Adjust for Excel's epoch (1900-01-01) and potential leap year bug
            const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Dec 30, 1899
            const date = new Date(excelEpoch.getTime() + raw_quota_date * 24 * 60 * 60 * 1000);
            quota_date = date.toISOString().split('T')[0];
          } else {
            // Try parsing as string, e.g., 'YYYY-MM-DD'
            const parsedDate = new Date(raw_quota_date);
            if (!isNaN(parsedDate.getTime())) {
              quota_date = parsedDate.toISOString().split('T')[0];
            } else {
              console.warn(`Invalid date format for TRUNC_A_OPE_DATE_: ${raw_quota_date}. Using current date.`);
              quota_date = new Date().toISOString().split('T')[0];
            }
          }
        } else {
          quota_date = new Date().toISOString().split('T')[0];
        }

        const notes = `Supply: ${row['SUPPLY_NAME']?.toString() || ''}, Sub-dept: ${row['SUPPLY_SUB_DEPT_NAME']?.toString() || ''}`;

        console.log(`Extracted: client_id=${client_id}, client_name=${client_name}, quota_value=${quota_value}, quota_date=${quota_date}, notes=${notes}`);

        if (!client_id || !client_name || !quota_date) {
          results.errors.push(`Skipping row with missing client ID, name, or quota date: ${JSON.stringify(row)}`);
          continue;
        }

        // Check for existing quota using both client_id and quota_date
        const { data: existingQuota, error: fetchError } = await supabaseAdmin
          .from('bakery_quotas')
          .select('*')
          .eq('client_id', client_id)
          .eq('quota_date', quota_date) // Add quota_date to the query
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means "No rows found"
          console.error('Error fetching existing quota:', fetchError);
          throw fetchError;
        }

        if (existingQuota) {
          console.log(`Existing quota found for client_id=${client_id}, quota_date=${quota_date}. Attempting to update:`, existingQuota.id);
          const { error: updateError } = await supabaseAdmin
            .from('bakery_quotas')
            .update({
              client_name,
              quota_value,
              notes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingQuota.id); // Update by ID

          if (updateError) {
            console.error('Error updating quota:', updateError);
            throw updateError;
          }
          results.updated++;
          console.log('Quota updated successfully.');
        } else {
          console.log(`No existing quota found for client_id=${client_id}, quota_date=${quota_date}. Attempting to insert new one.`);
          const { error: insertError } = await supabaseAdmin
            .from('bakery_quotas')
            .insert({
              client_id,
              client_name,
              quota_value,
              quota_date,
              notes,
            });

          if (insertError) {
            console.error('Error inserting new quota:', insertError);
            throw insertError;
          }
          results.inserted++;
          console.log('New quota inserted successfully.');
        }
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
    console.error('Error in import-bakery-quotas edge function (outer catch):', error);
    return new Response(JSON.stringify({ error: error.message || error }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});