"use client";

export interface Slot {
  time:     string;
  endTime:  string;
  tableId:  string;
  tableNumber: string;
  section:  string | null;
  capacity: number;
  isAvailable: boolean;
}

interface Props {
  slots:      Slot[];
  selected?:  Slot | null;
  onSelect:   (slot: Slot) => void;
  loading?:   boolean;
}

const PERIODS = [
  { label: "🌅 Morning",   range: [0, 12] },
  { label: "☀️ Afternoon", range: [12, 17] },
  { label: "🌙 Evening",   range: [17, 24] },
];

function getHour(time: string) { return parseInt(time.split(":")[0] ?? "0", 10); }

function slotColor(slot: Slot, isSelected: boolean): { bg: string; border: string; color: string } {
  if (isSelected) return { bg: "rgba(249,115,22,0.25)", border: "var(--brand-500)", color: "#fff" };
  if (!slot.isAvailable) return { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", color: "#f87171" };
  return { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", color: "#4ade80" };
}

export function AvailabilityGrid({ slots, selected, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px,1fr))", gap: "0.5rem" }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{ height: 62, borderRadius: "var(--radius-md)", background: "var(--bg-hover)", animation: "shimmer 1.5s infinite" }} />
        ))}
      </div>
    );
  }

  if (!slots.length) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📅</div>
        <p>No slots available for this date. Try another day.</p>
      </div>
    );
  }

  // Deduplicate by time (show unique time slots across tables)
  const timeMap = new Map<string, { available: number; total: number; slot: Slot }>();
  for (const s of slots) {
    const k = s.time;
    const prev = timeMap.get(k);
    if (!prev) {
      timeMap.set(k, { available: s.isAvailable ? 1 : 0, total: 1, slot: s });
    } else {
      timeMap.set(k, { available: prev.available + (s.isAvailable ? 1 : 0), total: prev.total + 1, slot: prev.slot });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {PERIODS.map(({ label, range }) => {
        const periodSlots = Array.from(timeMap.entries())
          .filter(([t]) => { const h = getHour(t); return h >= range[0]! && h < range[1]!; })
          .sort(([a], [b]) => a.localeCompare(b));
        if (!periodSlots.length) return null;
        return (
          <div key={label}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.625rem" }}>{label}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: "0.5rem" }}>
              {periodSlots.map(([time, { available, total, slot }]) => {
                const isSelected = selected?.time === time;
                const { bg, border, color } = slotColor({ ...slot, isAvailable: available > 0 }, isSelected);
                return (
                  <button key={time} onClick={() => available > 0 && onSelect({ ...slot, isAvailable: available > 0 })}
                    disabled={available === 0}
                    style={{
                      background: bg, border: `1px solid ${border}`, borderRadius: "var(--radius-md)",
                      padding: "0.5rem 0.25rem", cursor: available > 0 ? "pointer" : "not-allowed",
                      transition: "all var(--transition)", transform: isSelected ? "scale(1.03)" : "none",
                      opacity: available === 0 ? 0.5 : 1,
                    }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 700, color }}>{time}</div>
                    <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      {available === 0 ? "Full" : `${available}/${total} free`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
