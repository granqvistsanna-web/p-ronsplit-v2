import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { STALE_TIME_STATIC, GC_TIME_DEFAULT } from "./queries/config";

export interface PublicUser {
  id: string;
  user_id: string;
  name: string;
}

export function useAllUsers() {
  const { user } = useAuth();

  const { data: users = [], isLoading: loading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      // Use direct query instead of RPC for better reliability
      // Query public_profiles view which has proper RLS
      const { data, error } = await supabase
        .from("public_profiles")
        .select("id, user_id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching all users:", error);
        throw error;
      }

      return (data || []) as PublicUser[];
    },
    enabled: !!user,
    staleTime: STALE_TIME_STATIC,
    gcTime: GC_TIME_DEFAULT
  });

  return { users, loading };
}
