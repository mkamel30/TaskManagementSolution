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

    // Receive the chunk data directly, as the client is already sending chunks
    const { data: chunkData, chunkSize = 100, chunkIndex = 0 } = await req.json();
    console.log(`Edge Function: Processing chunk ${chunkIndex + 1} with ${chunkData.length} records.`);

    if (!chunkData || chunkData.length === 0) {
      return new Response(JSON.stringify({ error: 'No data found in the request body for this chunk' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const finalQuotaMap = new Map<string, any>();
    const excelErrors: { row: number; message: string }[] = [];

    for (let i = 0; i < chunkData.length; i++) {
      const row = chunkData[i];
      // Calculate the actual row number in the full file for error reporting
      const globalRowIndex = (chunkIndex * chunkSize) + i + 1; 

      try {
        const client_id = row['كود المخبز']?.toString().trim();
        const client_name = row['اسم المخبز']?.toString().trim();
        const new_quota_value = parseFloat(row['NEW_AVG_'] || '0');
        const raw_quota_date = row['TRUNC_A_OPE_DATE_'];
        const discount_type = row['discount_type']?.toString().trim() || null;

        if (!client_id || !client_name) {
          excelErrors.push({ row: globalRowIndex, message: 'كود المخبز أو اسم المخبز مفقود' });
          continue;
        }

        let quota_date: string;
        if (raw_quota_date) {
          if (typeof raw_quota_date === 'number') {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const date = new Date(excelEpoch.getTime() + raw_quota_date * 24 * 60 * 60 * 1000);
            quota_date = date.toISOString().split('T')[0];
          } else {
            const parsedDate = new Date(raw_quota_date);
            quota_date = isNaN(parsedDate.getTime()) ? new Date().toISOString().split('T')[0] : parsedDate.toISOString().split('T')[0];
          }
        } else {
          quota_date = new Date().toISOString().split('T')[0];
        }

        finalQuotaMap.set(client_id, {
          client_id,
          client_name,
          quota_value: new_quota_value,
          quota_date,
          notes: null,
          discount_type,
          updated_at: new Date().toISOString(),
        });
      } catch (error: any) {
        excelErrors.push({ row: globalRowIndex, message: `خطأ في معالجة الصف: ${error.message || 'خطأ غير معروف'}` });
      }
    }

    if (finalQuotaMap.size === 0) {
      return new Response(JSON.stringify({ 
        error: 'No valid records could be parsed from this chunk.',
        errors: excelErrors 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Fetch existing data for the clients in this chunk
    const clientIdsInChunk = Array.from(finalQuotaMap.keys());
    const { data: existingQuotas, error: fetchError } = await supabaseAdmin
      .from('bakery_quotas')
      .select('id, client_id, quota_value, quota_date'); // Select 'id' to link history

    if (fetchError) {
      console.error('Edge Function: Error fetching existing quotas:', fetchError);
      throw new Error(`فشل في جلب البيانات الحالية: ${fetchError.message}`);
    }

    const existingQuotaMap = new Map<string, { id: string; quota_value: number; quota_date: string }>();
    existingQuotas?.forEach(q => existingQuotaMap.set(q.client_id, { id: q.id, quota_value: q.quota_value, quota_date: q.quota_date }));

    const quotasToCreate: any[] = [];
    const quotasToUpdate: any[] = [];
    const historyToInsert: any[] = [];

    finalQuotaMap.forEach((finalQuota, client_id) => {
      const existingQuota = existingQuotaMap.get(client_id);

      if (existingQuota) {
        if (existingQuota.quota_value !== finalQuota.quota_value || existingQuota.quota_date !== finalQuota.quota_date) {
          quotasToUpdate.push({ ...finalQuota, id: existingQuota.id }); // Include ID for update
          historyToInsert.push({
            quota_id: existingQuota.id, // Link to existing quota ID
            user_id: userId,
            change_description: `تم تغيير الحصة من ${existingQuota.quota_value} إلى ${finalQuota.quota_value}`,
            old_quota_value: existingQuota.quota_value,
            new_quota_value: finalQuota.quota_value,
            changed_at: finalQuota.quota_date,
            notes: finalQuota.notes,
            trunc_a_ope_date_: finalQuota.quota_date,
          });
        }
      } else {
        quotasToCreate.push(finalQuota);
        // History for new quotas will be linked after creation
        historyToInsert.push({
          client_id: finalQuota.client_id, // Temporarily store client_id to link history later
          quota_id: null, // Will be filled after insert
          user_id: userId,
          change_description: `تم إنشاء حصة تأمينية جديدة بقيمة ${finalQuota.quota_value}`,
          old_quota_value: null,
          new_quota_value: finalQuota.quota_value,
          changed_at: finalQuota.quota_date,
          notes: finalQuota.notes,
          trunc_a_ope_date_: finalQuota.quota_date,
        });
      }
    });

    console.log(`Edge Function: Ready to create ${quotasToCreate.length} and update ${quotasToUpdate.length} in this chunk.`);

    const allErrors: { row: number; message: string }[] = [...excelErrors];
    let createdCount = 0;
    let updatedCount = 0;

    // Process creations in smaller batches
    if (quotasToCreate.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < quotasToCreate.length; i += batchSize) {
        const batch = quotasToCreate.slice(i, i + batchSize);
        const { data: createdQuotas, error: createError } = await supabaseAdmin
          .from('bakery_quotas')
          .insert(batch)
          .select('id, client_id');

        if (createError) {
          console.error('Edge Function: Batch creation error:', createError);
          batch.forEach(quota => {
            allErrors.push({ row: 0, message: `فشل إنشاء سجل العميل ${quota.client_id}: ${createError.message}` });
          });
        } else {
          createdCount += createdQuotas?.length || 0;
          createdQuotas?.forEach(created => {
            // Link history entries to the newly created quota IDs
            const historyEntry = historyToInsert.find(h => h.client_id === created.client_id && h.quota_id === null);
            if (historyEntry) {
              historyEntry.quota_id = created.id;
              delete historyEntry.client_id; // Remove temporary client_id
            }
          });
        }
      }
    }

    // Process updates in smaller batches
    if (quotasToUpdate.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < quotasToUpdate.length; i += batchSize) {
        const batch = quotasToUpdate.slice(i, i + batchSize);
        const updatePromises = batch.map(async quota => {
          const { error: updateError } = await supabaseAdmin
            .from('bakery_quotas')
            .update({ ...quota, updated_at: new Date().toISOString() })
            .eq('id', quota.id); // Update by ID

          if (updateError) {
            console.error('Edge Function: Update error for client_id:', quota.client_id, updateError);
            allErrors.push({ row: 0, message: `فشل تحديث سجل العميل ${quota.client_id}: ${updateError.message}` });
            return null;
          }
          return quota.id; // Return the ID of the updated quota
        });

        const updatedIds = await Promise.all(updatePromises);
        updatedCount += updatedIds.filter(id => id !== null).length;
      }
    }

    const validHistoryEntries = historyToInsert.filter(entry => entry.quota_id !== null);

    if (validHistoryEntries.length > 0) {
      const { error: historyError } = await supabaseAdmin
        .from('bakery_quota_history')
        .insert(validHistoryEntries);

      if (historyError) {
        console.error('Edge Function: History insert error:', historyError);
      }
    }

    // Simplified response for the client to aggregate
    return new Response(JSON.stringify({
      success: true,
      created: createdCount,
      updated: updatedCount,
      errors: allErrors, // Errors specific to this chunk
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function: Error in import-bakery-quotas edge function:', error);
    return new Response(JSON.stringify({ error: error.message || 'حدث خطأ غير متوقع أثناء الاستيراد.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});