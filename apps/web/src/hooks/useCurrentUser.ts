import { useQuery } from "@tanstack/react-query";
import { get } from "@dinespot/utils/api";
import type { User } from "@dinespot/types";
import { tokenStorage } from "@dinespot/utils/api";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn:  () => get<User>("/auth/me"),
    enabled:  typeof window !== "undefined" && !!tokenStorage.getAccess(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
