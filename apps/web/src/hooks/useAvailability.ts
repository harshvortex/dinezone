import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { get } from "@dinespot/utils/api";

export type AvailabilityType = "TABLE" | "BUFFET" | "EVENT_HALL";

export function useAvailability(
  restaurantId: string | null,
  date: string | null,
  type: AvailabilityType,
  partySize = 2
) {
  const query = useQuery({
    queryKey: ["availability", restaurantId, date, type, partySize],
    queryFn:  () =>
      get(`/restaurants/${restaurantId}/availability`, {
        date, type, partySize,
      }),
    enabled:    !!restaurantId && !!date,
    staleTime:  30 * 1000,      // 30 seconds
    refetchInterval: 30 * 1000, // poll every 30s as fallback
  });

  // Socket.IO — live updates
  useEffect(() => {
    if (!restaurantId) return;
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1")
      .replace("/api/v1", "");
    const socket: Socket = io(apiBase, { transports: ["websocket"] });

    socket.on("connect", () => socket.emit("join:restaurant", restaurantId));
    socket.on("availability:update", (payload: { restaurantId: string; type: string; date: string }) => {
      if (payload.restaurantId === restaurantId && payload.type === type && payload.date === date) {
        query.refetch();
      }
    });
    socket.on("booking:confirmed", () => query.refetch());

    return () => {
      socket.emit("leave:restaurant", restaurantId);
      socket.disconnect();
    };
  }, [restaurantId, type, date, query]);

  return query;
}
