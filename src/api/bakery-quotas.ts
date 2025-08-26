export const deleteBakeryQuotaHistoryEntry = async (historyId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from('bakery_quota_history')
      .delete()
      .eq('id', historyId)
      .eq('user_id', user.id); // Ensure only the user who created it can delete

    if (error) {
      console.error('Error deleting bakery quota history entry:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteBakeryQuotaHistoryEntry:', error);
    throw error;
  }
};