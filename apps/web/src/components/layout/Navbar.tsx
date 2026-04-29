"use client";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const [scrolled, setScrolled]   = useState(false);
  const [dropOpen, setDropOpen]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [search, setSearch]       = useState("");
  const dropRef = useRef<HTMLDivElement>(null);
  const router  = useRouter();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) router.push(`/restaurants?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      transition: "all 400ms cubic-bezier(0.23, 1, 0.32, 1)",
      padding: scrolled ? "0.75rem 0" : "1.25rem 0",
      background: scrolled ? "rgba(10,10,11,0.8)" : "transparent",
      backdropFilter: scrolled ? "blur(24px) saturate(180%)" : "none",
      borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "3.5rem", gap: "2rem" }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, transition: "transform 0.3s" }} className="hover-scale">
          <div style={{ width: 40, height: 40, borderRadius: "12px", background: "linear-gradient(135deg, var(--brand-500), var(--brand-700))", display: "grid", placeItems: "center", boxShadow: "0 8px 20px -5px rgba(249,115,22,0.4)" }}>
            <span style={{ fontSize: "1.5rem" }}>🍽️</span>
          </div>
          <span className="gradient-text" style={{ fontWeight: 900, fontSize: "1.375rem", letterSpacing: "-0.03em" }}>DineSpot</span>
        </Link>

        {/* Navigation - Center */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, justifyContent: "center" }} className="desktop-only">
          <Link href="/restaurants" className="btn btn-ghost">Explore</Link>
          <Link href="/restaurants?hasBuffet=true" className="btn btn-ghost">Buffets</Link>
          <Link href="/restaurants?hasEventHall=true" className="btn btn-ghost">Events</Link>
          <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 0.5rem" }} />
          <Link href="/auth/signup?role=RESTAURANT_OWNER" style={{ color: "var(--brand-400)", fontWeight: 700 }} className="btn btn-ghost">List Your Place</Link>
        </div>

        {/* Actions - Right */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
          <form onSubmit={handleSearch} style={{ position: "relative" }} className="desktop-only">
             <input 
               value={search} 
               onChange={e => setSearch(e.target.value)}
               placeholder="Search..."
               style={{ 
                 width: 180, 
                 background: "rgba(255,255,255,0.05)", 
                 border: "1px solid var(--border)", 
                 borderRadius: "var(--radius-full)", 
                 padding: "0.5rem 1rem 0.5rem 2.5rem",
                 fontSize: "0.875rem",
                 transition: "all 0.3s"
               }}
               onFocus={e => e.currentTarget.style.width = "260px"}
               onBlur={e => e.currentTarget.style.width = "180px"}
             />
             <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", opacity: 0.5 }}>🔍</span>
          </form>

          {!loading && !user && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Link href="/auth/login" className="btn btn-ghost desktop-only">Sign In</Link>
              <Link href="/auth/signup" className="btn btn-primary" style={{ borderRadius: "var(--radius-full)", padding: "0.6rem 1.5rem" }}>Join Now</Link>
            </div>
          )}

          {user && (
            <div ref={dropRef} style={{ position: "relative" }}>
              <button onClick={() => setDropOpen(p => !p)} className="soft-glass" style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                borderRadius: "var(--radius-full)", padding: "0.375rem 1rem 0.375rem 0.375rem",
                cursor: "pointer", transition: "all 0.3s",
                border: "1px solid var(--border)"
              }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,var(--brand-500),var(--brand-700))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem", fontWeight: 800, color: "#fff", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" }}>
                  {user.firstName?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span style={{ fontSize: "0.875rem", fontWeight: 600 }} className="desktop-only">{user.firstName}</span>
                <span style={{ fontSize: "0.625rem", color: "var(--text-muted)", transition: "transform 0.3s", transform: dropOpen ? "rotate(180deg)" : "none" }}>▼</span>
              </button>
              {dropOpen && (
                <div className="soft-glass animate-fade-up" style={{ position: "absolute", top: "calc(100% + 0.75rem)", right: 0, minWidth: 220, borderRadius: "var(--radius-lg)", padding: "0.5rem", overflow: "hidden", zIndex: 110 }}>
                   <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", marginBottom: "0.5rem" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{user.firstName} {user.lastName}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{user.email}</div>
                   </div>
                  <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start" }} onClick={() => setDropOpen(false)}>👤 Dashboard</Link>
                  {user.role === "restaurant_owner" && <Link href="/owner" className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start", color: "var(--brand-400)" }} onClick={() => setDropOpen(false)}>🏪 Owner Panel</Link>}
                  <div style={{ height: 1, background: "var(--border)", margin: "0.5rem" }} />
                  <button onClick={() => { logout(); setDropOpen(false); }} className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "flex-start", color: "#f87171" }}>🚪 Sign Out</button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Toggle */}
          <button onClick={() => setMenuOpen(p => !p)} className="btn btn-ghost btn-icon mobile-only">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="soft-glass mobile-only animate-fade-in" style={{ position: "absolute", top: "100%", left: 0, right: 0, padding: "1.5rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link href="/restaurants" className="btn btn-secondary" style={{ justifyContent: "flex-start" }} onClick={() => setMenuOpen(false)}>Explore</Link>
          <Link href="/restaurants?hasBuffet=true" className="btn btn-secondary" style={{ justifyContent: "flex-start" }} onClick={() => setMenuOpen(false)}>Buffets</Link>
          <Link href="/restaurants?hasEventHall=true" className="btn btn-secondary" style={{ justifyContent: "flex-start" }} onClick={() => setMenuOpen(false)}>Event Halls</Link>
          <div style={{ height: 1, background: "var(--border)", margin: "0.5rem 0" }} />
          {!user ? (
            <Link href="/auth/login" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Sign In</Link>
          ) : (
            <button onClick={() => { logout(); setMenuOpen(false); }} className="btn btn-secondary" style={{ color: "#f87171" }}>Sign Out</button>
          )}
        </div>
      )}

      <style>{`
        .desktop-only { display: flex; }
        .mobile-only  { display: none !important; }
        @media(max-width:992px) {
          .desktop-only { display: none !important; }
          .mobile-only  { display: flex !important; }
        }
        .hover-scale:hover { transform: scale(1.05); }
      `}</style>
    </nav>
  );
}
