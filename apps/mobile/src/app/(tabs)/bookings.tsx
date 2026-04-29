import { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { Image } from "expo-image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPut } from "../../lib/api";
import { ReviewBottomSheet } from "../../components/ReviewBottomSheet";
import { EmptyState } from "../../components/EmptyState";

const SEGS = ["Upcoming", "Completed", "Cancelled"] as const;
type Seg = typeof SEGS[number];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#fde047", CONFIRMED: "#4ade80", COMPLETED: "#a5b4fc", CANCELLED: "#f87171",
};

type Booking = {
  id: string; referenceCode: string; bookingType: string; date: string;
  startTime: string; endTime: string; partySize: number; status: string;
  paymentStatus: string; totalAmount: number;
  restaurant: { id: string; name: string; coverImage?: string; city: string };
  table?: { tableNumber: string }; buffetSession?: { name: string }; eventHall?: { name: string };
  review?: { rating: number } | null;
};

export default function BookingsScreen() {
  const qc = useQueryClient();
  const [seg,       setSeg]       = useState<Seg>("Upcoming");
  const [reviewFor, setReviewFor] = useState<Booking | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-bookings"],
    queryFn:  () => apiGet<{ data: Booking[] }>("/bookings/my?limit=50"),
  });

  const all      = (data as any)?.data ?? [];
  const upcoming  = all.filter((b: Booking) => ["CONFIRMED","PENDING"].includes(b.status));
  const completed = all.filter((b: Booking) => b.status === "COMPLETED");
  const cancelled = all.filter((b: Booking) => b.status === "CANCELLED");
  const list      = seg === "Upcoming" ? upcoming : seg === "Completed" ? completed : cancelled;

  const handleCancel = (booking: Booking) => {
    const dt = new Date(`${booking.date.split("T")[0]}T${booking.startTime}:00`);
    if ((dt.getTime() - Date.now()) < 2 * 3600_000) { Alert.alert("Cannot Cancel", "Cancellation window (2 hours) has passed."); return; }
    Alert.alert("Cancel Booking?", "Are you sure you want to cancel this booking?", [
      { text: "No" },
      { text: "Yes, Cancel", style: "destructive", onPress: async () => {
        try {
          await apiPut(`/bookings/${booking.id}/cancel`, { reason: "Changed plans" });
          qc.invalidateQueries({ queryKey: ["my-bookings"] });
        } catch (err: any) { Alert.alert("Error", err.message); }
      }},
    ]);
  };

  return (
    <View style={s.container}>
      {/* Segmented control */}
      <View style={s.segmented}>
        {SEGS.map(t => (
          <TouchableOpacity key={t} onPress={() => setSeg(t)} style={[s.seg, seg === t && s.segActive]}>
            <Text style={[s.segText, seg === t && s.segTextActive]}>
              {t} {t === "Upcoming" ? upcoming.length : t === "Completed" ? completed.length : cancelled.length > 0 ? `(${cancelled.length})` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={list}
        keyExtractor={b => b.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#f97316" />}
        renderItem={({ item: b }) => {
          const venue = b.table ? `Table ${b.table.tableNumber}` : b.buffetSession?.name ?? b.eventHall?.name ?? b.bookingType;
          const bookingDT = new Date(`${b.date.split("T")[0]}T${b.startTime}:00`);
          const canCancel = ["CONFIRMED","PENDING"].includes(b.status) && (bookingDT.getTime() - Date.now()) > 2 * 3600_000;
          return (
            <View style={s.card}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={s.imgBox}>
                  {b.restaurant.coverImage
                    ? <Image source={{ uri: b.restaurant.coverImage }} style={s.img} contentFit="cover" />
                    : <View style={[s.img, { alignItems: "center", justifyContent: "center" }]}><Text style={{ fontSize: 24 }}>🍽️</Text></View>
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={s.name} numberOfLines={1}>{b.restaurant.name}</Text>
                    <Text style={[s.badge, { color: STATUS_COLORS[b.status] ?? "#a1a1aa" }]}>{b.status}</Text>
                  </View>
                  <Text style={s.detail}>{new Date(b.date).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})} · {b.startTime}–{b.endTime}</Text>
                  <Text style={s.detail}>{venue} · {b.partySize} guests</Text>
                  {b.totalAmount > 0 && <Text style={s.amt}>₹{Number(b.totalAmount).toLocaleString("en-IN")} · {b.paymentStatus}</Text>}
                  {b.status === "CANCELLED" && b.paymentStatus === "REFUNDED" && <Text style={{ color: "#4ade80", fontSize: 12, marginTop: 2 }}>✓ Refunded</Text>}
                </View>
              </View>
              <View style={s.actions}>
                {canCancel && <TouchableOpacity onPress={() => handleCancel(b)} style={s.cancelBtn}><Text style={{ color: "#f87171", fontSize: 13, fontWeight: "600" }}>Cancel</Text></TouchableOpacity>}
                {b.status === "CONFIRMED" && <TouchableOpacity style={s.dirBtn}><Text style={{ color: "#a1a1aa", fontSize: 13 }}>📍 Directions</Text></TouchableOpacity>}
                {b.status === "COMPLETED" && !b.review && <TouchableOpacity onPress={() => setReviewFor(b)} style={s.reviewBtn}><Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>⭐ Review</Text></TouchableOpacity>}
                {b.status === "COMPLETED" && b.review && <Text style={{ color: "#fbbf24", fontSize: 13 }}>★ Reviewed ({b.review.rating}/5)</Text>}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon={seg === "Upcoming" ? "📅" : seg === "Completed" ? "✅" : "❌"} message={`No ${seg.toLowerCase()} bookings yet`} />}
      />

      {reviewFor && (
        <ReviewBottomSheet
          open={true}
          booking={reviewFor}
          onClose={() => { setReviewFor(null); qc.invalidateQueries({ queryKey: ["my-bookings"] }); }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#09090b" },
  segmented:    { flexDirection: "row", margin: 16, backgroundColor: "#18181b", borderRadius: 10, padding: 3 },
  seg:          { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 8 },
  segActive:    { backgroundColor: "rgba(249,115,22,0.18)" },
  segText:      { color: "#71717a", fontWeight: "600", fontSize: 13 },
  segTextActive:{ color: "#f97316" },
  card:         { backgroundColor: "#18181b", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#27272a", gap: 10 },
  imgBox:       { width: 72, height: 72, borderRadius: 10, overflow: "hidden" },
  img:          { width: 72, height: 72, backgroundColor: "#27272a" },
  name:         { color: "#fafafa", fontWeight: "700", fontSize: 14, flex: 1 },
  badge:        { fontSize: 11, fontWeight: "700" },
  detail:       { color: "#71717a", fontSize: 12, marginTop: 2 },
  amt:          { color: "#a1a1aa", fontSize: 12, marginTop: 2 },
  actions:      { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  cancelBtn:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" },
  dirBtn:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: "#27272a" },
  reviewBtn:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: "#f97316" },
});
