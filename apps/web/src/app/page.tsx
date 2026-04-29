"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapView } from "@/components/MapView";
import { RestaurantCard } from "@/components/RestaurantCard";
import { useNearbyRestaurants, type NearbyFilters } from "@/hooks/useNearbyRestaurants";
import type { Restaurant } from "@dinespot/types";

const CUISINES = ["Indian","Chinese","Italian","Japanese","Mexican","Thai","Continental","Multi-Cuisine"];
const PRICES   = [{ v: "BUDGET", l: "₹" }, { v: "MODERATE", l: "₹₹" }, { v: "EXPENSIVE", l: "₹₹₹" }, { v: "LUXURY", l: "₹₹₹₹" }];
const BOOKING_TYPES = [{ v: "table", l: "🪑 Tables" }, { v: "buffet", l: "🥘 Buffets" }, { v: "hall", l: "🏛️ Halls" }];

const DEFAULT_CENTER = { lat: 19.0760, lng: 72.8777 }; // Mumbai

export default function HomePage() {
  const router = useRouter();
  const [center,     setCenter]     = useState(DEFAULT_CENTER);
  const [filters,    setFilters]    = useState<NearbyFilters>({});
  const [cuisine,    setCuisine]    = useState("");
  const [price,      setPrice]      = useState("");
  const [rating,     setRating]     = useState<number | undefined>();
  const [highlighted,setHighlighted]= useState<string | null>(null);
  const locationRef = useRef<HTMLInputElement>(null);

  // Get user's location
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => {} // fallback to Mumbai
    );
  }, []);

  // Sync filters
  useEffect(() => {
    setFilters({
      cuisine:    cuisine  || undefined,
      priceRange: price    || undefined,
      rating:     rating,
    });
  }, [cuisine, price, rating]);

  const { data, isLoading } = useNearbyRestaurants(center.lat, center.lng, filters);
  const restaurants = data?.data ?? [];

  const applyFilters = useCallback((f: Partial<NearbyFilters>) => {
    setFilters(prev => ({ ...prev, ...f }));
  }, []);

  return (
    <div className="animate-fade-in" style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Hero Section */}
      <section className="bg-grid" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden", paddingTop: "5rem" }}>
        <div className="hero-glow" />
        
        {/* Abstract Background Map - Floating */}
        <div style={{ position: "absolute", top: "10%", right: "-10%", width: "60%", height: "80%", opacity: 0.4, zIndex: 0, filter: "blur(2px)" }} className="animate-float">
          <MapView
            center={center}
            zoom={13}
            markers={restaurants.map(r => ({
              id: r.id, lat: r.location?.coordinates[1] || r.address.lat, lng: r.location?.coordinates[0] || r.address.lng,
              name: r.name, priceRange: String(r.priceRange), rating: r.averageRating ?? 4.0, coverImage: r.coverImageUrl,
            }))}
            onMarkerClick={setHighlighted}
          />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at center, transparent 30%, var(--bg-primary) 100%)", pointerEvents: "none" }} />
        </div>

        <div className="container" style={{ position: "relative", zIndex: 10 }}>
          <div style={{ maxWidth: 700 }}>
            <div className="animate-fade-up" style={{ marginBottom: "1.5rem" }}>
               <span className="badge-orange" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                 ✨ Premium Dining Redefined
               </span>
            </div>

            <h1 className="gradient-text animate-fade-up delay-100" style={{ 
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)", 
              lineHeight: 1.1, 
              fontWeight: 900, 
              marginBottom: "1.5rem",
              letterSpacing: "-0.04em"
            }}>
              Discover the Art of <br /> Fine Dining
            </h1>

            <p className="animate-fade-up delay-200" style={{ 
              fontSize: "clamp(1rem, 1.25vw, 1.25rem)", 
              color: "var(--text-secondary)", 
              marginBottom: "2.5rem",
              maxWidth: 500,
              lineHeight: 1.6
            }}>
              Book exclusive tables, explore luxury buffets, and experience culinary excellence at Mumbai's most prestigious restaurants.
            </p>

            {/* Premium Search Box */}
            <div className="soft-glass animate-fade-up delay-300" style={{ 
              padding: "0.75rem", 
              borderRadius: "var(--radius-xl)", 
              display: "flex", 
              gap: "0.75rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              maxWidth: 600,
              flexWrap: "wrap"
            }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem", padding: "0 1.25rem", background: "rgba(255,255,255,0.03)", borderRadius: "var(--radius-lg)", minWidth: 200 }}>
                <span style={{ fontSize: "1.25rem" }}>📍</span>
                <input ref={locationRef} style={{ background: "transparent", border: "none", color: "#fff", padding: "1rem 0", flex: 1, outline: "none" }} placeholder="Mumbai, India" defaultValue="Mumbai" />
              </div>
              <button 
                onClick={() => router.push(`/restaurants?location=${encodeURIComponent(locationRef.current?.value || "Mumbai")}`)}
                className="btn btn-primary btn-lg" 
                style={{ borderRadius: "var(--radius-lg)" }}
              >
                Search Places
              </button>
            </div>

            {/* Quick Filters */}
            <div className="animate-fade-up delay-400" style={{ display: "flex", gap: "1rem", marginTop: "2rem", flexWrap: "wrap" }}>
              <Link 
                href="/restaurants"
                className="btn btn-secondary"
                style={{ borderRadius: "var(--radius-full)", padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}
              >
                🍽️ Explore All
              </Link>
              <Link 
                href="/restaurants?hasBuffet=true"
                className="btn btn-secondary"
                style={{ borderRadius: "var(--radius-full)", padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}
              >
                🥘 Luxury Buffets
              </Link>
              <Link 
                href="/restaurants?hasEventHall=true"
                className="btn btn-secondary"
                style={{ borderRadius: "var(--radius-full)", padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}
              >
                🏛️ Event Halls
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended Section */}
      <section style={{ padding: "8rem 0", background: "var(--bg-primary)", position: "relative" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "4rem" }}>
            <div className="animate-fade-up">
              <h2 className="text-balance" style={{ fontSize: "clamp(2rem, 3vw, 2.75rem)", fontWeight: 900, letterSpacing: "-0.03em", marginBottom: "1rem" }}>
                Curated for Your Palette
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "1.125rem" }}>
                Hand-picked restaurants that match your lifestyle.
              </p>
            </div>
            <Link href="/restaurants" className="btn btn-secondary" style={{ borderRadius: "var(--radius-full)" }}>
              Explore All <span style={{ marginLeft: "0.5rem" }}>→</span>
            </Link>
          </div>

          {isLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "2.5rem" }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ height: 420, borderRadius: "var(--radius-xl)", background: "var(--bg-secondary)", animation: "shimmer 2s infinite" }} />
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "2.5rem" }}>
              {restaurants.map((r, idx) => (
                <div key={r.id} className="animate-fade-up" style={{ animationDelay: `${idx * 150}ms` }}>
                  <RestaurantCard restaurant={r as any} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action Section */}
      <section style={{ paddingBottom: "8rem" }}>
        <div className="container">
          <div className="soft-glass" style={{ 
            padding: "5rem 3rem", 
            borderRadius: "var(--radius-2xl)", 
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            border: "1px solid rgba(249,115,22,0.15)"
          }}>
            <div style={{ position: "absolute", top: "-50%", left: "-20%", width: "100%", height: "200%", background: "radial-gradient(circle, rgba(249,115,22,0.05) 0%, transparent 60%)", pointerEvents: "none" }} />
            
            <h2 style={{ fontSize: "clamp(2rem, 3.5vw, 3.5rem)", fontWeight: 900, marginBottom: "1.5rem", letterSpacing: "-0.03em" }}>
              Ready to embark on a <br /> culinary journey?
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.25rem", marginBottom: "3rem", maxWidth: 600, marginInline: "auto" }}>
              Join thousands of food lovers and book your next unforgettable meal in seconds.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/auth/signup" className="btn btn-primary btn-lg">Get Started Free</Link>
              <Link href="/restaurants" className="btn btn-secondary btn-lg">Browse Restaurants</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
