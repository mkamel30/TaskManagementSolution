import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const allowedOrigins = [
  'https://task-management-solution.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174'
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : 'https://task-management-solution.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Edge Function: import-bakery-quotas invoked.');

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Edge Function: Authorization header missing.');
      return new Response(JSON.stringify({ error: 'Authorization header is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      console.error('Edge Function: Error getting user or user not found:', userError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const userId = user.id;
    console.log(`Edge Function: User ${userId} authenticated.`);

    const { data: excelDataChunk } = await req.json();
    console.log(`Edge Function: Received chunk with ${excelDataChunk.length} rows.`);

    if (!excelDataChunk || excelDataChunk.length === 0) {
      console.warn('Edge Function: No data found in the request body chunk.');
      return new Response(JSON.stringify({ error: 'No data found in the request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const latestQuotasMap = new Map<string, any>();
    const historyToInsert: any[] = [];
    const errors: string[] = [];
    let processedRowsInChunk = 0;

    for (const row of excelDataChunk) {
      try {
        const client_id = row['BAKERY_CODE']?.toString().trim();
        const client_name = row['BAKERY_NAME']?.toString().trim();
        const old_quota_value = parseFloat(row['OLD_AVG_']?.toString() || '0');
        const new_quota_value = parseFloat(row['NEW_AVG_']?.toString() || '0');
        const raw_quota_date = row['TRUNC_A_OPE_DATE_'];
        const discount_type = row['discount_type']?.toString().trim() || null;

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

        const notes = null;

        if (!client_id || !client_name) {
          errors.push(`Skipping row with missing client_id or client_name: ${JSON.stringify(row)}`);
          continue;
        }

        latestQuotasMap.set(client_id, {
          client_id: client_id,
          client_name: client_name,
          quota_value: new_quota_value,
          quota_date: quota_date,
          notes: notes,
          discount_type: discount_type,
          updated_at: new Date().toISOString(),
        });

        historyToInsert.push({
          client_id: client_id,
          user_id: userId,
          change_description: `تم تغيير الحصة من ${old_quota_value} إلى ${new_quota_value}`,
          old_quota_value: old_quota_value,
          new_quota_value: new_quota_value,
          changed_at: quota_date,
          notes: notes,
          trunc_a_ope_date_: quota_date,
        });
        
        processedRowsInChunk++;

      } catch (error: any) {
        console.error('Edge Function: Error processing row for batch:', error);
        errors.push(`Error preparing row ${JSON.stringify(row)}: ${error.message || error}`);
      }
    }

    const quotasToUpsert = Array.from(latestQuotasMap.values());
    console.log(`Edge Function: Prepared ${quotasToUpsert.length} unique quotas for upsert and ${historyToInsert.length} history entries.`);

    const { data: upsertedBakeries, error: upsertError } = await supabaseAdmin
      .from('bakery_quotas')
      .upsert(quotasToUpsert, { onConflict: 'client_id' })
      .select('id, client_id, quota_value');

    if (upsertError) {
      console.error('Edge Function: Batch upsert error:', upsertError);
      throw new Error(`Failed to upsert bakery quotas: ${upsertError.message}`);
    }
    console.log(`Edge Function: Successfully upserted ${upsertedBakeries.length} bakery quotas.`);

    const bakeryIdMap = new Map<string, { id: string, new_quota_value: number }>();
    upsertedBakeries.forEach(b => bakeryIdMap.set(b.client_id, { id: b.id, new_quota_value: b.quota_value }));

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
    }).filter(Boolean);

    if (finalHistoryEntries.length > 0) {
      const { error: historyInsertError } = await supabaseAdmin
        .from('bakery_quota_history')
        .insert(finalHistoryEntries);

      if (historyInsertError) {
        console.error('Edge Function: Batch history insert error:', historyInsertError);
        throw new Error(`Failed to insert bakery quota history: ${historyInsertError.message}`);
      }
      console.log(`Edge Function: Successfully inserted ${finalHistoryEntries.length} history entries.`);
    }

    return new Response(JSON.stringify({
      processed: finalHistoryEntries.length,
      errors: errors,
      debugLogs: [
        `Processed ${processedRowsInChunk} rows from chunk.`,
        `Upserted ${upsertedBakeries.length} unique bakeries.`,
        `Inserted ${finalHistoryEntries.length} history records.`,
      ],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function: Error in import-bakery-quotas edge function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred during import.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});