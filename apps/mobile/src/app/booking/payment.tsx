import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiPost } from "../../lib/api";
import Constants from "expo-constants";

declare const RazorpayCheckout: {
  open: (options: Record<string, unknown>) => Promise<{ razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }>;
};

export default function PaymentScreen() {
  const router  = useRouter();
  const params  = useLocalSearchParams<{ bookingId: string; orderId: string; amount: string; keyId: string; restaurantName: string }>();
  const [status, setStatus] = useState<"loading" | "paying" | "verifying" | "error">("loading");
  const [errMsg, setErrMsg] = useState("");

  const keyId = params.keyId ?? Constants.expoConfig?.extra?.razorpayKeyId ?? "";

  useEffect(() => {
    setStatus("paying");
    openPayment();
  }, []);

  const openPayment = async () => {
    try {
      const result = await RazorpayCheckout.open({
        description:  `DineSpot — ${params.restaurantName ?? "Restaurant"}`,
        image:        "https://i.imgur.com/3g7nmJC.png",
        currency:     "INR",
        key:          keyId,
        amount:       Number(params.amount),
        order_id:     params.orderId,
        name:         "DineSpot",
        prefill:      { email: "", contact: "" },
        theme:        { color: "#f97316" },
      });
      await verify(result);
    } catch (err: any) {
      if (err?.code === "PAYMENT_CANCELLED") {
        router.back();
      } else {
        setStatus("error");
        setErrMsg(err?.description ?? "Payment failed. Try again.");
      }
    }
  };

  const verify = async (rzpResult: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
    setStatus("verifying");
    try {
      await apiPost("/payments/verify", { ...rzpResult, bookingId: params.bookingId });
      router.replace({ pathname: "/booking/confirmation", params: { bookingId: params.bookingId } });
    } catch {
      setStatus("error");
      setErrMsg("Payment verified but booking update failed. Contact support with ref: " + params.bookingId);
    }
  };

  return (
    <View style={s.container}>
      {status === "loading" || status === "paying" ? (
        <>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={s.label}>{status === "loading" ? "Loading payment…" : "Opening Razorpay…"}</Text>
        </>
      ) : status === "verifying" ? (
        <>
          <ActivityIndicator size="large" color="#4ade80" />
          <Text style={s.label}>Verifying payment…</Text>
          <Text style={s.sub}>Please do not close the app</Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
          <Text style={[s.label, { color: "#f87171" }]}>Payment Error</Text>
          <Text style={[s.sub, { textAlign: "center" }]}>{errMsg}</Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
            <Text onPress={() => { setStatus("paying"); openPayment(); }} style={s.retryBtn}>Retry</Text>
            <Text onPress={() => router.back()} style={[s.retryBtn, { backgroundColor: "#27272a" }]}>Cancel</Text>
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#09090b", gap: 16 },
  label:     { color: "#fafafa", fontSize: 18, fontWeight: "700" },
  sub:       { color: "#71717a", fontSize: 14 },
  retryBtn:  { backgroundColor: "#f97316", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, color: "#fff", fontWeight: "700", fontSize: 15 },
});
