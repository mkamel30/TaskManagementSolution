import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPaginatedBakeryQuotas, createBakeryQuota, updateBakeryQuota, deleteBakeryQuota } from '@/api/bakery-quotas';
import { BakeryQuota } from '@/api/bakery-quotas';
import { showSuccess, showError } from '@/utils/toast';
import { useBranch } from '@/contexts/BranchContext';

type BakeryQuotaFormData = Omit<BakeryQuota, 'id' | 'created_at' | 'updated_at'>;

export const useBakeryQuotas = () => {
  const queryClient = useQueryClient();
  const { selectedBranch } = useBranch();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState<BakeryQuota | null>(null);
  const [addingRecordForQuota, setAddingRecordForQuota] = useState<BakeryQuotaFormData | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); // For input field
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState(''); // For actual query to API
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [quotaIdToDelete, setQuotaIdToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'client_name' | 'quota_date' | 'client_id'>('quota_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Date filtering state
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset currentPage to 1 when filters or selectedBranch change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranch, submittedSearchQuery, startDate, endDate]);

  const { data: paginatedResponse, isLoading, isError } = useQuery({
    queryKey: ['bakeryQuotas', currentPage, itemsPerPage, submittedSearchQuery, sortBy, sortOrder, startDate, endDate, selectedBranch],
    queryFn: () => getPaginatedBakeryQuotas(currentPage, itemsPerPage, submittedSearchQuery, sortBy, sortOrder, startDate, endDate, selectedBranch),
    retry: false,
  });

  // If query returns error (e.g. range not satisfiable after switching branch), reset page to 1
  useEffect(() => {
    if (isError && currentPage > 1) {
      setCurrentPage(1);
    }
  }, [isError, currentPage]);

  const bakeries = paginatedResponse?.data || [];
  const totalBakeriesCount = paginatedResponse?.count || 0;

  const createMutation = useMutation({
    mutationFn: (newQuota: BakeryQuotaFormData) => createBakeryQuota(newQuota),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotas'] });
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStats'] });
      showSuccess('تم إنشاء الحصة التأمينية بنجاح');
      setIsFormDialogOpen(false);
      if (submittedSearchQuery) {
        setSubmittedSearchQuery(searchQuery);
      }
    },
    onError: (error) => {
      showError(`خطأ في إنشاء الحصة التأمينية: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (variables: { id: string, updates: Partial<BakeryQuotaFormData> }) => updateBakeryQuota(variables.id, variables.updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotas'] });
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaHistory', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStats'] });
      showSuccess('تم تحديث الحصة التأمينية بنجاح');
      setIsFormDialogOpen(false);
      setEditingQuota(null);
      setAddingRecordForQuota(null);
      if (submittedSearchQuery) {
        setSubmittedSearchQuery(searchQuery);
      }
    },
    onError: (error) => {
      showError(`خطأ في تحديث الحصة التأمينية: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBakeryQuota,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotas'] });
      queryClient.invalidateQueries({ queryKey: ['bakeryQuotaStats'] });
      showSuccess('تم حذف الحصة التأمينية بنجاح');
      if (submittedSearchQuery) {
        setSubmittedSearchQuery(searchQuery);
      }
    },
    onError: (error) => {
      showError(`خطأ في حذف الحصة التأمينية: ${error.message}`);
    }
  });

  const handleEdit = (quota: BakeryQuota) => {
    setEditingQuota(quota);
    setAddingRecordForQuota(null);
    setIsFormDialogOpen(true);
  };

  const handleAddNewRecordForClient = (quota: BakeryQuota) => {
    setAddingRecordForQuota({
      client_id: quota.client_id,
      client_name: quota.client_name,
      quota_value: 0,
      quota_date: new Date().toISOString().split('T')[0],
      notes: quota.notes,
      discount_type: quota.discount_type,
    });
    setEditingQuota(null);
    setIsFormDialogOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    setQuotaIdToDelete(id);
    setDeleteAlertOpen(true);
  };

  const handleConfirmDelete = () => {
    if (quotaIdToDelete) {
      deleteMutation.mutate(quotaIdToDelete);
    }
    setDeleteAlertOpen(false);
    setQuotaIdToDelete(null);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setEditingQuota(null);
      setAddingRecordForQuota(null);
    }
    setIsFormDialogOpen(open);
  };

  const handleSearchButtonClick = () => {
    setSubmittedSearchQuery(searchQuery);
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, sortOrder, itemsPerPage, startDate, endDate]);

  const formInitialData = editingQuota || addingRecordForQuota || undefined;
  const dialogTitle = editingQuota 
    ? 'تعديل بيانات المخبز' 
    : (addingRecordForQuota ? `إضافة سجل جديد لـ ${addingRecordForQuota.client_name}` : 'إضافة مخبز جديد');

  return {
    bakeries,
    totalBakeriesCount,
    isLoading,
    isError,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    searchQuery,
    setSearchQuery,
    submittedSearchQuery,
    setSubmittedSearchQuery,
    isFormDialogOpen,
    setIsFormDialogOpen,
    editingQuota,
    setEditingQuota,
    addingRecordForQuota,
    setAddingRecordForQuota,
    isDeleteAlertOpen,
    setDeleteAlertOpen,
    quotaIdToDelete,
    setQuotaIdToDelete,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    createMutation,
    updateMutation,
    deleteMutation,
    handleEdit,
    handleAddNewRecordForClient,
    handleDeleteRequest,
    handleConfirmDelete,
    handleDialogChange,
    handleSearchButtonClick,
    formInitialData,
    dialogTitle
  };
};
