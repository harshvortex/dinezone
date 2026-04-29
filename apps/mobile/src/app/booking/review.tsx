import { useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiPost } from "../../lib/api";

const TAX_RATE    = 0.05;
const PLATFORM_FEE = 29;

export default function ReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const [party,   setParty]   = useState(parseInt(params.partySize ?? "2", 10));
  const [special, setSpecial] = useState("");
  const [loading, setLoading] = useState(false);

  const basePrice   = parseInt(params.basePrice ?? "0", 10);
  const tax         = Math.round(basePrice * party * TAX_RATE);
  const total       = basePrice * party + tax + (basePrice > 0 ? PLATFORM_FEE : 0);
  const isOnline    = total > 0;

  const proceed = async () => {
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        restaurantId: params.restaurantId, bookingType: params.bookingType,
        date: params.date, partySize: party,
        startTime: params.startTime ?? "12:00", endTime: params.endTime ?? "14:00",
        totalAmount: total, paymentMethod: isOnline ? "ONLINE" : "AT_VENUE",
        specialRequests: special.trim() || undefined,
      };
      if (params.tableId)         body.tableId         = params.tableId;
      if (params.buffetSessionId) body.buffetSessionId = params.buffetSessionId;
      if (params.hallId)          body.eventHallId      = params.hallId;

      const result = await apiPost<{ booking: { id: string }; payment: { orderId: string; amount: number; keyId: string } | null }>("/bookings", body);

      if (result.payment) {
        router.push({ pathname: "/booking/payment", params: { bookingId: result.booking.id, orderId: result.payment.orderId, amount: String(result.payment.amount), keyId: result.payment.keyId, restaurantName: params.restaurantName ?? "" } });
      } else {
        router.push({ pathname: "/booking/confirmation", params: { bookingId: result.booking.id } });
      }
    } catch (err: unknown) {
      Alert.alert("Booking Failed", err instanceof Error ? err.message : "Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.heading}>Review Booking</Text>

        {/* Summary */}
        <View style={s.card}>
          {[
            ["Restaurant", params.restaurantName],
            ["Venue",      params.venueName],
            ["Date",       params.date],
            ["Time",       `${params.startTime ?? "–"} – ${params.endTime ?? "–"}`],
            ["Type",       params.bookingType],
          ].map(([k, v]) => v && (
            <View key={k} style={s.row}>
              <Text style={s.rowKey}>{k}</Text>
              <Text style={s.rowVal}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Party size */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Party Size</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12 }}>
            <TouchableOpacity onPress={() => setParty(p => Math.max(1, p-1))} style={s.stepBtn}><Text style={s.stepBtnText}>−</Text></TouchableOpacity>
            <Text style={s.partyNum}>{party}</Text>
            <TouchableOpacity onPress={() => setParty(p => p+1)} style={s.stepBtn}><Text style={s.stepBtnText}>+</Text></TouchableOpacity>
            <Text style={s.muted}>guests</Text>
          </View>
        </View>

        {/* Special requests */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Special Requests <Text style={s.muted}>(optional)</Text></Text>
          <TextInput style={[s.input, { height: 80 }]} multiline value={special} onChangeText={setSpecial} placeholder="Dietary needs, seating preferences…" placeholderTextColor="#71717a" textAlignVertical="top" />
        </View>

        {/* Price breakdown */}
        {basePrice > 0 ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Price Breakdown</Text>
            {[
              [`Base (₹${basePrice} × ${party})`, basePrice * party],
              [`GST (${TAX_RATE*100}%)`,           tax],
              ["Platform fee",                     PLATFORM_FEE],
            ].map(([l, v]) => (
              <View key={String(l)} style={s.row}>
                <Text style={s.muted}>{l}</Text>
                <Text style={{ color: "#fafafa" }}>₹{Number(v).toLocaleString("en-IN")}</Text>
              </View>
            ))}
            <View style={[s.row, { borderTopWidth: 1, borderTopColor: "#27272a", marginTop: 8, paddingTop: 8 }]}>
              <Text style={{ color: "#fafafa", fontWeight: "700" }}>Total</Text>
              <Text style={{ color: "#f97316", fontWeight: "800", fontSize: 16 }}>₹{total.toLocaleString("en-IN")}</Text>
            </View>
          </View>
        ) : (
          <View style={[s.card, { backgroundColor: "rgba(34,197,94,0.07)", borderColor: "rgba(34,197,94,0.2)" }]}>
            <Text style={{ color: "#4ade80", fontWeight: "600" }}>✅ No advance payment — pay at the restaurant.</Text>
          </View>
        )}

        {/* Cancellation */}
        <Text style={[s.muted, { textAlign: "center", marginTop: 8, fontSize: 12 }]}>
          🛡️ Free cancellation up to 2 hours before your booking
        </Text>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity onPress={proceed} disabled={loading} style={[s.btn, loading && { opacity: 0.6 }]}>
          <Text style={s.btnText}>{loading ? "Processing…" : isOnline ? `Pay ₹${total.toLocaleString("en-IN")} →` : "Confirm Booking →"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  scroll:    { padding: 16, paddingBottom: 100, gap: 12 },
  heading:   { color: "#fafafa", fontSize: 22, fontWeight: "800", marginBottom: 4 },
  card:      { backgroundColor: "#18181b", borderRadius: 14, padding: 14, gap: 6, borderWidth: 1, borderColor: "#27272a" },
  cardTitle: { color: "#fafafa", fontWeight: "700", fontSize: 14, marginBottom: 4 },
  row:       { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  rowKey:    { color: "#71717a", fontSize: 13 },
  rowVal:    { color: "#fafafa", fontWeight: "500", fontSize: 13, flex: 1, textAlign: "right" },
  muted:     { color: "#71717a", fontSize: 13 },
  stepBtn:   { width: 38, height: 38, borderRadius: 19, backgroundColor: "#27272a", alignItems: "center", justifyContent: "center" },
  stepBtnText: { color: "#fafafa", fontSize: 22, lineHeight: 26 },
  partyNum:  { color: "#fafafa", fontSize: 20, fontWeight: "800", minWidth: 36, textAlign: "center" },
  input:     { backgroundColor: "#27272a", borderRadius: 10, padding: 10, color: "#fafafa", fontSize: 14, marginTop: 8 },
  footer:    { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#09090b", padding: 16, borderTopWidth: 1, borderTopColor: "#27272a" },
  btn:       { backgroundColor: "#f97316", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  btnText:   { color: "#fff", fontWeight: "800", fontSize: 16 },
});
