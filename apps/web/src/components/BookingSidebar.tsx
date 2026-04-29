"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { post, tokenStorage } from "@dinespot/utils/api";
import type { Slot } from "./AvailabilityGrid";

interface Props {
  open:         boolean;
  onClose:      () => void;
  restaurantId: string;
  restaurantName: string;
  slot:         Slot | null;
  date:         string;
  buffetSession?: { sessionId: string; name: string; startTime: string; endTime: string; pricePerHead: number } | null;
  eventHall?:   { hallId: string; name: string; pricePerDay: number } | null;
  bookingType:  "TABLE" | "BUFFET" | "EVENT_HALL";
}

export function BookingSidebar({ open, onClose, restaurantId, restaurantName, slot, date, buffetSession, eventHall, bookingType }: Props) {
  const router    = useRouter();
  const [party,   setParty]   = useState(2);
  const [special, setSpecial] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  if (!open) return null;

  const totalAmount = () => {
    if (bookingType === "BUFFET" && buffetSession) return buffetSession.pricePerHead * party;
    if (bookingType === "EVENT_HALL" && eventHall) return eventHall.pricePerDay;
    return 0; // TABLE — pay at venue
  };

  const handleBook = async () => {
    if (!tokenStorage.getAccess()) { router.push("/auth/login"); return; }
    setLoading(true); setError("");
    try {
      const body: Record<string, unknown> = {
        restaurantId, bookingType, date, partySize: party,
        totalAmount: totalAmount(),
        paymentMethod: totalAmount() > 0 ? "ONLINE" : "AT_VENUE",
        specialRequests: special || undefined,
      };
      if (bookingType === "TABLE" && slot)             { body.tableId = slot.tableId; body.startTime = slot.time; body.endTime = slot.endTime; }
      if (bookingType === "BUFFET" && buffetSession)   { body.buffetSessionId = buffetSession.sessionId; body.startTime = buffetSession.startTime; body.endTime = buffetSession.endTime; }
      if (bookingType === "EVENT_HALL" && eventHall)   { body.eventHallId = eventHall.hallId; body.startTime = "09:00"; body.endTime = "23:00"; }

      const result = await post<{ booking: { id: string; referenceCode: string }; payment: { orderId: string; amount: number; keyId: string } | null }>("/bookings", body);

      if (result.payment) {
        // Trigger Razorpay checkout
        router.push(`/checkout?bookingId=${result.booking.id}&orderId=${result.payment.orderId}&amount=${result.payment.amount}`);
      } else {
        router.push(`/dashboard/bookings?ref=${result.booking.referenceCode}&success=true`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create booking. Try again.");
    } finally { setLoading(false); }
  };

  const displayTime = slot ? `${slot.time} – ${slot.endTime}` : buffetSession ? `${buffetSession.startTime} – ${buffetSession.endTime}` : "Full day";
  const venue       = slot ? `Table ${slot.tableNumber}${slot.section ? ` (${slot.section})` : ""}` : buffetSession?.name ?? eventHall?.name ?? "";

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, backdropFilter: "blur(4px)" }} />
      {/* Panel */}
      <div className="glass animate-fade-up" style={{ position: "fixed", bottom: 0, right: 0, top: 0, width: "min(440px, 100vw)", zIndex: 101, overflowY: "auto", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Confirm Booking</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ fontSize: "1.25rem" }}>✕</button>
        </div>

        {/* Summary card */}
        <div style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: "var(--radius-md)", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ fontWeight: 700, fontSize: "1rem" }}>{restaurantName}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>📅 {date} · ⏰ {displayTime}</div>
          {venue && <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>🪑 {venue}</div>}
        </div>

        {/* Party size */}
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.625rem" }}>Party Size</label>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button onClick={() => setParty(p => Math.max(1, p - 1))} className="btn btn-secondary" style={{ width: 36, height: 36, padding: 0, fontSize: "1.25rem" }}>−</button>
            <span style={{ fontSize: "1.25rem", fontWeight: 700, minWidth: 32, textAlign: "center" }}>{party}</span>
            <button onClick={() => setParty(p => Math.min(slot?.capacity ?? 500, p + 1))} className="btn btn-secondary" style={{ width: 36, height: 36, padding: 0, fontSize: "1.25rem" }}>+</button>
            <span style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>guests</span>
          </div>
        </div>

        {/* Special requests */}
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Special Requests <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
          <textarea className="input" value={special} onChange={e => setSpecial(e.target.value)} rows={3} placeholder="Dietary requirements, seating preferences, celebration details…" style={{ resize: "none" }} />
        </div>

        {/* Price */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.875rem 1rem", background: "rgba(255,255,255,0.04)", borderRadius: "var(--radius-md)" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>Total Amount</span>
          <span style={{ fontWeight: 700, fontSize: "1.125rem", color: totalAmount() > 0 ? "var(--brand-400)" : "var(--text-primary)" }}>
            {totalAmount() > 0 ? `₹${totalAmount().toLocaleString("en-IN")}` : "Pay at venue"}
          </span>
        </div>

        {error && <div style={{ padding: "0.75rem", borderRadius: "var(--radius-md)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: "0.875rem" }}>⚠️ {error}</div>}

        <button onClick={handleBook} disabled={loading} className="btn btn-primary" style={{ padding: "0.875rem", fontSize: "1rem", marginTop: "auto" }}>
          {loading ? "Creating booking…" : totalAmount() > 0 ? `Pay ₹${totalAmount().toLocaleString("en-IN")} →` : "Confirm Booking →"}
        </button>
        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>Free cancellation up to 2 hours before your booking</p>
      </div>
    </>
  );
}
