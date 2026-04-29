import { View, Text, TouchableOpacity, ScrollView, StyleSheet, FlatList } from "react-native";

export type AvailType = "TABLE" | "BUFFET" | "EVENT_HALL";

const PERIODS = [
  { label: "🌅 Morning",   range: [0, 12] as [number, number] },
  { label: "☀️ Afternoon", range: [12, 17] as [number, number] },
  { label: "🌙 Evening",   range: [17, 24] as [number, number] },
];

interface Props {
  type:     AvailType;
  slots:    any[];
  selected: any | null;
  onSelect: (slot: any) => void;
}

function getHour(time: string) { return parseInt(time.split(":")[0] ?? "0", 10); }

export function AvailabilityGrid({ type, slots, selected, onSelect }: Props) {
  if (!slots.length) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyIcon}>📅</Text>
        <Text style={s.emptyText}>No slots available. Try another date.</Text>
      </View>
    );
  }

  if (type === "TABLE") {
    // Deduplicate by time — show count of available tables per slot
    const timeMap = new Map<string, { available: number; total: number; slot: any }>();
    for (const sl of slots) {
      const prev = timeMap.get(sl.time);
      timeMap.set(sl.time, {
        available: (prev?.available ?? 0) + (sl.isAvailable ? 1 : 0),
        total:     (prev?.total     ?? 0) + 1,
        slot:      prev?.slot ?? sl,
      });
    }

    return (
      <View style={{ gap: 16 }}>
        {PERIODS.map(({ label, range }) => {
          const period = Array.from(timeMap.entries())
            .filter(([t]) => { const h = getHour(t); return h >= range[0] && h < range[1]; })
            .sort(([a], [b]) => a.localeCompare(b));
          if (!period.length) return null;
          return (
            <View key={label}>
              <Text style={s.periodLabel}>{label}</Text>
              <View style={s.grid}>
                {period.map(([time, { available, total, slot }]) => {
                  const isSel = selected?.time === time;
                  const avail = available > 0;
                  return (
                    <TouchableOpacity key={time} disabled={!avail} onPress={() => onSelect({ ...slot, isAvailable: true })}
                      style={[s.slot, isSel && s.slotSelected, !avail && s.slotFull]}>
                      <Text style={[s.slotTime, isSel && { color: "#fff" }, !avail && { color: "#71717a" }]}>{time}</Text>
                      <Text style={[s.slotCount, !avail && { color: "#f87171" }]}>
                        {avail ? `${available}/${total}` : "Full"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  if (type === "BUFFET") {
    return (
      <View style={{ gap: 12 }}>
        {slots.map((sess: any) => {
          const isSel = selected?.sessionId === sess.sessionId;
          const pct   = sess.availableSeats / sess.maxCapacity;
          return (
            <TouchableOpacity key={sess.sessionId} disabled={!sess.isAvailable} onPress={() => onSelect(sess)}
              style={[s.sessionCard, isSel && s.sessionCardSelected]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={s.sessionName}>{sess.name}</Text>
                <Text style={s.sessionPrice}>₹{Number(sess.pricePerHead).toLocaleString("en-IN")}/head</Text>
              </View>
              <Text style={s.sessionTime}>{sess.startTime} – {sess.endTime}</Text>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${Math.min(100, (1 - pct) * 100)}%` as any, backgroundColor: pct > 0.4 ? "#4ade80" : pct > 0.2 ? "#fbbf24" : "#f87171" }]} />
              </View>
              <Text style={s.spotsLeft}>{sess.availableSeats} of {sess.maxCapacity} spots left</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // EVENT_HALL
  return (
    <View style={{ gap: 12 }}>
      {slots.map((hall: any) => {
        const isSel = selected?.hallId === hall.hallId;
        return (
          <TouchableOpacity key={hall.hallId} disabled={!hall.isAvailable} onPress={() => onSelect(hall)}
            style={[s.sessionCard, isSel && s.sessionCardSelected, !hall.isAvailable && s.sessionCardFull]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={s.sessionName}>{hall.name}</Text>
              <Text style={hall.isAvailable ? s.sessionPrice : { color: "#f87171", fontSize: 13, fontWeight: "600" }}>
                {hall.isAvailable ? `₹${Number(hall.pricePerDay).toLocaleString("en-IN")}/day` : "Unavailable"}
              </Text>
            </View>
            <Text style={s.sessionTime}>Capacity: {hall.capacity} guests</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {hall.amenities?.map((a: string) => (
                <Text key={a} style={s.amenityChip}>{a}</Text>
              ))}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  empty:             { alignItems: "center", paddingVertical: 40 },
  emptyIcon:         { fontSize: 36, marginBottom: 8 },
  emptyText:         { color: "#71717a", textAlign: "center" },
  periodLabel:       { color: "#a1a1aa", fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  grid:              { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot:              { width: 80, paddingVertical: 10, borderRadius: 10, backgroundColor: "rgba(34,197,94,0.08)", borderWidth: 1, borderColor: "rgba(34,197,94,0.2)", alignItems: "center" },
  slotSelected:      { backgroundColor: "rgba(249,115,22,0.2)", borderColor: "#f97316" },
  slotFull:          { backgroundColor: "rgba(239,68,68,0.07)", borderColor: "rgba(239,68,68,0.15)", opacity: 0.6 },
  slotTime:          { color: "#4ade80", fontWeight: "700", fontSize: 13 },
  slotCount:         { color: "#a1a1aa", fontSize: 11, marginTop: 2 },
  sessionCard:       { backgroundColor: "#18181b", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#27272a" },
  sessionCardSelected:{ borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.07)" },
  sessionCardFull:   { opacity: 0.5 },
  sessionName:       { color: "#fafafa", fontWeight: "700", fontSize: 14 },
  sessionPrice:      { color: "#f97316", fontSize: 13, fontWeight: "700" },
  sessionTime:       { color: "#71717a", fontSize: 12, marginTop: 4 },
  progressBg:        { height: 6, backgroundColor: "#27272a", borderRadius: 3, marginTop: 10, overflow: "hidden" },
  progressFill:      { height: "100%", borderRadius: 3 },
  spotsLeft:         { color: "#a1a1aa", fontSize: 12, marginTop: 4 },
  amenityChip:       { backgroundColor: "#27272a", color: "#a1a1aa", fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
});
