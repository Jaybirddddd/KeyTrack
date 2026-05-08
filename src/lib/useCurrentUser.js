import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

async function fetchCurrentUser() {
  // base44.auth.me() always works for any role and returns the latest data including role
  const authUser = await base44.auth.me();
  return {
    ...authUser,
    // data field holds display_name and role overrides set via admin panel
    display_name: authUser?.data?.display_name || authUser?.display_name || null,
    role: authUser?.data?.role || authUser.role,
  };
}

export function useCurrentUser() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['current_user'],
    queryFn: fetchCurrentUser,
    staleTime: 0,            // always refetch so role changes are immediate
    refetchInterval: 10_000, // poll every 10s to pick up role changes quickly
    retry: 1,
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isTeamMember = ['detail_team', 'service_team', 'vendor'].includes(user?.role);
  const displayName = user?.display_name || user?.full_name || user?.email || '';

  return { user: user ?? null, loading: isLoading, isAdmin, isTeamMember, displayName };
}