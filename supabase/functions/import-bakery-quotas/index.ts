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

    // Expecting JSON data directly from the client
    const { data: excelData, chunkSize = 100, currentChunk = 0 } = await req.json();
    console.log(`Edge Function: Processing chunk ${currentChunk + 1} with ${chunkSize} records.`);

    if (!excelData || excelData.length === 0) {
      console.warn('Edge Function: No data found in the request body.');
      return new Response(JSON.stringify({ error: 'No data found in the request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const startIdx = currentChunk * chunkSize;
    const endIdx = Math.min(startIdx + chunkSize, excelData.length);
    const chunkData = excelData.slice(startIdx, endIdx);
    
    const totalChunks = Math.ceil(excelData.length / chunkSize);
    const progress = ((currentChunk + 1) / totalChunks) * 100;

    const latestQuotasMap = new Map<string, any>();
    const historyToInsert: any[] = [];
    const errors: { row: number; message: string }[] = [];
    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < chunkData.length; i++) {
      const row = chunkData[i];
      const globalRowIndex = startIdx + i + 1; // 1-based index for user feedback

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
          errors.push({ row: globalRowIndex, message: 'كود العميل أو اسم العميل مفقود' });
          continue;
        }

        // Check if this is an update or a new entry
        const existingQuota = latestQuotasMap.get(client_id);
        if (existingQuota) {
          updatedCount++;
        } else {
          createdCount++;
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
        
        processedCount++;

      } catch (error: any) {
        console.error(`Edge Function: Error processing row ${globalRowIndex}:`, error);
        errors.push({ row: globalRowIndex, message: `خطأ في معالجة الصف: ${error.message || 'خطأ غير معروف'}` });
      }
    }

    const quotasToUpsert = Array.from(latestQuotasMap.values());
    console.log(`Edge Function: Prepared ${quotasToUpsert.length} unique quotas for upsert in chunk ${currentChunk + 1}.`);

    const { data: upsertedBakeries, error: upsertError } = await supabaseAdmin
      .from('bakery_quotas')
      .upsert(quotasToUpsert, { onConflict: 'client_id' })
      .select('id, client_id, quota_value');

    if (upsertError) {
      console.error('Edge Function: Batch upsert error:', upsertError);
      throw new Error(`فشل تحديث بيانات المخابز: ${upsertError.message}`);
    }

    const bakeryIdMap = new Map<string, { id: string, new_quota_value: number }>();
    upsertedBakeries.forEach(b => bakeryIdMap.set(b.client_id, { id: b.id, new_quota_value: b.quota_value }));

    const finalHistoryEntries = historyToInsert.map(entry => {
      const bakeryInfo = bakeryIdMap.get(entry.client_id);
      if (!bakeryInfo) {
        errors.push({ row: 0, message: `لم يتم العثور على معرف مخبز لـ client_id: ${entry.client_id} أثناء إنشاء السجل التاريخي.` });
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
        throw new Error(`فشل في إدخال السجلات التاريخية: ${historyInsertError.message}`);
      }
    }

    return new Response(JSON.stringify({
      total: excelData.length,
      processed: processedCount,
      created: createdCount,
      updated: updatedCount,
      errors: errors,
      progress: progress,
      isLastChunk: currentChunk === totalChunks - 1,
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