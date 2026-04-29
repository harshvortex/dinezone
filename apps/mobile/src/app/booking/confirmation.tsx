import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Calendar from "expo-calendar";
import { apiGet } from "../../lib/api";
import { Ionicons } from "@expo/vector-icons";

interface Booking {
  id: string; referenceCode: string; bookingType: string;
  date: string; startTime: string; endTime: string; partySize: number;
  totalAmount: number; paymentId?: string;
  restaurant: { name: string; address: string; city: string };
  table?: { tableNumber: string }; buffetSession?: { name: string }; eventHall?: { name: string };
}

async function addToCalendar(booking: Booking) {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== "granted") return;

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writeable = calendars.find(c => c.allowsModifications);
  if (!writeable) return;

  const [sh, sm] = booking.startTime.split(":").map(Number);
  const [eh, em] = booking.endTime.split(":").map(Number);
  const base = new Date(booking.date);
  const start = new Date(base); start.setHours(sh ?? 0, sm ?? 0, 0);
  const end   = new Date(base); end.setHours(eh ?? 0, em ?? 0, 0);

  await Calendar.createEventAsync(writeable.id, {
    title:    `DineSpot — ${booking.restaurant.name}`,
    location: `${booking.restaurant.address}, ${booking.restaurant.city}`,
    notes:    `Booking Ref: ${booking.referenceCode}\nParty of ${booking.partySize}`,
    startDate: start, endDate: end,
    timeZone: "Asia/Kolkata",
  });
}

export default function ConfirmationScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router        = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [show, setShow]       = useState(false);

  useEffect(() => {
    apiGet<Booking>(`/bookings/${bookingId}`).then(b => { setBooking(b); setTimeout(() => setShow(true), 300); }).catch(() => {});
  }, [bookingId]);

  const handleWhatsApp = async () => {
    if (!booking) return;
    const msg = `🍽️ Just booked at *${booking.restaurant.name}* via DineSpot!\n📅 ${new Date(booking.date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})} at ${booking.startTime}\n👥 Party of ${booking.partySize}\nRef: ${booking.referenceCode}`;
    await Share.share({ message: msg });
  };

  if (!booking) {
    return (
      <View style={s.center}>
        <Text style={{ color: "#71717a" }}>Loading…</Text>
      </View>
    );
  }

  const venue = booking.table ? `Table ${booking.table.tableNumber}` : booking.buffetSession?.name ?? booking.eventHall?.name ?? booking.bookingType;

  return (
    <View style={s.container}>
      {/* Success animation area */}
      <View style={[s.successCircle, show && s.successCircleVisible]}>
        <Text style={{ fontSize: 40 }}>✅</Text>
      </View>

      <Text style={[s.title, show && s.visible]}>Booking Confirmed!</Text>
      <Text style={[s.sub, show && s.visible]}>Your table is waiting 🎉</Text>

      {/* Booking card */}
      <View style={[s.card, show && s.visible]}>
        <View style={s.cardHeader}>
          <Text style={s.restaurantName}>{booking.restaurant.name}</Text>
          <View style={s.confirmedBadge}><Text style={s.confirmedText}>Confirmed</Text></View>
        </View>
        {[
          ["Booking ID",  booking.referenceCode],
          ["Date",        new Date(booking.date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"long",year:"numeric"})],
          ["Time",        `${booking.startTime} – ${booking.endTime}`],
          ["Venue",       venue],
          ["Guests",      `${booking.partySize} people`],
          ...(booking.totalAmount > 0 ? [["Paid", `₹${Number(booking.totalAmount).toLocaleString("en-IN")}`]] : [["Payment","At restaurant"]]),
        ].map(([k, v]) => (
          <View key={k} style={s.row}>
            <Text style={s.rowKey}>{k}</Text>
            <Text style={s.rowVal}>{v}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={[s.actions, show && s.visible]}>
        <TouchableOpacity onPress={() => addToCalendar(booking)} style={s.actionBtn}>
          <Ionicons name="calendar-outline" size={18} color="#fafafa" />
          <Text style={s.actionBtnText}>Add to Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleWhatsApp} style={[s.actionBtn, { backgroundColor: "#25D366" }]}>
          <Ionicons name="logo-whatsapp" size={18} color="#fff" />
          <Text style={s.actionBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.replace("/(tabs)/explore")} style={[s.primaryBtn, show && s.visible]}>
        <Text style={s.primaryBtnText}>Back to Explore</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/(tabs)/bookings")} style={[s.secondaryBtn, show && s.visible]}>
        <Text style={s.secondaryBtnText}>View My Bookings</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: "#09090b", alignItems: "center", justifyContent: "center", padding: 24 },
  center:            { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#09090b" },
  successCircle:     { width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(34,197,94,0.12)", borderWidth: 2, borderColor: "rgba(34,197,94,0.3)", alignItems: "center", justifyContent: "center", marginBottom: 16, opacity: 0, transform: [{ scale: 0.5 }] },
  successCircleVisible: { opacity: 1, transform: [{ scale: 1 }] },
  title:             { color: "#fafafa", fontSize: 24, fontWeight: "800", marginBottom: 6, opacity: 0 },
  sub:               { color: "#71717a", fontSize: 15, marginBottom: 24, opacity: 0 },
  visible:           { opacity: 1 },
  card:              { backgroundColor: "#18181b", borderRadius: 16, padding: 16, width: "100%", borderWidth: 1, borderColor: "#27272a", marginBottom: 16, opacity: 0 },
  cardHeader:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  restaurantName:    { color: "#fafafa", fontWeight: "700", fontSize: 16, flex: 1 },
  confirmedBadge:    { backgroundColor: "rgba(34,197,94,0.15)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  confirmedText:     { color: "#4ade80", fontSize: 12, fontWeight: "700" },
  row:               { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderTopWidth: 1, borderTopColor: "#27272a" },
  rowKey:            { color: "#71717a", fontSize: 13 },
  rowVal:            { color: "#fafafa", fontSize: 13, fontWeight: "500" },
  actions:           { flexDirection: "row", gap: 12, marginBottom: 12, opacity: 0, width: "100%" },
  actionBtn:         { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#27272a", borderRadius: 12, paddingVertical: 12 },
  actionBtnText:     { color: "#fafafa", fontWeight: "600", fontSize: 13 },
  primaryBtn:        { backgroundColor: "#f97316", borderRadius: 14, paddingVertical: 15, width: "100%", alignItems: "center", marginBottom: 10, opacity: 0 },
  primaryBtnText:    { color: "#fff", fontWeight: "800", fontSize: 16 },
  secondaryBtn:      { paddingVertical: 12, width: "100%", alignItems: "center", opacity: 0 },
  secondaryBtnText:  { color: "#a1a1aa", fontWeight: "600", fontSize: 14 },
});
