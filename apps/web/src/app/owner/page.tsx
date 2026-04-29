"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { get, post, put, del } from "@dinespot/utils/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

type Booking = { id: string; date: string; startTime: string; partySize: number; status: string; referenceCode: string; bookingType: string; user: { name: string; email: string } };
type DailyData = { date: string; revenue: number; bookings: number };
type HeatmapMatrix = { matrix: number[][]; days: string[]; hours: number[] };

function StatCard({ label, value, icon, sub }: { label: string; value: string | number; icon: string; sub?: string }) {
  return (
    <div className="glass" style={{ padding: "1.25rem", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: "2rem" }}>{icon}</div>
      <div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>{label}</div>
        <div style={{ fontSize: "1.375rem", fontWeight: 800 }}>{value}</div>
        {sub && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{sub}</div>}
      </div>
    </div>
  );
}

function HeatmapGrid({ data }: { data: HeatmapMatrix }) {
  const maxVal = Math.max(...data.matrix.flat(), 1);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: `60px repeat(24, 1fr)`, gap: 2, fontSize: "0.625rem" }}>
        <div />
        {data.hours.map(h => <div key={h} style={{ textAlign: "center", color: "var(--text-muted)", paddingBottom: 4 }}>{h}</div>)}
        {data.days.map((day, di) => (
          <>
            <div key={day} style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", paddingRight: 4 }}>{day.slice(0,3)}</div>
            {data.hours.map(h => {
              const v   = data.matrix[di]?.[h] ?? 0;
              const pct = v / maxVal;
              return (
                <div key={h} title={`${day} ${h}:00 — ${v} bookings`} style={{ height: 18, borderRadius: 3, background: pct > 0 ? `rgba(249,115,22,${0.1 + pct * 0.9})` : "rgba(255,255,255,0.04)", cursor: "default" }} />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

export default function OwnerPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [todayStats,  setTodayStats]  = useState<any>(null);
  const [analytics,   setAnalytics]   = useState<{ daily: DailyData[]; heatmap: HeatmapMatrix } | null>(null);
  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [venueTab,    setVenueTab]    = useState<"tables"|"buffets"|"halls">("tables");
  const [tables,      setTables]      = useState<any[]>([]);
  const [buffets,     setBuffets]     = useState<any[]>([]);
  const [halls,       setHalls]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [actionModal, setActionModal] = useState<"table"|"buffet"|"hall"|null>(null);
  const [form,        setForm]        = useState<Record<string, any>>({});

  useEffect(() => {
    get<{ data: any }>("/owner/dashboard").then(res => {
      const data = (res as any).data;
      setRestaurants(data.restaurants ?? []);
      setTodayStats(data.today);
      setTodayBookings(data.upcoming ?? []);
      if (data.restaurants?.[0]?.id) setSelectedId(data.restaurants[0].id);
    }).catch(() => router.push("/auth/login")).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selectedId) return;
    const from = new Date(); from.setDate(from.getDate() - 6);
    const to   = new Date();
    Promise.all([
      get(`/owner/restaurants/${selectedId}/analytics?from=${from.toISOString().split("T")[0]}&to=${to.toISOString().split("T")[0]}`),
      get(`/restaurants/${selectedId}`),
    ]).then(([a, r]) => {
      setAnalytics({ daily: (a as any).data?.daily ?? [], heatmap: (a as any).data?.heatmap });
      const rest = (r as any).data;
      setTables(rest.tables ?? []);
      setBuffets(rest.buffetSessions ?? []);
      setHalls(rest.eventHalls ?? []);
    }).catch(() => {});
  }, [selectedId]);

  const handleAddVenue = async () => {
    if (!selectedId) return;
    if (actionModal === "table") {
      const t = await post<any>(`/owner/restaurants/${selectedId}/tables`, form);
      setTables(p => [...p, (t as any).data]);
    } else if (actionModal === "buffet") {
      const b = await post<any>(`/owner/restaurants/${selectedId}/buffets`, form);
      setBuffets(p => [...p, (b as any).data]);
    } else if (actionModal === "hall") {
      const h = await post<any>(`/owner/restaurants/${selectedId}/halls`, form);
      setHalls(p => [...p, (h as any).data]);
    }
    setActionModal(null); setForm({});
  };

  const toggleTable  = async (id: string, isActive: boolean) => { await put(`/owner/restaurants/${selectedId}/tables/${id}`, { isActive: !isActive }); setTables(p => p.map(t => t.id === id ? { ...t, isActive: !isActive } : t)); };
  const toggleBuffet = async (id: string, isActive: boolean) => { await put(`/owner/restaurants/${selectedId}/buffets/${id}`, { isActive: !isActive }); setBuffets(p => p.map(b => b.id === id ? { ...b, isActive: !isActive } : b)); };
  const toggleHall   = async (id: string, isActive: boolean) => { await put(`/owner/restaurants/${selectedId}/halls/${id}`, { isActive: !isActive }); setHalls(p => p.map(h => h.id === id ? { ...h, isActive: !isActive } : h)); };

  if (loading) return <div style={{ paddingTop: "8rem", textAlign: "center", color: "var(--text-muted)" }}>Loading owner dashboard…</div>;

  return (
    <div style={{ minHeight: "100vh", paddingTop: "5rem" }}>
      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.625rem", fontWeight: 800, marginBottom: "0.25rem" }}>Owner Dashboard</h1>
            {restaurants.length > 1 && (
              <select className="input" style={{ width: "auto", marginTop: "0.5rem", fontSize: "0.875rem" }} value={selectedId ?? ""} onChange={e => setSelectedId(e.target.value)}>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => { setActionModal("table");  setForm({ tableNumber: "", capacity: 4 }); }} className="btn btn-secondary btn-sm">+ Table</button>
            <button onClick={() => { setActionModal("buffet"); setForm({ name: "LUNCH", startTime: "12:00", endTime: "15:00", pricePerHead: 599, maxCapacity: 50 }); }} className="btn btn-secondary btn-sm">+ Buffet</button>
            <button onClick={() => { setActionModal("hall");   setForm({ name: "", capacity: 100, pricePerDay: 50000, amenities: [] }); }} className="btn btn-secondary btn-sm">+ Hall</button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
          <StatCard icon="📅" label="Today's Bookings" value={todayStats?.bookings ?? 0} />
          <StatCard icon="💰" label="Today's Revenue" value={`₹${(todayStats?.revenue ?? 0).toLocaleString("en-IN")}`} />
          <StatCard icon="🪑" label="Tables" value={(todayStats?.byType?.TABLE ?? 0)} sub="booked today" />
          <StatCard icon="🥘" label="Buffets" value={(todayStats?.byType?.BUFFET ?? 0)} sub="booked today" />
        </div>

        {/* 7-day Revenue Bar Chart */}
        {analytics?.daily && analytics.daily.length > 0 && (
          <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-xl)", marginBottom: "2rem" }}>
            <h2 style={{ fontWeight: 700, fontSize: "1.0625rem", marginBottom: "1.25rem" }}>7-Day Revenue</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.daily} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tickFormatter={(d: any) => new Date(d).toLocaleDateString("en-IN", { weekday: "short" })} tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]} />
                <Bar dataKey="revenue" radius={[4,4,0,0]}>
                  {analytics.daily.map((_, i) => <Cell key={i} fill={i === analytics.daily.length - 1 ? "#f97316" : "#f9731660"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Peak hours heatmap */}
        {analytics?.heatmap && (
          <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-xl)", marginBottom: "2rem", overflowX: "auto" }}>
            <h2 style={{ fontWeight: 700, fontSize: "1.0625rem", marginBottom: "1.25rem" }}>Peak Hours Heatmap</h2>
            <HeatmapGrid data={analytics.heatmap} />
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <div style={{ width: 12, height: 12, background: "rgba(249,115,22,0.1)", borderRadius: 2 }} /> Less
              <div style={{ width: 12, height: 12, background: "rgba(249,115,22,0.9)", borderRadius: 2, marginLeft: "0.5rem" }} /> More
            </div>
          </div>
        )}

        {/* Today's bookings table */}
        <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-xl)", marginBottom: "2rem", overflowX: "auto" }}>
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem", marginBottom: "1.25rem" }}>Upcoming Bookings</h2>
          {todayBookings.length === 0 ? <p style={{ color: "var(--text-muted)" }}>No upcoming bookings.</p> : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead><tr>{["Time","Guest","Venue","Guests","Status"].map(h => <th key={h} style={{ textAlign: "left", padding: "0.5rem", color: "var(--text-muted)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>{h}</th>)}</tr></thead>
              <tbody>{todayBookings.map(b => (
                <tr key={b.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "0.625rem 0.5rem" }}>{b.startTime}</td>
                  <td style={{ padding: "0.625rem 0.5rem" }}>{b.user?.name ?? "–"}</td>
                  <td style={{ padding: "0.625rem 0.5rem", color: "var(--text-muted)" }}>{b.bookingType}</td>
                  <td style={{ padding: "0.625rem 0.5rem" }}>{b.partySize}</td>
                  <td style={{ padding: "0.625rem 0.5rem" }}><span style={{ fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: "var(--radius-full)", background: b.status === "CONFIRMED" ? "rgba(34,197,94,0.12)" : "rgba(250,204,21,0.12)", color: b.status === "CONFIRMED" ? "#4ade80" : "#fde047" }}>{b.status}</span></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>

        {/* Manage venues */}
        <div className="glass" style={{ padding: "1.5rem", borderRadius: "var(--radius-xl)" }}>
          <h2 style={{ fontWeight: 700, fontSize: "1.0625rem", marginBottom: "1.25rem" }}>Manage Venues</h2>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
            {(["tables","buffets","halls"] as const).map(t => <button key={t} onClick={() => setVenueTab(t)} className={`btn btn-sm ${venueTab === t ? "btn-primary" : "btn-secondary"}`}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
          </div>
          {venueTab === "tables" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {tables.map(t => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.04)" }}>
                  <span>Table {t.tableNumber}{t.section ? ` (${t.section})` : ""} · {t.capacity} seats</span>
                  <button onClick={() => toggleTable(t.id, t.isActive)} className={`btn btn-sm ${t.isActive ? "btn-secondary" : "btn-primary"}`} style={{ fontSize: "0.75rem" }}>{t.isActive ? "Deactivate" : "Activate"}</button>
                </div>
              ))}
            </div>
          )}
          {venueTab === "buffets" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {buffets.map(b => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.04)" }}>
                  <span>{b.name} · ₹{Number(b.pricePerHead).toLocaleString("en-IN")}/head · Cap: {b.maxCapacity}</span>
                  <button onClick={() => toggleBuffet(b.id, b.isActive)} className={`btn btn-sm ${b.isActive ? "btn-secondary" : "btn-primary"}`} style={{ fontSize: "0.75rem" }}>{b.isActive ? "Deactivate" : "Activate"}</button>
                </div>
              ))}
            </div>
          )}
          {venueTab === "halls" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {halls.map(h => (
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.04)" }}>
                  <span>{h.name} · Cap: {h.capacity} · ₹{Number(h.pricePerDay).toLocaleString("en-IN")}/day</span>
                  <button onClick={() => toggleHall(h.id, h.isActive)} className={`btn btn-sm ${h.isActive ? "btn-secondary" : "btn-primary"}`} style={{ fontSize: "0.75rem" }}>{h.isActive ? "Deactivate" : "Activate"}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Venue Modal */}
      {actionModal && (
        <>
          <div onClick={() => setActionModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200 }} />
          <div className="glass" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(420px,calc(100vw - 2rem))", zIndex: 201, padding: "2rem", borderRadius: "var(--radius-xl)" }}>
            <h3 style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "1.25rem" }}>Add {actionModal.charAt(0).toUpperCase()+actionModal.slice(1)}</h3>
            {actionModal === "table" && (<>
              <div style={{ marginBottom: "0.875rem" }}><label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>Table Number</label><input className="input" placeholder="T-11" value={form.tableNumber} onChange={e => setForm(p => ({...p, tableNumber: e.target.value}))} /></div>
              <div style={{ marginBottom: "1.25rem" }}><label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>Capacity</label><input className="input" type="number" min={1} max={50} value={form.capacity} onChange={e => setForm(p => ({...p, capacity: +e.target.value}))} /></div>
            </>)}
            {actionModal === "buffet" && (<>
              <div style={{ marginBottom: "0.875rem" }}><label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>Session</label><select className="input" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}>{["BREAKFAST","BRUNCH","LUNCH","EVENING_SNACKS","DINNER"].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.875rem" }}>
                <div><label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>Start</label><input className="input" type="time" value={form.startTime} onChange={e => setForm(p => ({...p, startTime: e.target.value}))} /></div>
                <div><label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>End</label><input className="input" type="time" value={form.endTime} onChange={e => setForm(p => ({...p, endTime: e.target.value}))} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div><label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>Price/head ₹</label><input className="input" type="number" value={form.pricePerHead} onChange={e => setForm(p => ({...p, pricePerHead: +e.target.value}))} /></div>
                <div><label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>Max capacity</label><input className="input" type="number" value={form.maxCapacity} onChange={e => setForm(p => ({...p, maxCapacity: +e.target.value}))} /></div>
              </div>
            </>)}
            {actionModal === "hall" && (<>
              <div style={{ marginBottom: "0.875rem" }}><label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>Hall Name</label><input className="input" placeholder="Grand Ballroom" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div><label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>Capacity</label><input className="input" type="number" value={form.capacity} onChange={e => setForm(p => ({...p, capacity: +e.target.value}))} /></div>
                <div><label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>Price/day ₹</label><input className="input" type="number" value={form.pricePerDay} onChange={e => setForm(p => ({...p, pricePerDay: +e.target.value}))} /></div>
              </div>
            </>)}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={() => setActionModal(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleAddVenue} className="btn btn-primary" style={{ flex: 1 }}>Add</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
