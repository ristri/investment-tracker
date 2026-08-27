import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { NetWorthSnapshot, CreateSnapshotInput } from '@investment-tracker/shared';
import { toast } from 'sonner';

export function useSnapshots() {
  const queryClient = useQueryClient();

  const snapshotsQuery = useQuery({
    queryKey: ['snapshots'],
    queryFn: async () => {
      const res = await api.get<{ snapshots: NetWorthSnapshot[] }>('/snapshots');
      return res.data.snapshots;
    },
    staleTime: 5 * 60 * 1000,
  });

  const takeSnapshotMutation = useMutation({
    mutationFn: async (data: CreateSnapshotInput) => {
      const res = await api.post<{ snapshot: NetWorthSnapshot }>('/snapshots', data);
      return res.data.snapshot;
    },
    onSuccess: (snapshot) => {
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      toast.success(`📸 Snapshot "${snapshot.title}" captured!`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to capture snapshot');
    },
  });

  const deleteSnapshotMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/snapshots/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots'] });
      toast.success('Snapshot removed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete snapshot');
    },
  });

  return {
    snapshots: snapshotsQuery.data || [],
    isLoading: snapshotsQuery.isLoading,
    refetch: snapshotsQuery.refetch,
    takeSnapshot: takeSnapshotMutation.mutateAsync,
    deleteSnapshot: deleteSnapshotMutation.mutateAsync,
    isTakingSnapshot: takeSnapshotMutation.isPending,
  };
}
