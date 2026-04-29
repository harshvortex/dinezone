"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { get } from "@dinespot/utils/api";

interface Booking {
  id: string; referenceCode: string; bookingType: string;
  date: string; startTime: string; endTime: string; partySize: number;
  totalAmount: number; paymentId: string; paymentStatus: string;
  status: string;
  restaurant: { id: string; name: string; address: string; city: string };
  table?: { tableNumber: string; section: string };
  buffetSession?: { name: string };
  eventHall?: { name: string };
}

function generateICS(booking: Booking): string {
  const d = new Date(booking.date);
  const [sh, sm] = booking.startTime.split(":").map(Number);
  const [eh, em] = booking.endTime.split(":").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dtStr = (y: number, mo: number, d: number, h: number, m: number) =>
    `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(m)}00`;
  const start = dtStr(d.getFullYear(), d.getMonth()+1, d.getDate(), sh ?? 0, sm ?? 0);
  const end   = dtStr(d.getFullYear(), d.getMonth()+1, d.getDate(), eh ?? 0, em ?? 0);
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//DineSpot//EN",
    "BEGIN:VEVENT",
    `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:DineSpot — ${booking.restaurant.name}`,
    `DESCRIPTION:Ref: ${booking.referenceCode}\\nParty of ${booking.partySize}`,
    `LOCATION:${booking.restaurant.address}, ${booking.restaurant.city}`,
    `UID:${booking.id}@dinespot.app`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

function downloadICS(booking: Booking) {
  const blob = new Blob([generateICS(booking)], { type: "text/calendar;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `dinespot-${booking.referenceCode}.ics`; a.click();
  URL.revokeObjectURL(url);
}

function shareWhatsApp(booking: Booking) {
  const msg = encodeURIComponent(`🍽️ I just booked an experience at *${booking.restaurant.name}* via DineSpot!\n📅 ${new Date(booking.date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})} at ${booking.startTime}\n👥 Party of ${booking.partySize}\nRef: ${booking.referenceCode}`);
  window.open(`https://wa.me/?text=${msg}`, "_blank");
}

export default function ConfirmationPage({ params }: { params: { bookingId: string } }) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    get<{ data: Booking }>(`/bookings/${params.bookingId}`)
      .then(r => { 
        setBooking((r as any).data ?? r); 
        setTimeout(() => setVisible(true), 200); 
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.bookingId]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(249,115,22,0.1)", borderTopColor: "var(--brand-500)", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!booking) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", padding: "2rem" }}>
      <div className="soft-glass" style={{ padding: "3rem", borderRadius: "var(--radius-2xl)", textAlign: "center" }}>
        <p style={{ marginBottom: "1.5rem", fontSize: "1.125rem", color: "var(--text-secondary)" }}>Booking details could not be retrieved.</p>
        <Link href="/dashboard/bookings" className="btn btn-primary">View My Bookings</Link>
      </div>
    </div>
  );

  const venue = booking.table ? `Table ${booking.table.tableNumber}${booking.table.section ? ` (${booking.table.section})` : ""}` : booking.buffetSession?.name ?? booking.eventHall?.name ?? booking.bookingType;
  const formattedDate = new Date(booking.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="bg-grid animate-fade-in" style={{ minHeight: "100vh", background: "var(--bg-primary)", paddingTop: "8rem", paddingBottom: "8rem", display: "grid", placeItems: "center" }}>
      <div className="hero-glow" style={{ top: "0", opacity: 0.3 }} />
      
      <div style={{ width: "100%", maxWidth: 600, padding: "0 2rem", position: "relative", zIndex: 10 }}>
        {/* Celebration Header */}
        <div style={{ textAlign: "center", marginBottom: "3.5rem", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(20px)", transition: "all 800ms cubic-bezier(0.23, 1, 0.32, 1)" }}>
          <div style={{ 
            width: 88, height: 88, borderRadius: "50%", 
            background: "rgba(34,197,94,0.1)", 
            border: "2px solid rgba(34,197,94,0.3)", 
            display: "grid", placeItems: "center", 
            margin: "0 auto 2rem", fontSize: "3rem",
            boxShadow: "0 0 40px rgba(34,197,94,0.2)",
            animation: "pulse-glow 2s infinite"
          }}>
            ✨
          </div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 900, marginBottom: "0.75rem", letterSpacing: "-0.04em" }}>Booking Secured</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.125rem", fontWeight: 500 }}>Your exceptional dining experience awaits at {booking.restaurant.name}.</p>
        </div>

        <div className="soft-glass" style={{ 
          borderRadius: "var(--radius-2xl)", 
          padding: "3rem", 
          marginBottom: "2.5rem", 
          opacity: visible ? 1 : 0, 
          transform: visible ? "none" : "translateY(15px)", 
          transition: "all 800ms cubic-bezier(0.23, 1, 0.32, 1) 200ms",
          boxShadow: "var(--shadow-2xl)",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Decorative Corner */}
          <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", background: "linear-gradient(225deg, rgba(249,115,22,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2.5rem" }}>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: "1.25rem", marginBottom: "0.5rem", color: "var(--brand-400)" }}>{booking.restaurant.name}</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>{booking.restaurant.address}, {booking.restaurant.city}</p>
            </div>
            <span className="badge-green" style={{ fontSize: "0.75rem", padding: "0.4rem 1rem", borderRadius: "var(--radius-full)", fontWeight: 800 }}>CONFIRMED</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              ["Reference ID", booking.referenceCode],
              ["Date",         formattedDate],
              ["Time Slot",    `${booking.startTime} – ${booking.endTime}`],
              ["Assigned",     venue],
              ["Party Size",   `${booking.partySize} Guests`],
              ...(booking.totalAmount > 0 
                ? [["Investment", `₹${Number(booking.totalAmount).toLocaleString("en-IN")}`]] 
                : [["Payment", "At Venue"]])
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k}</span>
                <span style={{ fontWeight: 800, fontSize: "1rem" }}>{v}</span>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: "2.5rem", padding: "1.25rem", background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--border)", textAlign: "center" }}>
             <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 500 }}>
               Please present this confirmation or your Reference ID upon arrival.
             </p>
          </div>
        </div>

        {/* Sophisticated Actions */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "1rem", 
          opacity: visible ? 1 : 0, 
          transform: visible ? "none" : "translateY(10px)",
          transition: "all 800ms cubic-bezier(0.23, 1, 0.32, 1) 400ms" 
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <button onClick={() => downloadICS(booking)} className="btn btn-secondary" style={{ height: "3.5rem", fontWeight: 700, gap: "0.75rem" }}>
              🗓️ Add to Calendar
            </button>
            <button onClick={() => shareWhatsApp(booking)} className="btn btn-secondary" style={{ height: "3.5rem", fontWeight: 700, gap: "0.75rem", color: "#4ade80" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              Share with Guests
            </button>
          </div>
          <Link href="/dashboard" className="btn btn-secondary" style={{ height: "3.5rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
            📋 Manage My Experiences
          </Link>
          <Link href="/restaurants" className="btn btn-primary" style={{ height: "3.5rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
            🍽️ Explore More Experiences
          </Link>
        </div>
      </div>
    </div>
  );
}
