import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const { data: chunkData, chunkSize = 100, chunkIndex = 0 } = await req.json();
    console.log(`Edge Function: Processing chunk ${chunkIndex + 1} with ${chunkData.length} records.`);
    console.log('Edge Function: Received chunk data sample (first 2 rows):', chunkData.slice(0, 2));

    if (!chunkData || chunkData.length === 0) {
      return new Response(JSON.stringify({ error: 'No data found in the request body for this chunk' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const processedRecords: any[] = [];
    const clientIdsInChunk: string[] = [];
    const excelErrors: { row: number; message: string }[] = [];

    for (let i = 0; i < chunkData.length; i++) {
      const row = chunkData[i];
      const globalRowIndex = (chunkIndex * chunkSize) + i + 1; 

      try {
        const client_id = row['كود المخبز']?.toString().trim();
        const client_name = row['اسم المخبز']?.toString().trim();
        const raw_new_quota_value = row['NEW_AVG_'];
        const raw_quota_date = row['TRUNC_A_OPE_DATE_'];
        const discount_type = row['discount_type']?.toString().trim() || null;
        const notes = row['ملاحظات']?.toString().trim() || null; // Assuming 'ملاحظات' column

        if (!client_id || !client_name) {
          excelErrors.push({ row: globalRowIndex, message: 'كود المخبز أو اسم المخبز مفقود.' });
          continue;
        }

        let quota_value: number;
        if (raw_new_quota_value === undefined || raw_new_quota_value === null || isNaN(parseFloat(raw_new_quota_value))) {
          quota_value = 0; // Default to 0 if not a valid number
          excelErrors.push({ row: globalRowIndex, message: `قيمة الحصة (NEW_AVG_) غير صالحة، تم تعيينها إلى 0.` });
        } else {
          quota_value = parseFloat(raw_new_quota_value);
        }

        let quota_date: string;
        if (raw_quota_date) {
          let parsedDate: Date;
          if (typeof raw_quota_date === 'number') {
            // Excel date number (days since 1900-01-01, with 1900-02-29 bug)
            const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Dec 30, 1899 is day 0 in Excel
            parsedDate = new Date(excelEpoch.getTime() + raw_quota_date * 24 * 60 * 60 * 1000);
          } else {
            // Try parsing as string
            parsedDate = new Date(raw_quota_date);
          }

          if (isNaN(parsedDate.getTime())) {
            quota_date = new Date().toISOString().split('T')[0]; // Default to today
            excelErrors.push({ row: globalRowIndex, message: `تاريخ الحصة (TRUNC_A_OPE_DATE_) غير صالح، تم تعيينه إلى تاريخ اليوم.` });
          } else {
            quota_date = parsedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          }
        } else {
          quota_date = new Date().toISOString().split('T')[0]; // Default to today
          excelErrors.push({ row: globalRowIndex, message: `تاريخ الحصة (TRUNC_A_OPE_DATE_) مفقود، تم تعيينه إلى تاريخ اليوم.` });
        }

        processedRecords.push({
          client_id,
          client_name,
          quota_value,
          quota_date,
          notes,
          discount_type,
          updated_at: new Date().toISOString(),
          original_row_index: globalRowIndex, // Keep original row index for error reporting
        });
        clientIdsInChunk.push(client_id);

      } catch (error: any) {
        console.error(`Edge Function: Error processing row ${globalRowIndex}:`, error);
        excelErrors.push({ row: globalRowIndex, message: `خطأ في معالجة الصف: ${error.message || 'خطأ غير معروف'}` });
      }
    }

    if (processedRecords.length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'No valid records could be parsed from this chunk.',
        errors: excelErrors 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Fetch existing quotas for the client_ids in this chunk
    const { data: existingQuotas, error: fetchError } = await supabaseAdmin
      .from('bakery_quotas')
      .select('id, client_id, quota_value, quota_date')
      .in('client_id', clientIdsInChunk);

    if (fetchError) {
      console.error('Edge Function: Error fetching existing quotas for chunk:', fetchError);
      throw new Error(`فشل في جلب البيانات الحالية: ${fetchError.message}`);
    }

    const existingQuotaMap = new Map<string, { id: string; quota_value: number; quota_date: string }>();
    existingQuotas?.forEach(q => existingQuotaMap.set(q.client_id, { id: q.id, quota_value: q.quota_value, quota_date: q.quota_date }));

    const quotasToUpsert: any[] = [];
    const historyToInsert: any[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (const record of processedRecords) {
      const existingQuota = existingQuotaMap.get(record.client_id);
      const currentTimestamp = new Date().toISOString();

      if (existingQuota) {
        // Update existing record
        quotasToUpsert.push({ 
          id: existingQuota.id, // Include ID for update
          client_id: record.client_id,
          client_name: record.client_name,
          quota_value: record.quota_value,
          quota_date: record.quota_date,
          notes: record.notes,
          discount_type: record.discount_type,
          updated_at: currentTimestamp,
        });
        updatedCount++;

        // Only add history if quota_value or quota_date has changed
        if (existingQuota.quota_value !== record.quota_value || existingQuota.quota_date !== record.quota_date) {
          historyToInsert.push({
            quota_id: existingQuota.id,
            user_id: userId,
            change_description: `تم تحديث الحصة. القيمة من ${existingQuota.quota_value} إلى ${record.quota_value}. التاريخ من ${existingQuota.quota_date} إلى ${record.quota_date}.`,
            old_quota_value: existingQuota.quota_value,
            new_quota_value: record.quota_value,
            changed_at: currentTimestamp,
            notes: record.notes,
            trunc_a_ope_date_: record.quota_date,
          });
        }
      } else {
        // Create new record
        quotasToUpsert.push({
          client_id: record.client_id,
          client_name: record.client_name,
          quota_value: record.quota_value,
          quota_date: record.quota_date,
          notes: record.notes,
          discount_type: record.discount_type,
          created_at: currentTimestamp,
          updated_at: currentTimestamp,
        });
        createdCount++;
        // History for new quotas will be linked after upsert returns IDs
        historyToInsert.push({
          client_id: record.client_id, // Temporarily store client_id to link history later
          quota_id: null, // Will be filled after upsert
          user_id: userId,
          change_description: `تم إنشاء حصة تأمينية جديدة بقيمة ${record.quota_value} وتاريخ ${record.quota_date}.`,
          old_quota_value: null,
          new_quota_value: record.quota_value,
          changed_at: currentTimestamp,
          notes: record.notes,
          trunc_a_ope_date_: record.quota_date,
        });
      }
    }

    console.log(`Edge Function: Upserting ${quotasToUpsert.length} records (Created: ${createdCount}, Updated: ${updatedCount}).`);

    // Perform upsert operation
    const { data: upsertedQuotas, error: upsertError } = await supabaseAdmin
      .from('bakery_quotas')
      .upsert(quotasToUpsert, { onConflict: 'client_id', ignoreDuplicates: false })
      .select('id, client_id'); // Select ID and client_id to link history

    if (upsertError) {
      console.error('Edge Function: Upsert operation failed:', upsertError);
      throw new Error(`فشل في تحديث/إنشاء بيانات المخابز: ${upsertError.message}`);
    }

    // Link history entries to newly created quota IDs
    upsertedQuotas?.forEach(upserted => {
      const historyEntry = historyToInsert.find(h => h.client_id === upserted.client_id && h.quota_id === null);
      if (historyEntry) {
        historyEntry.quota_id = upserted.id;
        delete historyEntry.client_id; // Remove temporary client_id
      }
    });

    const validHistoryEntries = historyToInsert.filter(entry => entry.quota_id !== null);

    if (validHistoryEntries.length > 0) {
      console.log(`Edge Function: Inserting ${validHistoryEntries.length} history entries.`);
      const { error: historyInsertError } = await supabaseAdmin
        .from('bakery_quota_history')
        .insert(validHistoryEntries);

      if (historyInsertError) {
        console.error('Edge Function: History insert error:', historyInsertError);
        // Add history errors to the overall errors, but don't fail the whole chunk
        excelErrors.push({ row: 0, message: `خطأ في تسجيل سجل التغييرات: ${historyInsertError.message}` });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      created: createdCount,
      updated: updatedCount,
      errors: excelErrors, // Return all collected errors for this chunk
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function: Uncaught error in import-bakery-quotas edge function:', error);
    return new Response(JSON.stringify({ error: error.message || 'حدث خطأ غير متوقع أثناء الاستيراد.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});