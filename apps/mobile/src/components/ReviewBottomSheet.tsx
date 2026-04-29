import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView } from "react-native";
import { apiPost } from "../lib/api";

interface Props {
  open:    boolean;
  booking: { id: string; restaurant: { id: string; name: string } };
  onClose: () => void;
}

export function ReviewBottomSheet({ open, booking, onClose }: Props) {
  const [rating,  setRating]  = useState(0);
  const [hover,   setHover]   = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  const submit = async () => {
    if (rating === 0) { setError("Please select a rating"); return; }
    setLoading(true); setError("");
    try {
      await apiPost("/reviews", { restaurantId: booking.restaurant.id, bookingId: booking.id, rating, comment: comment.trim() || undefined });
      setDone(true);
      setTimeout(onClose, 1800);
    } catch (err: any) { setError(err.message ?? "Submit failed"); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.handle} />
          {done ? (
            <View style={s.done}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🎉</Text>
              <Text style={s.doneText}>Thanks for your review!</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.title}>Rate your experience</Text>
              <Text style={s.restaurantName}>{booking.restaurant.name}</Text>

              {/* Stars */}
              <View style={s.stars}>
                {[1,2,3,4,5].map(n => (
                  <TouchableOpacity key={n} onPress={() => setRating(n)} style={s.star}>
                    <Text style={{ fontSize: 36, color: n <= (rating) ? "#fbbf24" : "#3f3f46" }}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {rating > 0 && <Text style={s.ratingLabel}>{["","Poor","Fair","Good","Very Good","Excellent"][rating]}</Text>}

              {/* Comment */}
              <Text style={s.label}>Your thoughts (optional)</Text>
              <TextInput
                style={[s.input, { height: 90 }]}
                multiline value={comment} onChangeText={setComment}
                placeholder="What did you love about the experience?" placeholderTextColor="#52525b"
                textAlignVertical="top"
              />

              {error ? <Text style={s.error}>⚠️ {error}</Text> : null}

              <View style={s.actions}>
                <TouchableOpacity onPress={onClose} style={s.cancelBtn}><Text style={{ color: "#a1a1aa", fontWeight: "600" }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={submit} disabled={loading || rating === 0} style={[s.submitBtn, (loading || rating === 0) && { opacity: 0.5 }]}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{loading ? "Submitting…" : "Submit Review"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet:          { backgroundColor: "#18181b", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: "75%" },
  handle:         { width: 36, height: 4, backgroundColor: "#3f3f46", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  done:           { alignItems: "center", paddingVertical: 32 },
  doneText:       { color: "#fafafa", fontSize: 18, fontWeight: "700" },
  title:          { color: "#fafafa", fontSize: 18, fontWeight: "800", marginBottom: 4 },
  restaurantName: { color: "#71717a", fontSize: 14, marginBottom: 16 },
  stars:          { flexDirection: "row", justifyContent: "center", gap: 4, marginBottom: 8 },
  star:           { padding: 4 },
  ratingLabel:    { textAlign: "center", color: "#f97316", fontWeight: "600", marginBottom: 16 },
  label:          { color: "#a1a1aa", fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input:          { backgroundColor: "#27272a", borderRadius: 12, padding: 12, color: "#fafafa", fontSize: 14, marginBottom: 14 },
  error:          { color: "#f87171", fontSize: 13, marginBottom: 10 },
  actions:        { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn:      { flex: 1, paddingVertical: 14, alignItems: "center", borderRadius: 12, backgroundColor: "#27272a" },
  submitBtn:      { flex: 2, paddingVertical: 14, alignItems: "center", borderRadius: 12, backgroundColor: "#f97316" },
});
