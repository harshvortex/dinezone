import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../lib/api";
import { io } from "socket.io-client";
import Constants from "expo-constants";

type Notif = { id: string; title: string; message: string; isRead: boolean; createdAt: string; type: string };

const TYPE_ICON: Record<string, string> = {
  BOOKING_CONFIRMED: "✅", BOOKING_CANCELLED: "❌", BOOKING_REMINDER: "⏰",
  PAYMENT_RECEIVED: "💰", REFUND_PROCESSED: "💸", REVIEW_REMINDER: "⭐",
};

export default function NotificationsScreen() {
  const qc = useQueryClient();
  const [localRead, setLocalRead] = useState<Set<string>>(new Set());
  const [toastMsg,  setToastMsg]  = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn:  () => apiGet<{ data: Notif[] }>("/notifications?limit=50"),
  });

  const notifs = (data as any)?.data ?? [];

  // Socket.IO real-time
  useEffect(() => {
    const socket = io(Constants.expoConfig?.extra?.socketUrl ?? "http://localhost:4000", { transports: ["websocket"] });
    socket.on("notification:new", (n: Notif) => {
      qc.setQueryData(["notifications"], (prev: any) => ({
        ...prev,
        data: [n, ...(prev?.data ?? [])],
      }));
      setToastMsg(n.title);
      setTimeout(() => setToastMsg(""), 3000);
    });
    return () => socket.disconnect();
  }, [qc]);

  const markRead = async (id: string) => {
    setLocalRead(s => new Set([...s, id]));
    await apiPost(`/notifications/${id}/read`, {}).catch(() => {});
  };

  const markAllRead = async () => {
    const ids = notifs.filter((n: Notif) => !n.isRead).map((n: Notif) => n.id);
    setLocalRead(new Set(ids));
    await apiPost("/notifications/read-all", {}).catch(() => {});
  };

  const unreadCount = notifs.filter((n: Notif) => !n.isRead && !localRead.has(n.id)).length;

  return (
    <View style={s.container}>
      {/* Toast */}
      {toastMsg ? (
        <View style={s.toast}><Text style={s.toastText}>🔔 {toastMsg}</Text></View>
      ) : null}

      {/* Header row */}
      <View style={s.header}>
        <Text style={s.heading}>Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}</Text>
        {unreadCount > 0 && <TouchableOpacity onPress={markAllRead}><Text style={s.markAll}>Mark all read</Text></TouchableOpacity>}
      </View>

      <FlatList
        data={notifs}
        keyExtractor={(n: Notif) => n.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#f97316" />}
        renderItem={({ item: n }: { item: Notif }) => {
          const read = n.isRead || localRead.has(n.id);
          return (
            <TouchableOpacity onPress={() => !read && markRead(n.id)} activeOpacity={0.85}
              style={[s.card, read && s.cardRead, !read && s.cardUnread]}>
              <Text style={s.icon}>{TYPE_ICON[n.type] ?? "🔔"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.title, read && s.titleRead]}>{n.title}</Text>
                <Text style={s.message} numberOfLines={2}>{n.message}</Text>
                <Text style={s.time}>{new Date(n.createdAt).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</Text>
              </View>
              {!read && <View style={s.dot} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🔔</Text>
            <Text style={{ color: "#71717a", fontSize: 15, textAlign: "center" }}>No notifications yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#09090b" },
  toast:      { backgroundColor: "#18181b", margin: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#f97316" },
  toastText:  { color: "#fafafa", fontWeight: "600" },
  header:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  heading:    { color: "#fafafa", fontSize: 18, fontWeight: "800" },
  markAll:    { color: "#f97316", fontSize: 13, fontWeight: "600" },
  card:       { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  cardUnread: { backgroundColor: "#18181b", borderColor: "#f97316", borderLeftWidth: 3 },
  cardRead:   { backgroundColor: "#18181b", borderColor: "#27272a", opacity: 0.7 },
  icon:       { fontSize: 24, width: 32 },
  title:      { color: "#fafafa", fontWeight: "700", fontSize: 14 },
  titleRead:  { fontWeight: "500" },
  message:    { color: "#71717a", fontSize: 13, marginTop: 2 },
  time:       { color: "#52525b", fontSize: 11, marginTop: 4 },
  dot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: "#f97316", marginTop: 4 },
});
