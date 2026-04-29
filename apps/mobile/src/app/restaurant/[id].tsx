import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, FlatList } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api";
import { AvailabilityGrid } from "../../components/AvailabilityGrid";
import { io } from "socket.io-client";
import Constants from "expo-constants";

const NEXT7 = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() + i);
  return { label: i === 0 ? "Today" : d.toLocaleDateString("en-IN",{weekday:"short"}), full: d.toISOString().split("T")[0]! };
});

const TABS = ["Tables", "Buffets", "Event Halls"] as const;
type Tab = typeof TABS[number];

export default function RestaurantDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const [tab,         setTab]         = useState<Tab>("Tables");
  const [date,        setDate]        = useState(NEXT7[0]!.full);
  const [partySize,   setPartySize]   = useState(2);
  const [selectedSlot,setSelectedSlot]= useState<any>(null);

  const { data: rest, isLoading } = useQuery({
    queryKey: ["restaurant", id],
    queryFn:  () => apiGet<any>(`/restaurants/${id}`),
  });

  const { data: avail, refetch: refetchAvail } = useQuery({
    queryKey: ["availability", id, date, tab],
    queryFn:  () => apiGet<any[]>(`/restaurants/${id}/availability?date=${date}&type=${tab === "Tables" ? "TABLE" : tab === "Buffets" ? "BUFFET" : "EVENT_HALL"}&partySize=${partySize}`),
    enabled:  !!id,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // Socket.IO live updates
  useEffect(() => {
    if (!id) return;
    const socket = io(Constants.expoConfig?.extra?.socketUrl ?? "http://localhost:4000", { transports: ["websocket"] });
    socket.on("connect", () => socket.emit("join:restaurant", id));
    socket.on("availability:update", (p: any) => { if (p.restaurantId === id) refetchAvail(); });
    socket.on("booking:confirmed",   ()       => refetchAvail());
    return () => { socket.emit("leave:restaurant", id); socket.disconnect(); };
  }, [id, refetchAvail]);

  const handleBook = () => {
    if (!selectedSlot) return;
    const params: Record<string, string> = {
      restaurantId: id!, restaurantName: rest?.name ?? "",
      bookingType: tab === "Tables" ? "TABLE" : tab === "Buffets" ? "BUFFET" : "EVENT_HALL",
      date, partySize: String(partySize),
    };
    if (tab === "Tables" && selectedSlot) { params.tableId = selectedSlot.tableId; params.startTime = selectedSlot.time; params.endTime = selectedSlot.endTime; params.venueName = `Table ${selectedSlot.tableNumber}`; }
    if (tab === "Buffets" && selectedSlot) { params.buffetSessionId = selectedSlot.sessionId; params.startTime = selectedSlot.startTime; params.endTime = selectedSlot.endTime; params.venueName = selectedSlot.name; params.basePrice = String(selectedSlot.pricePerHead); }
    if (tab === "Event Halls" && selectedSlot) { params.hallId = selectedSlot.hallId; params.venueName = selectedSlot.name; params.basePrice = String(selectedSlot.pricePerDay); }
    router.push({ pathname: "/booking/review", params });
  };

  if (isLoading) return <View style={s.center}><ActivityIndicator color="#f97316" size="large" /></View>;
  if (!rest) return null;

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        {/* Header image */}
        <Image source={{ uri: rest.coverImage }} style={s.heroImage} contentFit="cover" />

        {/* Sticky info bar */}
        <View style={s.infoBar}>
          <Text style={s.name}>{rest.name}</Text>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
            <Text style={s.badge}>{rest.cuisineType?.toLowerCase()}</Text>
            <Text style={s.rating}>★ {rest.rating?.toFixed(1)} ({rest.totalReviews})</Text>
            <Text style={s.muted}>{rest.address}, {rest.city}</Text>
          </View>
        </View>

        {/* Segmented control */}
        <View style={s.segmented}>
          {TABS.map(t => (
            <TouchableOpacity key={t} onPress={() => { setTab(t); setSelectedSlot(null); }} style={[s.seg, tab === t && s.segActive]}>
              <Text style={[s.segText, tab === t && s.segTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date picker */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <FlatList
            horizontal showsHorizontalScrollIndicator={false}
            data={NEXT7} keyExtractor={d => d.full}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => { setDate(item.full); setSelectedSlot(null); }}
                style={[s.dateChip, date === item.full && s.dateChipActive]}>
                <Text style={[s.dateLabel, date === item.full && { color: "#f97316" }]}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Party size (for tables) */}
        {tab === "Tables" && (
          <View style={s.partyRow}>
            <Text style={s.partyLabel}>Party size</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TouchableOpacity onPress={() => setPartySize(p => Math.max(1, p-1))} style={s.partyBtn}><Text style={s.partyBtnText}>−</Text></TouchableOpacity>
              <Text style={s.partyCount}>{partySize}</Text>
              <TouchableOpacity onPress={() => setPartySize(p => p+1)} style={s.partyBtn}><Text style={s.partyBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {/* Availability */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 120 }}>
          <AvailabilityGrid
            type={tab === "Tables" ? "TABLE" : tab === "Buffets" ? "BUFFET" : "EVENT_HALL"}
            slots={avail ?? []}
            selected={selectedSlot}
            onSelect={setSelectedSlot}
          />
        </View>
      </ScrollView>

      {/* Sticky Book Now */}
      <View style={s.footer}>
        <TouchableOpacity onPress={handleBook} disabled={!selectedSlot} style={[s.bookBtn, !selectedSlot && s.bookBtnDisabled]}>
          <Text style={s.bookBtnText}>{selectedSlot ? "Book Now →" : "Select a slot"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#09090b" },
  center:          { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#09090b" },
  heroImage:       { width: "100%", height: 260 },
  infoBar:         { backgroundColor: "#09090b", padding: 16, borderBottomWidth: 1, borderBottomColor: "#27272a" },
  name:            { color: "#fafafa", fontSize: 20, fontWeight: "800" },
  badge:           { backgroundColor: "#27272a", color: "#a1a1aa", fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  rating:          { color: "#fbbf24", fontWeight: "700", fontSize: 13 },
  muted:           { color: "#71717a", fontSize: 12, flexShrink: 1 },
  segmented:       { flexDirection: "row", margin: 16, backgroundColor: "#18181b", borderRadius: 10, padding: 3 },
  seg:             { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  segActive:       { backgroundColor: "rgba(249,115,22,0.2)" },
  segText:         { color: "#71717a", fontWeight: "600", fontSize: 13 },
  segTextActive:   { color: "#f97316" },
  dateChip:        { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#18181b", borderWidth: 1, borderColor: "#27272a" },
  dateChipActive:  { borderColor: "#f97316" },
  dateLabel:       { color: "#a1a1aa", fontWeight: "600", fontSize: 13 },
  partyRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  partyLabel:      { color: "#fafafa", fontWeight: "600" },
  partyBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: "#27272a", alignItems: "center", justifyContent: "center" },
  partyBtnText:    { color: "#fafafa", fontSize: 20, lineHeight: 24 },
  partyCount:      { color: "#fafafa", fontSize: 18, fontWeight: "700", minWidth: 32, textAlign: "center" },
  footer:          { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#09090b", padding: 16, borderTopWidth: 1, borderTopColor: "#27272a" },
  bookBtn:         { backgroundColor: "#f97316", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  bookBtnDisabled: { backgroundColor: "#27272a" },
  bookBtnText:     { color: "#fff", fontWeight: "800", fontSize: 16 },
});
