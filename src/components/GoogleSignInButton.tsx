import { useState, useEffect } from "react";
import { Text, Pressable, Alert, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

// Complete any pending auth session on web
if (Platform.OS === "web") {
  WebBrowser.maybeCompleteAuthSession();
}

// On web: extract tokens from URL hash on page load (Tauri redirect)
if (Platform.OS === "web" && typeof window !== "undefined") {
  const hash = window.location.hash;
  if (hash && hash.includes("access_token")) {
    const params = extractHashParams(window.location.href);
    if (params.access_token && params.refresh_token) {
      window.history.replaceState(null, "", window.location.pathname);
      supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
    }
  }
}

// The redirect URL for native — must use the app scheme
const nativeRedirectUrl = Linking.createURL("auth/callback");

export const GoogleSignInButton = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Web: listen for auth state changes after token extraction
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        onSuccess?.();
      }
    });
    return () => subscription.unsubscribe();
  }, [onSuccess]);

  const handlePress = async () => {
    setLoading(true);

    try {
      const redirectTo =
        Platform.OS === "web"
          ? window.location.origin + window.location.pathname
          : nativeRedirectUrl;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data.url) {
        setLoading(false);
        Alert.alert(t("Google Sign-In Failed"), error?.message ?? t("Could not start sign-in"));
        return;
      }

      if (Platform.OS === "web") {
        // Tauri/web: navigate in the same window
        window.location.href = data.url;
        return;
      }

      // ── Native (iOS/Android) ──
      // Open the OAuth URL in an in-app browser
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
        showInRecents: true,
      });

      setLoading(false);

      if (result.type === "success" && result.url) {
        // Extract tokens from the redirect URL
        // Supabase redirects to: eisenhower-reminder:///auth/callback#access_token=...
        const hashParams = extractHashParams(result.url);

        if (hashParams.access_token && hashParams.refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: hashParams.access_token,
            refresh_token: hashParams.refresh_token,
          });

          if (sessionError) {
            Alert.alert(t("Sign-In Error"), sessionError.message);
          } else {
            onSuccess?.();
          }
        } else if (hashParams.error_description) {
          Alert.alert(t("Sign-In Error"), decodeURIComponent(hashParams.error_description));
        }
      } else if (result.type === "cancel" || result.type === "dismiss") {
        // User cancelled — do nothing
      }
    } catch (e: unknown) {
      setLoading(false);
      const message = e instanceof Error ? e.message : "Something went wrong";
      Alert.alert(t("Google Sign-In Failed"), message);
    }
  };

  return (
    <Pressable
      className={
        loading
          ? "bg-btn-surface rounded-xl py-4 items-center border border-border opacity-50"
          : "bg-btn-surface rounded-xl py-4 items-center border border-border active:opacity-70"
      }
      onPress={handlePress}
      disabled={loading}
    >
      <Text className="font-body text-base font-bold text-heading">
        {loading ? t("Connecting...") : t("Continue with Google")}
      </Text>
    </Pressable>
  );
};

const extractHashParams = (url: string): Record<string, string> => {
  const hash = url.split("#")[1];
  if (!hash) return {};
  const params: Record<string, string> = {};
  hash.split("&").forEach((pair) => {
    const [key, value] = pair.split("=");
    if (key && value) params[key] = decodeURIComponent(value);
  });
  return params;
};
