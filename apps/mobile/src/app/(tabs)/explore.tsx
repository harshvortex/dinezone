import { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../lib/api";
import { RestaurantCard } from "../../components/RestaurantCard";
import { Ionicons } from "@expo/vector-icons";

const PRICE_COLORS: Record<string, string> = {
  BUDGET: "#4ade80", MODERATE: "#f97316", EXPENSIVE: "#a78bfa", LUXURY: "#f59e0b",
};

const CUISINES = ["All","Indian","Chinese","Italian","Japanese","Mexican","Thai","Continental"];
const PRICES   = [{ v:"", l:"All" },{ v:"BUDGET", l:"₹" },{ v:"MODERATE", l:"₹₹" },{ v:"EXPENSIVE", l:"₹₹₹" }];

interface Location2 { lat: number; lng: number }
const MUMBAI: Location2 = { lat: 19.0760, lng: 72.8777 };

export default function ExploreScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [location, setLocation]       = useState<Location2 | null>(null);
  const [cuisine,  setCuisine]        = useState("");
  const [price,    setPrice]          = useState("");
  const [search,   setSearch]         = useState("");
  const [selected, setSelected]       = useState<string | null>(null);
  const [filterOpen, setFilterOpen]   = useState(false);

  const center = location ?? MUMBAI;

  // Request location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })();
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey:  ["nearby", center.lat, center.lng, cuisine, price],
    queryFn:   () => apiGet<{ data: any[] }>(`/restaurants/nearby?lat=${center.lat}&lng=${center.lng}&radius=10${cuisine ? `&cuisine=${cuisine}` : ""}${price ? `&priceRange=${price}` : ""}&limit=30`),
    staleTime: 5 * 60_000,
  });

  const restaurants = (data as any)?.data ?? [];
  const filtered    = search ? restaurants.filter((r: any) => r.name.toLowerCase().includes(search.toLowerCase())) : restaurants;
  const selectedRest= selected ? restaurants.find((r: any) => r.id === selected) : null;

  const flyTo = useCallback((lat: number, lng: number) => {
    mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
  }, []);

  return (
    <View style={s.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={s.map}
        initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        customMapStyle={darkMapStyle}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {restaurants.map((r: any) => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.latitude, longitude: r.longitude }}
            onPress={() => { setSelected(r.id); flyTo(r.latitude, r.longitude); }}
          >
            <View style={[s.marker, { backgroundColor: PRICE_COLORS[r.priceRange] ?? "#f97316" }]}>
              <Text style={s.markerText}>🍽️</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Search bar overlay */}
      <View style={s.searchOverlay}>
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Ionicons name="search" size={16} color="#71717a" style={{ marginRight: 6 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Search restaurants…"
              placeholderTextColor="#71717a"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity onPress={() => setFilterOpen(p => !p)} style={s.filterBtn}>
            <Ionicons name="options" size={20} color={filterOpen ? "#f97316" : "#fafafa"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => location && flyTo(location.lat, location.lng)} style={s.filterBtn}>
            <Ionicons name="locate" size={20} color="#fafafa" />
          </TouchableOpacity>
        </View>

        {/* Cuisine filter row */}
        {filterOpen && (
          <View>
            <FlatList
              horizontal showsHorizontalScrollIndicator={false}
              data={CUISINES} keyExtractor={c => c}
              contentContainerStyle={{ gap: 6, paddingVertical: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => setCuisine(item === "All" ? "" : item.toUpperCase())}
                  style={[s.chip, cuisine === (item === "All" ? "" : item.toUpperCase()) && s.chipActive]}>
                  <Text style={[s.chipText, cuisine === (item === "All" ? "" : item.toUpperCase()) && s.chipTextActive]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <FlatList
              horizontal showsHorizontalScrollIndicator={false}
              data={PRICES} keyExtractor={p => p.v}
              contentContainerStyle={{ gap: 6, paddingBottom: 4 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => setPrice(item.v)}
                  style={[s.chip, price === item.v && s.chipActive]}>
                  <Text style={[s.chipText, price === item.v && s.chipTextActive]}>{item.l}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Selected marker preview */}
      {selectedRest && (
        <TouchableOpacity style={s.previewCard} activeOpacity={0.9} onPress={() => router.push(`/restaurant/${selectedRest.id}`)}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fafafa", fontWeight: "700", fontSize: 15 }}>{selectedRest.name}</Text>
            <Text style={{ color: "#a1a1aa", fontSize: 12, marginTop: 2 }}>{selectedRest.cuisineType} · {selectedRest.city}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              <Text style={{ color: "#fbbf24", fontWeight: "700" }}>★ {selectedRest.rating?.toFixed(1)}</Text>
              {selectedRest.distance_km != null && <Text style={{ color: "#71717a" }}>{selectedRest.distance_km < 1 ? `${Math.round(selectedRest.distance_km*1000)}m` : `${selectedRest.distance_km.toFixed(1)}km`}</Text>}
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push(`/restaurant/${selectedRest.id}`)} style={s.viewBtn}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>View →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelected(null)} style={[s.viewBtn, { backgroundColor: "#27272a", marginLeft: 6 }]}>
            <Ionicons name="close" size={16} color="#fafafa" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Restaurant list */}
      <View style={s.listContainer}>
        <View style={s.handleBar} />
        <Text style={s.listTitle}>{isLoading ? "Finding nearby…" : `${filtered.length} restaurants near you`}</Text>
        {isLoading ? (
          <ActivityIndicator color="#f97316" style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={r => r.id}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#f97316" />}
            renderItem={({ item }) => (
              <RestaurantCard restaurant={item} onPress={() => router.push(`/restaurant/${item.id}`)} />
            )}
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 40 }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🍽️</Text>
                <Text style={{ color: "#71717a", textAlign: "center" }}>No restaurants found. Try adjusting filters.</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#09090b" },
  map:           { width: "100%", height: "50%" },
  searchOverlay: { position: "absolute", top: 54, left: 16, right: 16, zIndex: 10 },
  searchRow:     { flexDirection: "row", gap: 8, marginBottom: 0 },
  searchBox:     { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(9,9,11,0.9)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#27272a" },
  searchInput:   { flex: 1, color: "#fafafa", fontSize: 14 },
  filterBtn:     { backgroundColor: "rgba(9,9,11,0.9)", borderRadius: 12, width: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#27272a" },
  marker:        { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  markerText:    { fontSize: 16 },
  previewCard:   { position: "absolute", bottom: "52%", left: 16, right: 16, backgroundColor: "#18181b", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#27272a", zIndex: 5 },
  viewBtn:       { backgroundColor: "#f97316", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  listContainer: { flex: 1, backgroundColor: "#09090b", borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -16 },
  handleBar:     { width: 36, height: 4, backgroundColor: "#3f3f46", borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 2 },
  listTitle:     { color: "#a1a1aa", fontSize: 13, fontWeight: "600", paddingHorizontal: 16, paddingVertical: 10 },
  chip:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "#3f3f46" },
  chipActive:    { backgroundColor: "rgba(249,115,22,0.2)", borderColor: "#f97316" },
  chipText:      { color: "#a1a1aa", fontSize: 13, fontWeight: "600" },
  chipTextActive:{ color: "#f97316" },
});

const darkMapStyle = [
  { elementType: "geometry",        stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill",stylers: [{ color: "#a1a1aa" }] },
  { featureType: "road",  elementType: "geometry", stylers: [{ color: "#27272a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "poi",   elementType: "geometry", stylers: [{ color: "#18181b" }] },
];
