"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const router    = useRouter();
  const [tab,     setTab]     = useState<"email" | "phone">("email");
  const [email,   setEmail]   = useState("");
  const [password,setPassword]= useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try { 
      await login(email, password); 
      router.push("/restaurants"); 
    } catch (err: unknown) { 
      setError(err instanceof Error ? err.message : "Invalid credentials"); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="bg-grid animate-fade-in" style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      padding: "2rem",
      background: "var(--bg-primary)",
      position: "relative",
      overflow: "hidden"
    }}>
      <div className="hero-glow" style={{ top: "0", opacity: 0.3 }} />
      
      <div className="soft-glass animate-fade-up" style={{ 
        width: "100%", 
        maxWidth: 440, 
        padding: "3rem", 
        borderRadius: "var(--radius-2xl)",
        boxShadow: "0 40px 100px -20px rgba(0,0,0,0.7)",
        zIndex: 10
      }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
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
          <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "0.5rem", letterSpacing: "-0.03em" }}>Welcome Back</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>Continue your culinary journey with DineSpot</p>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr", 
          gap: "0.25rem", 
          background: "rgba(255,255,255,0.03)", 
          borderRadius: "var(--radius-lg)", 
          padding: "0.25rem", 
          marginBottom: "2rem",
          border: "1px solid var(--border)"
        }}>
          {(["email","phone"] as const).map(t => (
            <button 
              key={t} 
              onClick={() => setTab(t)} 
              style={{ 
                padding: "0.75rem", 
                borderRadius: "calc(var(--radius-lg) - 4px)", 
                fontWeight: 700, 
                fontSize: "0.8125rem", 
                transition: "all 0.3s", 
                background: tab === t ? "var(--brand-500)" : "transparent", 
                color: tab === t ? "#fff" : "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}
            >
              {t === "email" ? "Email" : "Phone"}
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
            marginBottom: "1.5rem",
            textAlign: "center"
          }}>
            ⚠️ {error}
          </div>
        )}

        {tab === "email" ? (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: "0.5rem" }}>Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="name@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: "0.5rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: "0.5rem" }}>Password</label>
                <Link href="/auth/forgot" style={{ fontSize: "0.75rem", color: "var(--brand-400)", fontWeight: 700 }}>Forgot?</Link>
              </div>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: "1rem", borderRadius: "var(--radius-lg)" }}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
             <div style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>📱</div>
             <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", lineHeight: 1.6 }}>
               Phone OTP authentication is coming soon for a faster, more secure login experience.
             </p>
             <button onClick={() => setTab("email")} className="btn btn-secondary" style={{ borderRadius: "var(--radius-full)" }}>
               Use Email Instead
             </button>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "2rem 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <button className="btn btn-secondary" style={{ width: "100%", gap: "0.75rem", padding: "0.875rem", borderRadius: "var(--radius-lg)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div style={{ textAlign: "center", marginTop: "2.5rem", fontSize: "0.9375rem", color: "var(--text-secondary)" }}>
          Don't have an account?{" "}
          <Link href="/auth/signup" style={{ color: "var(--brand-400)", fontWeight: 700 }}>
            Join DineSpot
          </Link>
        </div>
      </div>
    </div>
  );
}
