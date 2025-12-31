import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
      // Use the get_all_users RPC function
      const { data, error } = await supabase.rpc("get_all_users") as {
        data: PublicUser[] | null;
        error: Error | null
      };

      if (error) {
        console.error("Error fetching all users:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - users don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return { users, loading };
}
