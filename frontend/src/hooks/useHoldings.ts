import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  Holding,
  PortfolioSummary,
  CreateHoldingInput,
  BatchImportRequest,
  computePortfolioSummary,
} from '@investment-tracker/shared';
import { toast } from 'sonner';

export function useHoldings() {
  const queryClient = useQueryClient();

  const holdingsQuery = useQuery({
    queryKey: ['holdings'],
    queryFn: async () => {
      const res = await api.get<{ holdings: Holding[]; summary: PortfolioSummary }>('/holdings');
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const rawHoldings = holdingsQuery.data?.holdings || [];

  // Compute portfolio summary and freshness relative to local browser clock and timezone
  const summary = useMemo(() => {
    if (rawHoldings.length === 0) return holdingsQuery.data?.summary;
    return computePortfolioSummary(rawHoldings);
  }, [rawHoldings, holdingsQuery.data?.summary]);

  const addHoldingMutation = useMutation({
    mutationFn: async (newHolding: CreateHoldingInput) => {
      const res = await api.post<{ holding: Holding }>('/holdings', newHolding);
      return res.data.holding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      toast.success('Asset added successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to add asset');
    },
  });

  const updateHoldingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateHoldingInput> }) => {
      const res = await api.put<{ holding: Holding }>(`/holdings/${id}`, data);
      return res.data.holding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      toast.success('Asset updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update asset');
    },
  });

  const deleteHoldingMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/holdings/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      toast.success('Asset removed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete asset');
    },
  });

  const batchImportMutation = useMutation({
    mutationFn: async (payload: BatchImportRequest) => {
      const res = await api.post<{ success: boolean; importedCount: number; totalValueImported: number }>(
        '/holdings/batch-import',
        payload
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      toast.success(`Successfully imported ${data.importedCount} holdings!`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to import report');
    },
  });

  const refreshPricesMutation = useMutation({
    mutationFn: async (force: boolean = false) => {
      const res = await api.post<{ success: boolean; updatedCount: number }>(
        `/market/refresh-holdings?force=${force}`
      );
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      toast.success(`Refreshed live prices for ${data.updatedCount} holdings`);
    },
    onError: () => {
      toast.error('Failed to refresh market prices');
    },
  });

  return {
    holdings: holdingsQuery.data?.holdings || [],
    summary: holdingsQuery.data?.summary,
    isLoading: holdingsQuery.isLoading,
    isError: holdingsQuery.isError,
    refetch: holdingsQuery.refetch,
    addHolding: addHoldingMutation.mutateAsync,
    updateHolding: updateHoldingMutation.mutateAsync,
    deleteHolding: deleteHoldingMutation.mutateAsync,
    batchImport: batchImportMutation.mutateAsync,
    refreshPrices: refreshPricesMutation.mutateAsync,
    isAdding: addHoldingMutation.isPending,
    isImporting: batchImportMutation.isPending,
    isRefreshing: refreshPricesMutation.isPending,
  };
}
