"use client";
import { useState } from "react";
import { post } from "@dinespot/utils/api";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open:         boolean;
  onClose:      () => void;
  bookingId:    string;
  restaurantId: string;
  restaurantName: string;
}

export function ReviewModal({ open, onClose, bookingId, restaurantId, restaurantName }: Props) {
  const qc = useQueryClient();
  const [rating,  setRating]  = useState(0);
  const [hover,   setHover]   = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  const [food,    setFood]    = useState(0);
  const [service, setService] = useState(0);
  const [ambience,setAmbience]= useState(0);

  if (!open) return null;

  const handleSubmit = async () => {
    if (rating === 0) { setError("Please select a star rating"); return; }
    setError(""); setLoading(true);
    try {
      await post("/reviews", { restaurantId, bookingId, rating, foodRating: food || undefined, serviceRating: service || undefined, ambienceRating: ambience || undefined, comment: comment.trim() || undefined });
      setDone(true);
      // Optimistic invalidation
      qc.invalidateQueries({ queryKey: ["restaurant", restaurantId] });
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      setTimeout(onClose, 2000);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to submit review"); }
    finally { setLoading(false); }
  };

  const Stars = ({ value, onChange, onHoverChange }: { value: number; onChange: (n: number) => void; onHoverChange?: (n: number) => void }) => (
    <div style={{ display: "flex", gap: "0.25rem" }}>
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n)} onMouseEnter={() => onHoverChange?.(n)} onMouseLeave={() => onHoverChange?.(0)}
          style={{ fontSize: "1.5rem", background: "none", border: "none", cursor: "pointer", padding: "0.125rem", color: n <= (onHoverChange ? hover || value : value) ? "#fbbf24" : "#3f3f46", transition: "color 150ms" }}>
          ★
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 200, backdropFilter: "blur(4px)" }} />
      <div className="glass animate-fade-up" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(500px,calc(100vw - 2rem))", zIndex: 201, padding: "2rem", borderRadius: "var(--radius-xl)" }}>
        {done ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🎉</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Thank you for your review!</h3>
            <p style={{ color: "var(--text-muted)" }}>Your feedback helps the DineSpot community.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Leave a Review</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>{restaurantName}</p>
              </div>
              <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ fontSize: "1.25rem" }}>✕</button>
            </div>

            {/* Overall rating */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.625rem" }}>Overall Rating *</label>
              <Stars value={rating} onChange={setRating} onHoverChange={setHover} />
              {rating > 0 && <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.375rem" }}>
                {["","Poor","Fair","Good","Very Good","Excellent"][rating]}
              </p>}
            </div>

            {/* Sub-ratings */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {[{ l: "Food", v: food, s: setFood },{ l: "Service", v: service, s: setService },{ l: "Ambience", v: ambience, s: setAmbience }].map(({ l, v, s }) => (
                <div key={l} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "var(--radius-md)", padding: "0.625rem", textAlign: "center" }}>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.375rem" }}>{l}</p>
                  <Stars value={v} onChange={s} />
                </div>
              ))}
            </div>

            {/* Comment */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Your experience <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
              <textarea className="input" value={comment} onChange={e => setComment(e.target.value)} rows={4} maxLength={2000} placeholder="Tell others what made your experience special — the food, ambience, service…" style={{ resize: "none" }} />
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem", textAlign: "right" }}>{comment.length}/2000</p>
            </div>

            {error && <div style={{ padding: "0.625rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: "0.875rem" }}>⚠️ {error}</div>}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleSubmit} disabled={loading || rating === 0} className="btn btn-primary" style={{ flex: 2 }}>
                {loading ? "Submitting…" : "Submit Review"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
