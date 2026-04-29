"use client";
import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RestaurantCard } from "@/components/RestaurantCard";

const SORT_OPTIONS = [
  { value: "rating", label: "Top Rated" },
  { value: "name", label: "Name A–Z" },
  { value: "price", label: "Price" },
];

const CUISINE_OPTIONS = ["Indian", "Japanese", "Italian", "Chinese", "Continental", "Mediterranean"];
const PRICE_OPTIONS = [
  { value: "1", label: "Budget (₹)" },
  { value: "2", label: "Moderate (₹₹)" },
  { value: "3", label: "Premium (₹₹₹)" },
  { value: "4", label: "Luxury (₹₹₹₹)" },
];

import type { Restaurant } from "@dinespot/types";

const MOCK: any[] = [
  { id: "1", name: "Spice Garden", slug: "spice-garden-mumbai", city: "Mumbai", cuisines: ["indian"], priceRange: 2, averageRating: 4.5, totalReviews: 328, coverImageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80", address: { city: "Mumbai", line1: "Bandra West" }, hasBuffet: true, hasEventHall: true },
  { id: "2", name: "The Sushi Loft", slug: "the-sushi-loft-bangalore", city: "Bangalore", cuisines: ["japanese"], priceRange: 4, averageRating: 4.8, totalReviews: 214, coverImageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80", address: { city: "Bangalore", line1: "UB City Mall" }, hasBuffet: true, hasEventHall: true },
  { id: "3", name: "Terra Verde", slug: "terra-verde-delhi", city: "Delhi", cuisines: ["continental"], priceRange: 3, averageRating: 4.6, totalReviews: 189, coverImageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80", address: { city: "Delhi", line1: "Hauz Khas Village" }, hasBuffet: true, hasEventHall: true },
  { id: "4", name: "Café Bombay", slug: "cafe-bombay-mumbai", city: "Mumbai", cuisines: ["indian"], priceRange: 1, averageRating: 4.2, totalReviews: 540, coverImageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80", address: { city: "Mumbai", line1: "Colaba" }, hasBuffet: false, hasEventHall: false },
  { id: "5", name: "Pasta Palazzo", slug: "pasta-palazzo-bangalore", city: "Bangalore", cuisines: ["italian"], priceRange: 2, averageRating: 4.4, totalReviews: 276, coverImageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80", address: { city: "Bangalore", line1: "Koramangala" }, hasBuffet: false, hasEventHall: false },
  { id: "6", name: "Dragon House", slug: "dragon-house-delhi", city: "Delhi", cuisines: ["chinese"], priceRange: 2, averageRating: 4.3, totalReviews: 312, coverImageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80", address: { city: "Delhi", line1: "Connaught Place" }, hasBuffet: true, hasEventHall: false },
];

export default function RestaurantsPage() {
  const sp = useSearchParams();
  const [search, setSearch] = useState(sp.get("q") || sp.get("location") || "");
  const [sortBy, setSortBy] = useState("rating");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [hasBuffet, setHasBuffet] = useState(sp.get("hasBuffet") === "true");
  const [hasHall, setHasHall] = useState(sp.get("hasEventHall") === "true");
  const [restaurants, setRestaurants] = useState<any[]>(MOCK);

  // Sync state with URL on first load or changes
  useEffect(() => {
    if (sp.get("hasBuffet") === "true") setHasBuffet(true);
    if (sp.get("hasEventHall") === "true") setHasHall(true);
    if (sp.get("q") || sp.get("location")) setSearch(sp.get("q") || sp.get("location") || "");
  }, [sp]);

  const filtered = useCallback(() => {
    return restaurants
      .filter((r) => {
        if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.city.toLowerCase().includes(search.toLowerCase()) && !r.address.line1.toLowerCase().includes(search.toLowerCase())) return false;
        if (selectedCuisines.length && !selectedCuisines.includes(r.cuisines[0].toUpperCase())) return false;
        if (selectedPrices.length && !selectedPrices.includes(String(r.priceRange))) return false;
        if (hasBuffet && !r.hasBuffet) return false;
        if (hasHall && !r.hasEventHall) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "rating") return b.averageRating - a.averageRating;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return a.priceRange - b.priceRange;
      });
  }, [restaurants, search, selectedCuisines, selectedPrices, hasBuffet, hasHall, sortBy]);

  const results = filtered();

  const toggleCuisine = (c: string) => setSelectedCuisines((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  const togglePrice = (p: string) => setSelectedPrices((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  return (
    <div className="animate-fade-in" style={{ minHeight: "100vh", background: "var(--bg-primary)", paddingTop: "5rem" }}>
      {/* Search hero */}
      <div style={{ position: "relative", padding: "4rem 0", overflow: "hidden" }}>
        <div className="hero-glow" style={{ top: "-20%", opacity: 0.5 }} />
        <div className="container" style={{ position: "relative", zIndex: 10 }}>
          <div style={{ marginBottom: "2rem" }}>
             <span className="badge-orange" style={{ marginBottom: "1rem" }}>Explore Mumbai</span>
             <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1 }}>
               {hasBuffet && !hasHall ? (
                 <>Discover Luxury <br /> <span className="gradient-text">Buffets</span></>
               ) : hasHall && !hasBuffet ? (
                 <>Discover Grand <br /> <span className="gradient-text">Event Halls</span></>
               ) : (
                 <>Discover Culinary <br /> <span className="gradient-text">Excellence</span></>
               )}
             </h1>
          </div>
          
          <div className="soft-glass" style={{ padding: "0.75rem", borderRadius: "var(--radius-xl)", display: "flex", gap: "0.75rem", maxWidth: 600 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem", padding: "0 1.25rem", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-lg)" }}>
              <span style={{ fontSize: "1.25rem" }}>🔍</span>
              <input 
                className="input" 
                style={{ background: "transparent", border: "none", color: "#fff", padding: "1rem 0" }} 
                placeholder="Search restaurant or location..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: "6rem" }}>
        <div style={{ display: "flex", gap: "3rem", alignItems: "flex-start" }}>
          {/* Sidebar filters */}
          <aside style={{ width: 260, flexShrink: 0, position: "sticky", top: "7rem" }} className="desktop-only">
            <div style={{ marginBottom: "2.5rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.25rem" }}>Cuisine</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {CUISINE_OPTIONS.map((c) => (
                  <label key={c} style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontSize: "0.9375rem", color: selectedCuisines.includes(c.toUpperCase()) ? "var(--brand-400)" : "var(--text-secondary)", transition: "color 0.2s" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "6px", border: "2px solid var(--border)", background: selectedCuisines.includes(c.toUpperCase()) ? "var(--brand-500)" : "transparent", transition: "all 0.2s", display: "grid", placeItems: "center" }}>
                       {selectedCuisines.includes(c.toUpperCase()) && <div style={{ width: 6, height: 6, background: "#fff", borderRadius: "1px" }} />}
                    </div>
                    <input type="checkbox" checked={selectedCuisines.includes(c.toUpperCase())} onChange={() => toggleCuisine(c.toUpperCase())} style={{ display: "none" }} />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "2.5rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.25rem" }}>Price Range</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {PRICE_OPTIONS.map((p) => (
                  <button 
                    key={p.value} 
                    onClick={() => togglePrice(p.value)}
                    className={`btn btn-sm ${selectedPrices.includes(p.value) ? "btn-primary" : "btn-secondary"}`}
                    style={{ borderRadius: "var(--radius-md)", padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                  >
                    {p.label.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1.25rem" }}>Amenities</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontSize: "0.9375rem" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "6px", border: "2px solid var(--border)", background: hasBuffet ? "var(--accent-purple)" : "transparent", transition: "all 0.2s", display: "grid", placeItems: "center" }}>
                    {hasBuffet && <div style={{ width: 6, height: 6, background: "#fff", borderRadius: "1px" }} />}
                  </div>
                  <input type="checkbox" checked={hasBuffet} onChange={() => setHasBuffet(!hasBuffet)} style={{ display: "none" }} />
                  <span>Buffet Session</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", fontSize: "0.9375rem" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "6px", border: "2px solid var(--border)", background: hasHall ? "var(--accent-blue)" : "transparent", transition: "all 0.2s", display: "grid", placeItems: "center" }}>
                    {hasHall && <div style={{ width: 6, height: 6, background: "#fff", borderRadius: "1px" }} />}
                  </div>
                  <input type="checkbox" checked={hasHall} onChange={() => setHasHall(!hasHall)} style={{ display: "none" }} />
                  <span>Grand Event Hall</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Results grid */}
          <main style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div style={{ fontWeight: 800, fontSize: "1.125rem" }}>{results.length} results found</div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 700 }}>Sort by</span>
                <select className="input" style={{ width: 160, padding: "0.5rem 1rem", borderRadius: "var(--radius-lg)" }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "2rem" }}>
              {results.map((r, idx) => (
                <div key={r.id} className="animate-fade-up" style={{ animationDelay: `${idx * 50}ms` }}>
                  <RestaurantCard restaurant={r as any} />
                </div>
              ))}
            </div>
            
            {results.length === 0 && (
              <div style={{ textAlign: "center", padding: "6rem 0", color: "var(--text-muted)" }}>
                 <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>🔍</div>
                 <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>No matches found</h2>
                 <p>Try adjusting your filters or search terms.</p>
              </div>
            )}
          </main>
        </div>
      </div>
      
      <style>{`
        @media(max-width:992px) {
          .desktop-only { display: none !important; }
        }
      `}</style>
    </div>
  );
}
