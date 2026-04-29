"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { post, tokenStorage } from "@dinespot/utils/api";
import type { AuthResponse } from "@dinespot/types";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "", phone: "" });

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await post<AuthResponse>("/auth/login", {
        email: form.email,
        password: form.password,
      });
      tokenStorage.setAccess(data.tokens.accessToken);
      tokenStorage.setRefresh(data.tokens.refreshToken);
      router.push("/restaurants");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "5rem 1.5rem 3rem", position: "relative",
    }}>
      {/* Glow */}
      <div style={{
        position: "fixed", top: "30%", left: "50%", transform: "translateX(-50%)",
        width: 500, height: 500, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)",
      }} />

      <div className="glass animate-fade-up" style={{ width: "100%", maxWidth: 440, padding: "2.5rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link href="/" style={{ fontSize: "1.75rem", display: "block", marginBottom: "1rem" }}>🍽️</Link>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.375rem" }}>Welcome back</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
            Sign in to your DineSpot account
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.25rem",
          background: "rgba(255,255,255,0.04)", borderRadius: "var(--radius-md)",
          padding: "0.25rem", marginBottom: "1.75rem",
        }}>
          {(["email", "phone"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "0.625rem", borderRadius: "var(--radius-sm)", fontWeight: 600,
              fontSize: "0.875rem", transition: "all var(--transition)",
              background: tab === t ? "rgba(249,115,22,0.15)" : "transparent",
              color: tab === t ? "var(--brand-400)" : "var(--text-muted)",
              border: tab === t ? "1px solid rgba(249,115,22,0.25)" : "1px solid transparent",
            }}>
              {t === "email" ? "📧 Email" : "📱 Phone"}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", marginBottom: "1.25rem",
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171", fontSize: "0.875rem",
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Email form */}
        {tab === "email" && (
          <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                Email address
              </label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)" }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: "0.8125rem", color: "var(--brand-400)" }}>Forgot password?</Link>
              </div>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: "0.5rem", width: "100%", padding: "0.875rem", fontSize: "1rem" }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        {/* Phone OTP */}
        {tab === "phone" && (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📱</div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", fontSize: "0.9375rem" }}>
              Phone login uses Clerk OTP verification. Integrate the Clerk SDK in your frontend to enable this flow.
            </p>
            <Link
              href="https://clerk.com/docs"
              target="_blank"
              className="btn btn-secondary"
              style={{ fontSize: "0.875rem" }}
            >
              View Clerk Setup Docs →
            </Link>
          </div>
        )}

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.75rem 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {/* Google OAuth */}
        <button className="btn btn-secondary" style={{ width: "100%", gap: "0.75rem", padding: "0.75rem" }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        {/* Footer */}
        <p style={{ textAlign: "center", marginTop: "1.75rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" style={{ color: "var(--brand-400)", fontWeight: 600 }}>Create one free</Link>
        </p>
      </div>
    </div>
  );
}
