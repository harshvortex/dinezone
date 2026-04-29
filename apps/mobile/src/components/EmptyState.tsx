import { View, Text, StyleSheet } from "react-native";

interface Props { icon: string; message: string; subMessage?: string; }

export function EmptyState({ icon, message, subMessage }: Props) {
  return (
    <View style={s.container}>
      <Text style={s.icon}>{icon}</Text>
      <Text style={s.message}>{message}</Text>
      {subMessage && <Text style={s.sub}>{subMessage}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 24 },
  icon:      { fontSize: 48, marginBottom: 12 },
  message:   { color: "#a1a1aa", fontSize: 16, fontWeight: "600", textAlign: "center" },
  sub:       { color: "#71717a", fontSize: 14, textAlign: "center", marginTop: 6 },
});
