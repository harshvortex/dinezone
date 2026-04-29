import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiGet } from "../../lib/api";
import { io } from "socket.io-client";
import Constants from "expo-constants";

function TabIcon({ name, focused, badge }: { name: keyof typeof Ionicons.glyphMap; focused: boolean; badge?: number }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={name} size={24} color={focused ? "#f97316" : "#71717a"} />
      {badge != null && badge > 0 && (
        <View style={{ position: "absolute", top: -4, right: -8, backgroundColor: "#f97316", borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    apiGet<{ count: number }>("/notifications/unread-count")
      .then(d => setUnread(d.count))
      .catch(() => {});

    const socketUrl = Constants.expoConfig?.extra?.socketUrl ?? "http://localhost:4000";
    const socket = io(socketUrl, { transports: ["websocket"] });
    socket.on("notification:new", () => setUnread(p => p + 1));
    return () => { socket.disconnect(); };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle:           { backgroundColor: "#09090b", borderTopColor: "#27272a", height: 60 },
        tabBarActiveTintColor:  "#f97316",
        tabBarInactiveTintColor:"#71717a",
        tabBarLabelStyle:       { fontSize: 11, fontWeight: "600", marginBottom: 6 },
        headerStyle:            { backgroundColor: "#09090b" },
        headerTintColor:        "#fafafa",
        headerTitleStyle:       { fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="explore"      options={{ title: "Explore",   tabBarIcon: ({ focused }) => <TabIcon name={focused ? "map" : "map-outline"} focused={focused} /> }} />
      <Tabs.Screen name="bookings"     options={{ title: "Bookings",  tabBarIcon: ({ focused }) => <TabIcon name={focused ? "calendar" : "calendar-outline"} focused={focused} /> }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts",   tabBarIcon: ({ focused }) => <TabIcon name={focused ? "notifications" : "notifications-outline"} focused={focused} badge={unread} /> }} />
      <Tabs.Screen name="profile"      options={{ title: "Profile",   tabBarIcon: ({ focused }) => <TabIcon name={focused ? "person" : "person-outline"} focused={focused} /> }} />
    </Tabs>
  );
}
