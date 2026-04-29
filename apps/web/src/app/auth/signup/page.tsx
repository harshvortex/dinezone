"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { post, tokenStorage } from "@dinespot/utils/api";
import type { AuthResponse } from "@dinespot/types";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "RESTAURANT_OWNER" ? "RESTAURANT_OWNER" : "USER";
  
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: initialRole });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await post<AuthResponse>("/auth/register", form);
      tokenStorage.setAccess(data.tokens.accessToken);
      tokenStorage.setRefresh(data.tokens.refreshToken);
      router.push(form.role === "RESTAURANT_OWNER" ? "/owner" : "/restaurants");
    } catch (err: unknown) { 
      setError(err instanceof Error ? err.message : "Registration failed. Try again."); 
    } finally { 
      setLoading(false); 
    }
  };

  const setField = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="bg-grid animate-fade-in" style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      padding: "5rem 2rem",
      background: "var(--bg-primary)",
      position: "relative",
      overflow: "hidden"
    }}>
      <div className="hero-glow" style={{ top: "0", opacity: 0.3 }} />
      
      <div className="soft-glass animate-fade-up" style={{ 
        width: "100%", 
        maxWidth: 500, 
        padding: "3.5rem", 
        borderRadius: "var(--radius-2xl)",
        boxShadow: "0 40px 100px -20px rgba(0,0,0,0.7)",
        zIndex: 10
      }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <Link href="/" style={{ 
            width: 56, height: 56, borderRadius: "16px", 
            background: "linear-gradient(135deg, var(--brand-500), var(--brand-700))", 
            display: "grid", placeItems: "center", 
            margin: "0 auto 1.5rem",
            boxShadow: "0 12px 24px -6px rgba(249,115,22,0.5)",
            transition: "transform 0.3s"
          }} className="hover-scale">
            <span style={{ fontSize: "2rem" }}>🍽️</span>
          </Link>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 900, marginBottom: "0.5rem", letterSpacing: "-0.04em" }}>Create Account</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>Join Mumbai's most exclusive dining community</p>
        </div>

        {/* Role Selection */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "2rem" }}>
          {[
            { v: "USER", l: "🍽️ Diner", d: "Book tables" },
            { v: "RESTAURANT_OWNER", l: "🏪 Owner", d: "Manage shop" }
          ].map(r => (
            <button 
              key={r.v} 
              type="button"
              onClick={() => setForm(p => ({ ...p, role: r.v }))}
              className="soft-glass"
              style={{ 
                padding: "1rem", 
                borderRadius: "var(--radius-xl)", 
                border: `1px solid ${form.role === r.v ? "var(--brand-500)" : "var(--border)"}`, 
                background: form.role === r.v ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.02)", 
                cursor: "pointer", 
                textAlign: "center", 
                transition: "all 0.3s",
                boxShadow: form.role === r.v ? "0 8px 20px -5px rgba(249,115,22,0.3)" : "none"
              }}
            >
              <div style={{ fontSize: "1rem", fontWeight: 800, color: form.role === r.v ? "var(--brand-400)" : "var(--text-primary)", marginBottom: "0.25rem" }}>{r.l}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>{r.d}</div>
            </button>
          ))}
        </div>

        {error && (
          <div className="animate-fade-in" style={{ 
            padding: "0.875rem 1rem", 
            background: "rgba(248,113,113,0.1)", 
            border: "1px solid rgba(248,113,113,0.2)", 
            borderRadius: "var(--radius-md)", 
            color: "#f87171", 
            fontSize: "0.875rem", 
            marginBottom: "2rem",
            textAlign: "center"
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: "0.5rem" }}>Full Name</label>
            <input
              className="input"
              type="text"
              placeholder="Rahul Sharma"
              value={form.name}
              onChange={setField("name")}
              required
              autoComplete="name"
              disabled={loading}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: "0.5rem" }}>Email Address</label>
            <input
              className="input"
              type="email"
              placeholder="rahul@example.com"
              value={form.email}
              onChange={setField("email")}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: "0.5rem" }}>Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={setField("password")}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: "100%", marginTop: "1rem", borderRadius: "var(--radius-lg)" }}
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account →"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "2.5rem", fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "var(--brand-400)", fontWeight: 700 }}>
            Sign In
          </Link>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          By continuing, you agree to our <Link href="/terms" style={{ color: "var(--text-secondary)" }}>Terms of Service</Link> and <Link href="/privacy" style={{ color: "var(--text-secondary)" }}>Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
