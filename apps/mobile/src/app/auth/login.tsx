import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuth } from "../../providers/AuthProvider";
import { tokenStore } from "../../lib/api";

export default function LoginScreen() {
  const { login } = useAuth();
  const router    = useRouter();
  const [tab,     setTab]     = useState<"email"|"phone">("email");
  const [email,   setEmail]   = useState("");
  const [password,setPassword]= useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("Email and password are required"); return; }
    setError(""); setLoading(true);
    try {
      await login(email, password);
      router.replace("/(tabs)/explore");
    } catch (err: any) { setError(err?.response?.data?.error?.message ?? err.message ?? "Login failed"); }
    finally { setLoading(false); }
  };

  const handleBiometric = async () => {
    const hasToken = await tokenStore.getAccess();
    if (!hasToken) { Alert.alert("Not available", "Sign in with email first to enable biometric login."); return; }
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Sign in to DineSpot", fallbackLabel: "Use Password" });
    if (result.success) router.replace("/(tabs)/explore");
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.logo}>🍽️</Text>
        <Text style={s.heading}>Welcome back</Text>
        <Text style={s.sub}>Sign in to your DineSpot account</Text>

        {/* Tabs */}
        <View style={s.segmented}>
          {(["email","phone"] as const).map(t => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.seg, tab === t && s.segActive]}>
              <Text style={[s.segText, tab === t && s.segTextActive]}>{t === "email" ? "📧 Email" : "📱 Phone OTP"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <View style={s.errorBox}><Text style={s.errorText}>⚠️ {error}</Text></View> : null}

        {tab === "email" ? (
          <>
            <Text style={s.label}>Email address</Text>
            <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#52525b" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />

            <Text style={s.label}>Password</Text>
            <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#52525b" secureTextEntry autoComplete="current-password" />

            <TouchableOpacity onPress={handleLogin} disabled={loading} style={[s.btn, loading && { opacity: 0.6 }]}>
              <Text style={s.btnText}>{loading ? "Signing in…" : "Sign In →"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleBiometric} style={s.bioBtn}>
              <Text style={s.bioBtnText}>🔐 Sign in with Face ID / Fingerprint</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={s.otpInfo}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>📱</Text>
            <Text style={{ color: "#a1a1aa", textAlign: "center" }}>Phone OTP requires Clerk integration. Add @clerk/clerk-expo and wrap your app in ClerkProvider.</Text>
          </View>
        )}

        <View style={s.divider}><View style={s.divLine} /><Text style={s.divText}>or</Text><View style={s.divLine} /></View>

        <TouchableOpacity onPress={() => router.push("/auth/signup")} style={s.signupBtn}>
          <Text style={s.signupBtnText}>Create Account →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: "#09090b" },
  scroll:       { padding: 24, paddingTop: 48 },
  logo:         { fontSize: 42, textAlign: "center", marginBottom: 16 },
  heading:      { color: "#fafafa", fontSize: 26, fontWeight: "800", textAlign: "center" },
  sub:          { color: "#71717a", fontSize: 15, textAlign: "center", marginBottom: 24, marginTop: 4 },
  segmented:    { flexDirection: "row", backgroundColor: "#18181b", borderRadius: 10, padding: 3, marginBottom: 20 },
  seg:          { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  segActive:    { backgroundColor: "rgba(249,115,22,0.18)" },
  segText:      { color: "#71717a", fontWeight: "600" },
  segTextActive:{ color: "#f97316" },
  errorBox:     { backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" },
  errorText:    { color: "#f87171", fontSize: 13 },
  label:        { color: "#a1a1aa", fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 4 },
  input:        { backgroundColor: "#18181b", borderRadius: 12, padding: 14, color: "#fafafa", fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: "#27272a" },
  btn:          { backgroundColor: "#f97316", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  btnText:      { color: "#fff", fontWeight: "800", fontSize: 16 },
  bioBtn:       { backgroundColor: "#18181b", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 10, borderWidth: 1, borderColor: "#27272a" },
  bioBtnText:   { color: "#a1a1aa", fontWeight: "600", fontSize: 14 },
  otpInfo:      { alignItems: "center", paddingVertical: 32 },
  divider:      { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 20 },
  divLine:      { flex: 1, height: 1, backgroundColor: "#27272a" },
  divText:      { color: "#52525b", fontSize: 13 },
  signupBtn:    { backgroundColor: "#27272a", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  signupBtnText:{ color: "#a1a1aa", fontWeight: "700", fontSize: 15 },
});
