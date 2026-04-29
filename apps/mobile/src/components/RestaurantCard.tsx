import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";

const PRICE: Record<string, string> = { BUDGET: "₹", MODERATE: "₹₹", EXPENSIVE: "₹₹₹", LUXURY: "₹₹₹₹" };

interface Props {
  restaurant: {
    id: string; name: string; city: string; cuisineType: string; priceRange: string;
    rating?: number; totalReviews?: number; coverImage?: string; distance_km?: number;
  };
  onPress: () => void;
}

export function RestaurantCard({ restaurant: r, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={s.card}>
      <View style={s.imageBox}>
        {r.coverImage
          ? <Image source={{ uri: r.coverImage }} style={s.image} />
          : <View style={[s.image, { alignItems: "center", justifyContent: "center" }]}><Text style={{ fontSize: 32 }}>🍽️</Text></View>
        }
      </View>
      <View style={s.info}>
        <View style={s.row}>
          <Text style={s.name} numberOfLines={1}>{r.name}</Text>
          <Text style={s.price}>{PRICE[r.priceRange] ?? r.priceRange}</Text>
        </View>
        <Text style={s.sub} numberOfLines={1}>{r.cuisineType?.charAt(0) + r.cuisineType?.slice(1).toLowerCase().replace(/_/g, " ")} · {r.city}</Text>
        <View style={s.row}>
          <Text style={s.rating}>★ {r.rating?.toFixed(1) ?? "–"}</Text>
          <Text style={s.reviews}>({r.totalReviews ?? 0})</Text>
          {r.distance_km != null && (
            <Text style={s.dist}> · {r.distance_km < 1 ? `${Math.round(r.distance_km * 1000)}m` : `${r.distance_km.toFixed(1)}km`}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card:     { flexDirection: "row", backgroundColor: "#18181b", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#27272a" },
  imageBox: { width: 90, height: 90 },
  image:    { width: 90, height: 90, backgroundColor: "#27272a" },
  info:     { flex: 1, padding: 12, justifyContent: "space-between" },
  row:      { flexDirection: "row", alignItems: "center", gap: 6 },
  name:     { color: "#fafafa", fontWeight: "700", fontSize: 14, flex: 1 },
  price:    { color: "#a1a1aa", fontSize: 13 },
  sub:      { color: "#71717a", fontSize: 12, marginTop: 2 },
  rating:   { color: "#fbbf24", fontWeight: "700", fontSize: 13 },
  reviews:  { color: "#71717a", fontSize: 12 },
  dist:     { color: "#71717a", fontSize: 12 },
});
