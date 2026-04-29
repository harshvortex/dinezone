"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { get, post, put } from "@dinespot/utils/api";
import { ReviewModal } from "@/components/ReviewModal";
import { io } from "socket.io-client";

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:    { bg: "rgba(250,204,21,0.1)", color: "#fde047", label: "Pending Approval" },
  CONFIRMED:  { bg: "rgba(34,197,94,0.1)",  color: "#4ade80", label: "Confirmed" },
  COMPLETED:  { bg: "rgba(99,102,241,0.1)", color: "#a5b4fc", label: "Experience Completed" },
  CANCELLED:  { bg: "rgba(239,68,68,0.1)",  color: "#f87171", label: "Cancelled" },
};

const TABS = ["My Experiences", "Personal Profile", "Notifications"] as const;
type Tab = typeof TABS[number];

type Booking = {
  id: string; referenceCode: string; bookingType: string;
  date: string; startTime: string; endTime: string; partySize: number;
  status: string; paymentStatus: string; totalAmount: number;
  restaurant: { id: string; name: string; coverImage?: string; city: string };
  table?: { tableNumber: string }; buffetSession?: { name: string }; eventHall?: { name: string };
  review?: { id: string; rating: number } | null;
  cancelledAt?: string;
};

type Notification = { id: string; title: string; message: string; isRead: boolean; createdAt: string; type: string };
type User = { id: string; name: string; email: string; phone?: string; avatar?: string; role: string };

function BookingCard({ b, onReview, onCancel }: { b: Booking; onReview: (b: Booking) => void; onCancel: (id: string) => void }) {
  const status  = STATUS_BADGE[b.status] ?? STATUS_BADGE.PENDING!;
  const isUpcoming = b.status === "CONFIRMED" || b.status === "PENDING";
  const date    = new Date(b.date);
  const bookingDT = new Date(`${b.date.split("T")[0]}T${b.startTime}:00`);
  const canCancel = isUpcoming && (bookingDT.getTime() - Date.now()) > 2 * 3600000;
  const venue   = b.table ? `Table ${b.table.tableNumber}` : b.buffetSession?.name ?? b.eventHall?.name ?? b.bookingType;

  return (
    <div className="soft-glass animate-fade-up" style={{ padding: "1.5rem", borderRadius: "var(--radius-xl)", display: "flex", gap: "1.5rem", alignItems: "center", border: "1px solid var(--border)" }}>
      {/* Image with Glow */}
      <div style={{ position: "relative", width: 88, height: 88, borderRadius: "var(--radius-lg)", overflow: "hidden", flexShrink: 0, boxShadow: "0 8px 16px rgba(0,0,0,0.4)" }}>
        {b.restaurant.coverImage 
          ? <img src={b.restaurant.coverImage} alt={b.restaurant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> 
          : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: "2rem", background: "var(--bg-secondary)" }}>🍽️</div>}
      </div>

      {/* Main Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
           <h3 style={{ fontWeight: 900, fontSize: "1.125rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{b.restaurant.name}</h3>
           <span style={{ fontSize: "0.7rem", fontWeight: 800, padding: "0.3rem 0.75rem", borderRadius: "var(--radius-full)", background: status.bg, color: status.color, textTransform: "uppercase", letterSpacing: "0.05em", border: `1px solid ${status.color}33` }}>
             {status.label}
           </span>
        </div>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem", fontWeight: 500 }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>📅 {date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>⏰ {b.startTime}</span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>👥 {b.partySize} Guests</span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>📍 {venue}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
           <div style={{ display: "flex", gap: "0.75rem" }}>
             {canCancel && <button onClick={() => onCancel(b.id)} className="btn btn-secondary btn-sm" style={{ color: "#f87171", borderRadius: "var(--radius-md)" }}>Cancel Request</button>}
             {isUpcoming && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.restaurant.name+", "+b.restaurant.city)}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ borderRadius: "var(--radius-md)" }}>Get Directions</a>}
             {b.status === "COMPLETED" && !b.review && <button onClick={() => onReview(b)} className="btn btn-primary btn-sm" style={{ borderRadius: "var(--radius-md)" }}>Share Feedback</button>}
             {b.status === "COMPLETED" && b.review && <span style={{ fontSize: "0.875rem", color: "#fbbf24", fontWeight: 700 }}>★ Rated {b.review.rating}/5</span>}
           </div>
           {b.totalAmount > 0 && (
             <span style={{ fontWeight: 800, color: "var(--brand-400)", fontSize: "1rem" }}>₹{Number(b.totalAmount).toLocaleString("en-IN")}</span>
           )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router      = useRouter();
  const [tab,       setTab]       = useState<Tab>("My Experiences");
  const [filter,    setFilter]    = useState("All");
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [notifs,    setNotifs]    = useState<Notification[]>([]);
  const [user,      setUser]      = useState<User | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [reviewFor, setReviewFor] = useState<Booking | null>(null);
  const [toast,     setToast]     = useState("");
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "" });
  const [saving,    setSaving]    = useState(false);
  const fileRef     = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      get<{ data: Booking[] }>("/bookings/my?limit=50"),
      get<User>("/auth/me"),
      get<{ data: Notification[] }>("/notifications?limit=30"),
    ]).then(([b, u, n]) => {
      setBookings((b as any).data ?? []);
      setUser(u);
      setProfileForm({ name: u.name, email: u.email, phone: u.phone ?? "" });
      setNotifs((n as any).data ?? []);
    }).catch(() => router.push("/auth/login")).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace("/api/v1", "");
    const socket  = io(apiBase, { transports: ["websocket"] });
    socket.on("notification:new", (n: Notification) => {
      setNotifs(prev => [n, ...prev]);
      setToast(n.title);
      setTimeout(() => setToast(""), 4000);
    });
    return () => { socket.disconnect(); };
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this experience?")) return;
    try {
      await put(`/bookings/${id}/cancel`, { reason: "User cancellation" });
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "CANCELLED" } : b));
      setToast("Experience cancelled");
      setTimeout(() => setToast(""), 3000);
    } catch (err: unknown) { 
      alert(err instanceof Error ? err.message : "Failed to cancel"); 
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await put("/users/me", profileForm);
      setToast("Profile successfully updated!");
      setTimeout(() => setToast(""), 3000);
    } catch { 
      setToast("Update failed"); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleMarkAllRead = async () => {
    await post("/notifications/read-all", {});
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const filteredBookings = bookings.filter(b => {
    if (filter === "Upcoming")  return ["CONFIRMED","PENDING"].includes(b.status);
    if (filter === "Completed") return b.status === "COMPLETED";
    if (filter === "Cancelled") return b.status === "CANCELLED";
    return true;
  });

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
       <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(249,115,22,0.1)", borderTopColor: "var(--brand-500)", animation: "spin 1s linear infinite" }} />
       <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="bg-grid animate-fade-in" style={{ minHeight: "100vh", background: "var(--bg-primary)", paddingTop: "8rem", paddingBottom: "8rem" }}>
      <div className="hero-glow" style={{ top: "0", opacity: 0.2 }} />
      
      {/* Toast Notification */}
      {toast && (
        <div className="animate-fade-up" style={{ position: "fixed", bottom: "2rem", right: "2rem", zIndex: 1000 }}>
          <div className="soft-glass" style={{ padding: "1rem 2rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--brand-500)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)", fontWeight: 700 }}>
             ✨ {toast}
          </div>
        </div>
      )}

      <div className="container">
        <div style={{ display: "flex", gap: "4rem", alignItems: "flex-start" }}>
          
          {/* Dashboard Sidebar */}
          <aside style={{ width: 300, flexShrink: 0, position: "sticky", top: "8rem" }} className="desktop-only">
            {user && (
              <div className="soft-glass" style={{ padding: "2.5rem", borderRadius: "var(--radius-2xl)", marginBottom: "1.5rem", textAlign: "center" }}>
                <div style={{ position: "relative", width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, var(--brand-500), var(--brand-700))", display: "grid", placeItems: "center", fontSize: "2rem", fontWeight: 900, color: "#fff", margin: "0 auto 1.5rem", boxShadow: "0 10px 20px rgba(249,115,22,0.3)" }}>
                  {user.avatar ? <img src={user.avatar} alt="me" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : user.name?.[0]?.toUpperCase()}
                </div>
                <h2 style={{ fontWeight: 900, fontSize: "1.25rem", marginBottom: "0.25rem", letterSpacing: "-0.02em" }}>{user.name}</h2>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.1em" }}>{user.role.replace("_", " ")} Member</p>
              </div>
            )}
            
            <div className="soft-glass" style={{ padding: "0.5rem", borderRadius: "var(--radius-xl)", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {TABS.map(t => {
                const isActive = tab === t;
                const unread = t === "Notifications" ? notifs.filter(n => !n.isRead).length : 0;
                return (
                  <button key={t} onClick={() => setTab(t)} style={{ 
                    padding: "1rem 1.5rem", borderRadius: "var(--radius-lg)", 
                    fontWeight: 700, fontSize: "0.9375rem", textAlign: "left",
                    transition: "all 0.3s",
                    background: isActive ? "var(--brand-500)" : "transparent",
                    color: isActive ? "#fff" : "var(--text-secondary)",
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    {t}
                    {unread > 0 && <span style={{ background: "#fff", color: "var(--brand-500)", borderRadius: "var(--radius-full)", padding: "0.1rem 0.5rem", fontSize: "0.7rem", fontWeight: 900 }}>{unread}</span>}
                  </button>
                );
              })}
              <div style={{ height: 1, background: "var(--border)", margin: "0.5rem" }} />
              <button onClick={() => { localStorage.clear(); window.location.href="/"; }} style={{ padding: "1rem 1.5rem", borderRadius: "var(--radius-lg)", fontWeight: 700, fontSize: "0.9375rem", textAlign: "left", color: "#f87171" }}>
                Sign Out
              </button>
            </div>
          </aside>

          {/* Dashboard Main Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Bookings View */}
            {tab === "My Experiences" && (
              <div className="animate-fade-in">
                <div style={{ marginBottom: "3rem" }}>
                   <h1 style={{ fontSize: "2.5rem", fontWeight: 900, marginBottom: "1rem", letterSpacing: "-0.04em" }}>My Experiences</h1>
                   <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                     {["All","Upcoming","Completed","Cancelled"].map(f => (
                       <button key={f} onClick={() => setFilter(f)} className={`btn ${filter === f ? "btn-primary" : "btn-secondary"}`} style={{ borderRadius: "var(--radius-full)", padding: "0.5rem 1.5rem", fontSize: "0.8125rem" }}>{f}</button>
                     ))}
                   </div>
                </div>

                {filteredBookings.length === 0 ? (
                  <div className="soft-glass" style={{ textAlign: "center", padding: "6rem 2rem", borderRadius: "var(--radius-2xl)", border: "1px dashed var(--border)" }}>
                    <div style={{ fontSize: "4rem", marginBottom: "1.5rem", opacity: 0.3 }}>🍽️</div>
                    <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>No {filter.toLowerCase()} experiences</h3>
                    <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>Ready for your next culinary adventure?</p>
                    <Link href="/restaurants" className="btn btn-primary" style={{ borderRadius: "var(--radius-full)" }}>Explore Restaurants</Link>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {filteredBookings.map(b => <BookingCard key={b.id} b={b} onReview={setReviewFor} onCancel={handleCancel} />)}
                  </div>
                )}
              </div>
            )}

            {/* Profile View */}
            {tab === "Personal Profile" && (
              <div className="animate-fade-in">
                <h1 style={{ fontSize: "2.5rem", fontWeight: 900, marginBottom: "3rem", letterSpacing: "-0.04em" }}>Profile Settings</h1>
                <div className="soft-glass" style={{ padding: "3.5rem", borderRadius: "var(--radius-2xl)" }}>
                  
                  {/* Avatar Upload */}
                  <div style={{ display: "flex", alignItems: "center", gap: "2.5rem", marginBottom: "3.5rem" }}>
                    <div style={{ position: "relative", width: 100, height: 100, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg, var(--brand-500), var(--brand-700))", display: "grid", placeItems: "center", fontSize: "2.5rem", fontWeight: 900, color: "#fff", flexShrink: 0, boxShadow: "0 15px 30px rgba(0,0,0,0.3)" }}>
                      {user?.avatar ? <img src={user.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: 800, marginBottom: "0.5rem" }}>Profile Picture</h4>
                      <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Professional avatars help in faster check-ins at venues.</p>
                      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const fd = new FormData(); fd.append("file", file);
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/avatar`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("ds_access_token")}` }, body: fd });
                        const json = await res.json();
                        if (json.success) setUser(u => u ? { ...u, avatar: json.data.url } : u);
                      }} />
                      <button onClick={() => fileRef.current?.click()} className="btn btn-secondary btn-sm" style={{ borderRadius: "var(--radius-md)" }}>Upload New Avatar</button>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    {[{ l: "Full Name", k: "name", t: "text" }, { l: "Email address", k: "email", t: "email" }, { l: "Phone number", k: "phone", t: "tel" }].map(({ l, k, t }) => (
                      <div key={k} style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                        <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: "0.5rem" }}>{l}</label>
                        <input className="input" type={t} value={(profileForm as any)[k]} onChange={e => setProfileForm(p => ({ ...p, [k]: e.target.value }))} style={{ background: "rgba(255,255,255,0.02)" }} />
                      </div>
                    ))}
                    
                    <button onClick={handleSaveProfile} disabled={saving} className="btn btn-primary btn-lg" style={{ width: "100%", borderRadius: "var(--radius-lg)", marginTop: "1rem" }}>
                      {saving ? "Saving Changes..." : "Update Profile Info"}
                    </button>
                  </div>

                  <div style={{ height: 1, background: "var(--border)", margin: "3rem 0" }} />
                  
                  <div style={{ background: "rgba(239,68,68,0.02)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "var(--radius-xl)", padding: "2rem" }}>
                    <h3 style={{ fontWeight: 900, color: "#f87171", fontSize: "1.125rem", marginBottom: "0.5rem" }}>Account Security</h3>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>Once deleted, all your booking history and rewards will be permanently removed.</p>
                    <button className="btn btn-secondary btn-sm" style={{ color: "#f87171", borderRadius: "var(--radius-md)" }} onClick={() => confirm("This action is irreversible. Delete account?") && router.push("/auth/delete-account")}>Permanently Delete Account</button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications View */}
            {tab === "Notifications" && (
              <div className="animate-fade-in">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "3rem" }}>
                  <h1 style={{ fontSize: "2.5rem", fontWeight: 900, letterSpacing: "-0.04em" }}>Notifications</h1>
                  {notifs.some(n => !n.isRead) && <button onClick={handleMarkAllRead} className="btn btn-secondary btn-sm" style={{ borderRadius: "var(--radius-full)" }}>Clear All Unread</button>}
                </div>

                {notifs.length === 0 ? (
                  <div className="soft-glass" style={{ textAlign: "center", padding: "6rem 2rem", borderRadius: "var(--radius-2xl)", border: "1px dashed var(--border)" }}>
                    <div style={{ fontSize: "3.5rem", marginBottom: "1.5rem", opacity: 0.3 }}>🔔</div>
                    <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>You're all caught up</h3>
                    <p style={{ color: "var(--text-secondary)" }}>New alerts and booking updates will appear here.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {notifs.map(n => (
                      <div key={n.id} className="soft-glass" style={{ 
                        padding: "1.5rem", borderRadius: "var(--radius-xl)", 
                        display: "flex", gap: "1.25rem", alignItems: "center", 
                        opacity: n.isRead ? 0.7 : 1, 
                        border: n.isRead ? "1px solid var(--border)" : "1px solid var(--brand-500)",
                        background: n.isRead ? "transparent" : "rgba(249,115,22,0.03)"
                      }}>
                        <div style={{ width: 48, height: 48, borderRadius: "12px", background: n.isRead ? "rgba(255,255,255,0.05)" : "var(--brand-500)", display: "grid", placeItems: "center", fontSize: "1.25rem", flexShrink: 0 }}>
                          {n.type === "BOOKING_CONFIRMED" ? "✅" : n.type === "BOOKING_CANCELLED" ? "❌" : "🔔"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: "0.25rem", color: n.isRead ? "var(--text-secondary)" : "var(--text-primary)" }}>{n.title}</div>
                          <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>{n.message}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem", fontWeight: 600 }}>{new Date(n.createdAt).toLocaleString("en-IN")}</div>
                        </div>
                        {!n.isRead && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--brand-500)", boxShadow: "0 0 10px var(--brand-500)" }} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewFor && (
        <ReviewModal 
          open={true} 
          onClose={() => setReviewFor(null)} 
          bookingId={reviewFor.id} 
          restaurantId={reviewFor.restaurant.id} 
          restaurantName={reviewFor.restaurant.name} 
        />
      )}
      
      <style>{`
        @media(max-width:992px) {
          .desktop-only { display: none !important; }
        }
      `}</style>
    </div>
  );
}
