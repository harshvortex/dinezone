import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../providers/AuthProvider";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            60_000,
      gcTime:               5 * 60_000,
      retry:                1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      // Request push notification permission
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        await Notifications.getExpoPushTokenAsync({
          projectId: "YOUR_EAS_PROJECT_ID",
        }).catch(() => null);
      }
      setReady(true);
      await SplashScreen.hideAsync();
    }
    init();
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" backgroundColor="#09090b" />
          <Stack
            screenOptions={{
              headerStyle:      { backgroundColor: "#09090b" },
              headerTintColor:  "#fafafa",
              headerTitleStyle: { fontWeight: "700" },
              contentStyle:     { backgroundColor: "#09090b" },
            }}
          >
            <Stack.Screen name="(tabs)"        options={{ headerShown: false }} />
            <Stack.Screen name="auth/login"    options={{ title: "Sign In",     presentation: "modal" }} />
            <Stack.Screen name="auth/signup"   options={{ title: "Create Account", presentation: "modal" }} />
            <Stack.Screen name="restaurant/[id]" options={{ title: "", headerTransparent: true }} />
            <Stack.Screen name="booking/review"  options={{ title: "Review Booking" }} />
            <Stack.Screen name="booking/payment" options={{ title: "Payment" }} />
            <Stack.Screen name="booking/confirmation" options={{ headerShown: false }} />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
