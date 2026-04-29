"use client";
import Link from "next/link";
import type { Restaurant } from "@dinespot/types";

const PRICE: Record<number, string> = { 1: "₹", 2: "₹₹", 3: "₹₹₹", 4: "₹₹₹₹" };

interface Props {
  restaurant: Restaurant & { distance_km?: number; availableSlots?: number };
  compact?: boolean;
}

export function RestaurantCard({ restaurant: r, compact = false }: Props) {
  return (
    <Link href={`/booking/${r.id}`}
      className="premium-card animate-fade-up"
      style={{
        display: "block",
        width: compact ? 320 : "100%",
        textDecoration: "none",
        position: "relative",
      }}
    >
      <div style={{ position: "relative", height: compact ? 180 : 240, overflow: "hidden" }}>
        {r.coverImageUrl
          ? <img src={r.coverImageUrl} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.8s cubic-bezier(0.23, 1, 0.32, 1)" }} />
          : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: "3rem", background: "var(--bg-secondary)" }}>🍽️</div>
        }
        
        {/* Overlay Gradient */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,10,11,0.95) 0%, rgba(10,10,11,0.4) 40%, transparent 100%)", pointerEvents: "none" }} />

        {/* Top Right: Verify Badge */}
        {(r as any).isVerified && (
          <div style={{ position: "absolute", top: "1rem", right: "1rem" }}>
            <div className="soft-glass" style={{ width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: "0.75rem", border: "1px solid var(--accent-green)" }}>
              ✅
            </div>
          </div>
        )}

        {/* Bottom Left Info Over Image */}
        <div style={{ position: "absolute", bottom: "1rem", left: "1.25rem", right: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span className="badge-orange" style={{ fontSize: "0.7rem", padding: "0.25rem 0.6rem" }}>
              {(r.cuisines?.[0] || "General").replace(/_/g, " ")}
            </span>
            <span style={{ color: "#fbbf24", fontWeight: 800, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              ★ {r.averageRating?.toFixed(1) ?? "4.5"}
            </span>
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>{r.name}</h3>
        </div>
      </div>

      <div style={{ padding: "1.25rem", background: "var(--bg-secondary)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            <span>📍 {(r as any).address?.city || (r as any).city || "Mumbai"}</span>
          </div>
          <span style={{ color: "var(--brand-400)", fontWeight: 800, fontSize: "0.875rem" }}>{PRICE[r.priceRange] ?? "₹₹"}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.375rem" }}>
            {r.hasBuffet ? <span className="badge-purple" style={{ fontSize: "0.65rem", padding: "0.2rem 0.5rem" }}>Buffet</span> : null}
            {r.hasEventHall ? <span className="badge-blue" style={{ fontSize: "0.65rem", padding: "0.2rem 0.5rem" }}>Halls</span> : null}
          </div>
          <button className="btn btn-primary btn-sm" style={{ borderRadius: "var(--radius-md)", minWidth: 80 }}>
            Reserve
          </button>
        </div>
      </div>
    </Link>
  );
}
