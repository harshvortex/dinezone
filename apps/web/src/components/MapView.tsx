"use client";
import { useEffect, useRef, useState, useCallback } from "react";

interface Marker {
  id:         string;
  lat:        number;
  lng:        number;
  name:       string;
  priceRange: string;
  rating:     number;
  coverImage?:string;
}

interface Props {
  center:    { lat: number; lng: number };
  markers:   Marker[];
  onMarkerClick?: (id: string) => void;
  zoom?:     number;
}

const PRICE_COLORS: Record<string, string> = {
  BUDGET:    "#4ade80",
  MODERATE:  "#f97316",
  EXPENSIVE: "#a78bfa",
  LUXURY:    "#f59e0b",
};

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

export function MapView({ center, markers, onMarkerClick, zoom = 13 }: Props) {
  const mapRef         = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef     = useRef<google.maps.Marker[]>([]);
  const [ready, setReady] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps) { setReady(true); return; }
    window.initGoogleMaps = () => setReady(true);
    const script  = document.createElement("script");
    const key     = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
    script.src    = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=initGoogleMaps`;
    script.async  = true;
    script.defer  = true;
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  // Init map
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      disableDefaultUI: false,
      mapTypeControl:   false,
      streetViewControl:false,
      styles: [
        { elementType: "geometry",         stylers: [{ color: "#1a1a2e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#a1a1aa" }] },
        { elementType: "labels.text.stroke",stylers: [{ color: "#1a1a2e" }] },
        { featureType: "road",  elementType: "geometry",          stylers: [{ color: "#27272a" }] },
        { featureType: "water", elementType: "geometry",          stylers: [{ color: "#0f172a" }] },
        { featureType: "poi",   elementType: "geometry",          stylers: [{ color: "#18181b" }] },
        { featureType: "poi",   elementType: "labels.text.fill",  stylers: [{ color: "#71717a" }] },
        { featureType: "transit",elementType: "geometry",         stylers: [{ color: "#27272a" }] },
      ],
    });
  }, [ready, center, zoom]);

  // Sync markers
  const syncMarkers = useCallback(() => {
    if (!mapInstanceRef.current) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const infoWindow = new window.google.maps.InfoWindow();

    markers.forEach(m => {
      const color = PRICE_COLORS[m.priceRange] ?? "#f97316";
      const marker = new window.google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map:      mapInstanceRef.current!,
        title:    m.name,
        icon: {
          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
          fillColor: color, fillOpacity: 1, strokeColor: "#fff",
          strokeWeight: 1.5, scale: 1.4,
          anchor: new window.google.maps.Point(12, 22),
        },
      });

      marker.addListener("click", () => {
        infoWindow.setContent(`
          <div style="background:#18181b;color:#fafafa;border-radius:10px;padding:12px;min-width:160px;font-family:Inter,sans-serif">
            <strong style="font-size:14px">${m.name}</strong>
            <div style="font-size:12px;color:#fbbf24;margin-top:4px">★ ${m.rating.toFixed(1)}</div>
            ${m.coverImage ? `<img src="${m.coverImage}" style="width:100%;height:70px;object-fit:cover;border-radius:6px;margin-top:8px" />` : ""}
          </div>
        `);
        infoWindow.open(mapInstanceRef.current, marker);
        onMarkerClick?.(m.id);
      });

      markersRef.current.push(marker);
    });
  }, [markers, onMarkerClick]);

  useEffect(() => {
    if (ready && mapInstanceRef.current) syncMarkers();
  }, [ready, syncMarkers]);

  if (!ready) {
    return (
      <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", background: "var(--bg-secondary)" }}>
        <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🗺️</div>
          <p style={{ fontSize: "0.875rem" }}>Loading map…</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}
