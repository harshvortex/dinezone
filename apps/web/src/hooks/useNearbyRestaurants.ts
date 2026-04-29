import { useQuery } from "@tanstack/react-query";
import { get } from "@dinespot/utils/api";
import type { Restaurant } from "@dinespot/types";

export interface NearbyFilters {
  cuisine?:    string;
  priceRange?: string;
  rating?:     number;
  radius?:     number;
  page?:       number;
  limit?:      number;
}

export interface NearbyResult {
  data: Array<Restaurant & { distance_km: number }>;
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useNearbyRestaurants(
  lat: number | null,
  lng: number | null,
  filters: NearbyFilters = {}
) {
  return useQuery({
    queryKey: ["restaurants", "nearby", lat, lng, filters],
    queryFn:  () =>
      get<NearbyResult>("/restaurants/nearby", {
        lat, lng, ...filters,
        radius: filters.radius ?? 10,
        limit:  filters.limit  ?? 20,
      }),
    enabled:     lat != null && lng != null,
    staleTime:   5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
