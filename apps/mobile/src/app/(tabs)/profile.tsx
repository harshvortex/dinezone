import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useAuth } from "../../providers/AuthProvider";
import { apiPut } from "../../lib/api";
import Constants from "expo-constants";

const MENU_ITEMS = [
  { icon: "✏️",  label: "Edit Profile",       screen: "/profile/edit" as const },
  { icon: "🔒",  label: "Change Password",     screen: "/profile/change-password" as const },
  { icon: "❓",  label: "Help & Support",       screen: "/support" as const },
  { icon: "⭐",  label: "Rate DineSpot",        screen: null },
  { icon: "📋",  label: "Terms & Privacy",      screen: "/legal" as const },
];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo library access to change your avatar."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const uri      = result.assets[0].uri;
      const filename = uri.split("/").pop() ?? "avatar.jpg";
      const formData = new FormData();
      formData.append("file", { uri, name: filename, type: "image/jpeg" } as any);
      const token = await import("../../lib/api").then(m => m.tokenStore.getAccess());
      const apiUrl = Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:4000/api/v1";
      const res = await fetch(`${apiUrl}/upload/avatar`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!res.ok) throw new Error("Upload failed");
      Alert.alert("Avatar updated!");
    } catch (err: any) { Alert.alert("Error", err.message); }
    finally { setUploading(false); }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel" },
      { text: "Logout", style: "destructive", onPress: async () => { await logout(); router.replace("/auth/login"); } },
    ]);
  };

  if (!user) return (
    <View style={s.center}>
      <Text style={{ color: "#71717a", marginBottom: 16 }}>You are not signed in.</Text>
      <TouchableOpacity onPress={() => router.push("/auth/login")} style={s.loginBtn}><Text style={{ color: "#fff", fontWeight: "700" }}>Sign In</Text></TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      {/* Avatar */}
      <View style={s.avatarSection}>
        <TouchableOpacity onPress={pickAvatar} style={s.avatarWrapper}>
          {user.avatar
            ? <Image source={{ uri: user.avatar }} style={s.avatar} contentFit="cover" />
            : <View style={[s.avatar, s.avatarPlaceholder]}><Text style={{ fontSize: 36, color: "#fff", fontWeight: "700" }}>{user.name?.[0]?.toUpperCase()}</Text></View>
          }
          <View style={s.cameraIcon}><Text style={{ fontSize: 14 }}>📷</Text></View>
          {uploading && <View style={[s.avatar, { position: "absolute", backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" }]}><Text style={{ color: "#fff" }}>…</Text></View>}
        </TouchableOpacity>
        <Text style={s.name}>{user.name}</Text>
        <Text style={s.email}>{user.email}</Text>
        <View style={s.roleBadge}><Text style={s.roleText}>{user.role === "RESTAURANT_OWNER" ? "🏪 Restaurant Owner" : "🍽️ Diner"}</Text></View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[{ l: "Bookings", v: "–" }, { l: "Reviews", v: "–" }, { l: "Member since", v: new Date().getFullYear().toString() }].map(({ l, v }) => (
          <View key={l} style={s.stat}>
            <Text style={s.statVal}>{v}</Text>
            <Text style={s.statLbl}>{l}</Text>
          </View>
        ))}
      </View>

      {/* Menu */}
      <View style={s.menu}>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity key={item.label} onPress={() => item.screen && router.push(item.screen as any)}
            style={s.menuItem} activeOpacity={0.7}>
            <View style={s.menuLeft}>
              <Text style={s.menuIcon}>{item.icon}</Text>
              <Text style={s.menuLabel}>{item.label}</Text>
            </View>
            <Text style={{ color: "#52525b", fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        ))}

        {user.role === "RESTAURANT_OWNER" && (
          <TouchableOpacity onPress={() => router.push("/owner")} style={s.menuItem} activeOpacity={0.7}>
            <View style={s.menuLeft}>
              <Text style={s.menuIcon}>🏪</Text>
              <Text style={[s.menuLabel, { color: "#f97316" }]}>Owner Dashboard</Text>
            </View>
            <Text style={{ color: "#52525b", fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleLogout} style={[s.menuItem, { borderTopWidth: 1, borderTopColor: "#27272a", marginTop: 8, paddingTop: 20 }]} activeOpacity={0.7}>
          <View style={s.menuLeft}>
            <Text style={s.menuIcon}>🚪</Text>
            <Text style={[s.menuLabel, { color: "#f87171" }]}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={s.version}>DineSpot v1.0.0</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: "#09090b" },
  scroll:           { paddingBottom: 40 },
  center:           { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#09090b" },
  loginBtn:         { backgroundColor: "#f97316", paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  avatarSection:    { alignItems: "center", paddingTop: 32, paddingBottom: 24 },
  avatarWrapper:    { position: "relative", marginBottom: 14 },
  avatar:           { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder:{ backgroundColor: "#f97316", alignItems: "center", justifyContent: "center" },
  cameraIcon:       { position: "absolute", bottom: 0, right: 0, backgroundColor: "#27272a", borderRadius: 14, width: 28, height: 28, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#09090b" },
  name:             { color: "#fafafa", fontSize: 20, fontWeight: "800" },
  email:            { color: "#71717a", fontSize: 14, marginTop: 4 },
  roleBadge:        { marginTop: 8, backgroundColor: "rgba(249,115,22,0.15)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleText:         { color: "#f97316", fontSize: 13, fontWeight: "600" },
  statsRow:         { flexDirection: "row", marginHorizontal: 16, backgroundColor: "#18181b", borderRadius: 14, padding: 16, justifyContent: "space-around", marginBottom: 16, borderWidth: 1, borderColor: "#27272a" },
  stat:             { alignItems: "center" },
  statVal:          { color: "#fafafa", fontSize: 18, fontWeight: "800" },
  statLbl:          { color: "#71717a", fontSize: 12, marginTop: 2 },
  menu:             { marginHorizontal: 16, backgroundColor: "#18181b", borderRadius: 14, borderWidth: 1, borderColor: "#27272a", paddingVertical: 8 },
  menuItem:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16 },
  menuLeft:         { flexDirection: "row", alignItems: "center", gap: 14 },
  menuIcon:         { fontSize: 20, width: 28 },
  menuLabel:        { color: "#fafafa", fontSize: 15, fontWeight: "500" },
  version:          { textAlign: "center", color: "#52525b", fontSize: 12, marginTop: 24 },
});
