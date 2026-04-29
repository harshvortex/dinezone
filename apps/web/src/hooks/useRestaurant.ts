import { useQuery } from "@tanstack/react-query";
import { get } from "@dinespot/utils/api";
import type { Restaurant } from "@dinespot/types";

export function useRestaurant(id: string | null) {
  return useQuery({
    queryKey: ["restaurant", id],
    queryFn:  () => get<Restaurant>(`/restaurants/${id}`),
    enabled:  !!id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useRestaurantBySlug(slug: string | null) {
  return useQuery({
    queryKey: ["restaurant", "slug", slug],
    queryFn:  () => get<Restaurant>(`/restaurants/slug/${slug}`),
    enabled:  !!slug,
    staleTime: 10 * 60 * 1000,
  });
}
