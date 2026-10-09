import * as Linking from "expo-linking";
import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { handleAuthUrl, isAuthLink } from "../lib/authLink";

export default function RootLayout() {
  // Email confirmation link: handled here, not in the callback screen, because
  // the link event can arrive before that screen has mounted.
  useEffect(() => {
    const open = async (url: string | null) => {
      if (!isAuthLink(url)) return;
      const error = await handleAuthUrl(url);
      try {
        if (error) {
          router.replace({ pathname: "/auth/callback", params: { error } });
        } else {
          router.replace("/profile-setup");
        }
      } catch {
        // navigation not ready yet; the callback screen handles the link too
      }
    };

    Linking.getInitialURL().then(open);
    const sub = Linking.addEventListener("url", (e) => open(e.url));
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </SafeAreaProvider>
  );
}
