"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { get, post } from "@dinespot/utils/api";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { tokenStorage } from "@dinespot/utils/api";
import Link from "next/link";

const STEPS = ["Select Details", "Review Info", "Secure Payment"];
const PLATFORM_FEE = 29;
const TAX_RATE     = 0.05;

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ marginBottom: "4rem" }} className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0" }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", display: "grid", placeItems: "center",
              fontWeight: 800, fontSize: "0.875rem", transition: "all 500ms cubic-bezier(0.23, 1, 0.32, 1)",
              background: i < step ? "var(--brand-500)" : i === step ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.05)",
              border: `2px solid ${i <= step ? "var(--brand-500)" : "var(--border)"}`,
              color: i <= step ? (i < step ? "#fff" : "var(--brand-400)") : "var(--text-muted)",
              boxShadow: i === step ? "0 0 20px rgba(249,115,22,0.3)" : "none"
            }}>
              {i < step ? "✓" : i + 1}
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: "0.75rem", marginRight: i < STEPS.length - 1 ? "1.5rem" : 0 }}>
               <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Step {i+1}</span>
               <span style={{ fontSize: "0.9375rem", color: i === step ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: i === step ? 700 : 500 }} className="desktop-label">
                {label}
               </span>
            </div>
            {i < STEPS.length - 1 && <div style={{ width: 60, height: 1, background: i < step ? "var(--brand-500)" : "var(--border)", transition: "background 500ms", marginRight: "1.5rem" }} className="desktop-label" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingPageInner({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const sp     = useSearchParams();
  const bookingType = (sp.get("type") ?? "TABLE") as "TABLE" | "BUFFET" | "EVENT_HALL";
  const date        = sp.get("date") ?? "";
  const venueId     = sp.get("venueId") ?? "";
  const initialParty= parseInt(sp.get("partySize") ?? "2", 10);
  const startTime   = sp.get("startTime") ?? "19:00";
  const endTime     = sp.get("endTime")   ?? "21:00";
  const basePrice   = parseInt(sp.get("basePrice") ?? "0", 10);
  const venueName   = sp.get("venueName") ?? "";

  const [step,       setStep]       = useState(0);
  const [party,      setParty]      = useState(initialParty);
  const [special,    setSpecial]    = useState("");
  const [restaurant, setRestaurant] = useState<Record<string, any> | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  useEffect(() => {
    get<Record<string, any>>(`/restaurants/${restaurantId}`).then(setRestaurant).catch(() => {});
  }, [restaurantId]);

  const taxAmount      = Math.round(basePrice * party * TAX_RATE);
  const totalAmount    = basePrice * party + taxAmount + (basePrice > 0 ? PLATFORM_FEE : 0);

  const handlePayment = async () => {
    if (!tokenStorage.getAccess()) { router.push("/auth/login"); return; }
    setLoading(true); setError("");
    try {
      const body: Record<string, unknown> = {
        restaurantId, bookingType, date, partySize: party,
        startTime, endTime, specialRequests: special || undefined,
        totalAmount: totalAmount,
        paymentMethod: totalAmount > 0 ? "ONLINE" : "AT_VENUE",
      };
      if (bookingType === "TABLE")      body.tableId        = venueId;
      if (bookingType === "BUFFET")     body.buffetSessionId = venueId;
      if (bookingType === "EVENT_HALL") body.eventHallId    = venueId;

      const result = await post<{ booking: { id: string; referenceCode: string }; payment: { orderId: string; amount: number; keyId: string } | null }>("/bookings", body);

      if (result.payment) {
        const user = await get<{ name: string; email: string; phone: string }>("/auth/me");
        await openRazorpayCheckout({
          orderId: result.payment.orderId,
          amount:  result.payment.amount,
          keyId:   result.payment.keyId,
          bookingId: result.booking.id,
          description: `${restaurant?.name ?? "Restaurant"} — ${bookingType}`,
          userName:  user.name, userEmail: user.email, userPhone: user.phone,
          onSuccess: async (rzpRes) => {
            await post("/payments/verify", { ...rzpRes, bookingId: result.booking.id });
            router.push(`/booking/confirmation/${result.booking.id}`);
          },
          onDismiss: () => setLoading(false),
        });
      } else {
        router.push(`/booking/confirmation/${result.booking.id}`);
      }
    } catch (err: unknown) { 
      setError(err instanceof Error ? err.message : "Booking failed. Try again."); 
      setLoading(false); 
    }
  };

  const venueTypeLabel = { TABLE: "Exclusive Table", BUFFET: "Luxury Buffet", EVENT_HALL: "Grand Event Hall" }[bookingType];
  const formattedDate  = date ? new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <div className="bg-grid animate-fade-in" style={{ minHeight: "100vh", background: "var(--bg-primary)", paddingTop: "8rem", paddingBottom: "8rem" }}>
      <div className="hero-glow" style={{ top: "0", opacity: 0.2 }} />
      
      <div className="container" style={{ maxWidth: 720, position: "relative", zIndex: 10 }}>
        <ProgressBar step={step} />

        {/* ── Step 0: Selection Confirmation ── */}
        {step === 0 && (
          <div className="soft-glass animate-fade-up" style={{ padding: "3.5rem", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-2xl)" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "2.5rem", letterSpacing: "-0.04em" }}>Confirm Selection</h1>

            {/* Premium Info Card */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "2rem", marginBottom: "2.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: 700, textTransform: "uppercase" }}>Restaurant</span>
                <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--brand-400)" }}>{restaurant?.name ?? "…"}</span>
              </div>
              <div style={{ height: 1, background: "var(--border)" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Experience</span>
                <span style={{ fontWeight: 700 }}>{venueTypeLabel}</span>
              </div>
              {venueName && <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Venue Spot</span>
                <span style={{ fontWeight: 700 }}>{venueName}</span>
              </div>}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Schedule</span>
                <span style={{ fontWeight: 700 }}>{formattedDate}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Time Slot</span>
                <span style={{ fontWeight: 700 }}>{startTime} – {endTime}</span>
              </div>
            </div>

            {/* Party Size Selector */}
            <div style={{ marginBottom: "2.5rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1.25rem", paddingLeft: "0.5rem" }}>Party Size</label>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "rgba(255,255,255,0.03)", padding: "0.5rem", borderRadius: "var(--radius-full)", border: "1px solid var(--border)" }}>
                  <button onClick={() => setParty(p => Math.max(1, p-1))} className="btn btn-secondary btn-icon" style={{ background: "rgba(255,255,255,0.05)" }}>−</button>
                  <span style={{ fontSize: "1.75rem", fontWeight: 900, minWidth: 60, textAlign: "center" }}>{party}</span>
                  <button onClick={() => setParty(p => p+1)} className="btn btn-secondary btn-icon" style={{ background: "rgba(255,255,255,0.05)" }}>+</button>
                </div>
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>Guests for this experience</span>
              </div>
            </div>

            {/* Special Requests */}
            <div style={{ marginBottom: "3rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem", paddingLeft: "0.5rem" }}>Special Requests</label>
              <textarea 
                className="input" 
                value={special} 
                onChange={e => setSpecial(e.target.value)} 
                rows={4} 
                maxLength={1000} 
                placeholder="Dietary requirements, celebrations, or seating preferences…" 
                style={{ resize: "none", borderRadius: "var(--radius-xl)" }} 
              />
            </div>

            <button onClick={() => setStep(1)} className="btn btn-primary btn-lg" style={{ width: "100%", borderRadius: "var(--radius-xl)" }}>
              Continue to Review →
            </button>
          </div>
        )}

        {/* ── Step 1: Review Summary ── */}
        {step === 1 && (
          <div className="soft-glass animate-fade-up" style={{ padding: "3.5rem", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-2xl)" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "2.5rem", letterSpacing: "-0.04em" }}>Review Details</h1>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "3rem" }}>
              {[
                ["Restaurant",    restaurant?.name ?? "…"],
                ["Experience",    venueTypeLabel],
                ...(venueName ? [["Spot", venueName]] : []),
                ["Date",          formattedDate],
                ["Duration",      `${startTime} – ${endTime}`],
                ["Guests",        `${party} People`],
                ...(special ? [["Requests", special]] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", paddingBottom: "1.25rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: 600 }}>{k}</span>
                  <span style={{ fontWeight: 800, textAlign: "right", maxWidth: "60%" }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Premium Price Breakdown */}
            {basePrice > 0 ? (
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "var(--radius-xl)", padding: "2rem", marginBottom: "3rem", border: "1px solid var(--border)" }}>
                <h3 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "1.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Booking Summary</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                   <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1rem" }}>
                     <span style={{ color: "var(--text-secondary)" }}>Base Price (₹{basePrice} × {party})</span>
                     <span style={{ fontWeight: 700 }}>₹{(basePrice * party).toLocaleString("en-IN")}</span>
                   </div>
                   <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1rem" }}>
                     <span style={{ color: "var(--text-secondary)" }}>Service Tax (5%)</span>
                     <span style={{ fontWeight: 700 }}>₹{taxAmount.toLocaleString("en-IN")}</span>
                   </div>
                   <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1rem" }}>
                     <span style={{ color: "var(--text-secondary)" }}>Platform Convenience</span>
                     <span style={{ fontWeight: 700 }}>₹{PLATFORM_FEE}</span>
                   </div>
                </div>
                <div style={{ height: 1, background: "var(--border)", margin: "1.5rem 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "1.5rem" }}>
                  <span>Total Amount</span>
                  <span className="gradient-text">₹{totalAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            ) : (
              <div style={{ background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "var(--radius-xl)", padding: "1.5rem", marginBottom: "3rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                 <span style={{ fontSize: "1.5rem" }}>✅</span>
                 <span style={{ color: "var(--accent-green)", fontWeight: 700 }}>Complimentary reservation. You'll settle the bill at the venue.</span>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={() => setStep(0)} className="btn btn-secondary" style={{ flex: 1, height: "3.5rem" }}>← Back</button>
              <button onClick={() => setStep(2)} className="btn btn-primary" style={{ flex: 2, height: "3.5rem", fontWeight: 800 }}>Confirm & Proceed →</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Payment Gateway Interface ── */}
        {step === 2 && (
          <div className="soft-glass animate-fade-up" style={{ padding: "3.5rem", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-2xl)" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "2.5rem", letterSpacing: "-0.04em" }}>Secure Payment</h1>

            <div style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(249,115,22,0.02))", border: "1px solid rgba(249,115,22,0.15)", borderRadius: "var(--radius-xl)", padding: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: "1.25rem", marginBottom: "0.25rem" }}>{restaurant?.name}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", fontWeight: 600 }}>{venueTypeLabel} · {formattedDate}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                 <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--brand-400)", textTransform: "uppercase", marginBottom: "0.25rem" }}>Payable Amount</div>
                 <div style={{ fontSize: "2rem", fontWeight: 900 }}>
                   {totalAmount > 0 ? `₹${totalAmount.toLocaleString("en-IN")}` : "FREE"}
                 </div>
              </div>
            </div>

            <div style={{ marginBottom: "2.5rem" }}>
               <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>Available payment methods through Razorpay:</p>
               <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                 {["UPI", "Credit/Debit", "NetBanking", "Wallets"].map(m => (
                   <span key={m} className="soft-glass" style={{ padding: "0.6rem 1.25rem", borderRadius: "var(--radius-lg)", fontSize: "0.8125rem", fontWeight: 700 }}>{m}</span>
                 ))}
               </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "3rem" }}>
              <span style={{ fontSize: "1.25rem" }}>🔒</span>
              <span>Your transaction is encrypted and secured by Razorpay 256-bit SSL.</span>
            </div>

            {error && (
              <div className="animate-fade-in" style={{ padding: "1rem", borderRadius: "var(--radius-lg)", background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)", fontSize: "0.875rem", marginBottom: "2rem", textAlign: "center" }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={() => setStep(1)} disabled={loading} className="btn btn-secondary" style={{ flex: 1, height: "3.5rem" }}>← Back</button>
              <button onClick={handlePayment} disabled={loading} className="btn btn-primary" style={{ flex: 2, height: "3.5rem", fontWeight: 900, fontSize: "1.125rem" }}>
                {loading ? "Processing..." : totalAmount > 0 ? `Pay ₹${totalAmount.toLocaleString("en-IN")} →` : "Confirm Reservation →"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .desktop-label { display: inline; }
        @media(max-width:580px){ 
          .desktop-label { display: none; } 
          .soft-glass { padding: 2rem !important; }
        }
      `}</style>
    </div>
  );
}

export default function BookingPage({ params }: { params: { restaurantId: string } }) {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
           <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(249,115,22,0.1)", borderTopColor: "var(--brand-500)", animation: "spin 1s linear infinite" }} />
           <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Preparing your reservation...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <BookingPageInner restaurantId={params.restaurantId} />
    </Suspense>
  );
}
