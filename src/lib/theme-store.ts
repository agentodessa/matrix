import { useEffect, useState } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "@executive_theme";

export async function loadSavedTheme() {
  try {
    const saved = await AsyncStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") {
      Appearance.setColorScheme(saved);
      return saved;
    }
  } catch {}
  return "light";
}

export async function saveTheme(theme: "light" | "dark") {
  try {
    await AsyncStorage.setItem(THEME_KEY, theme);
    Appearance.setColorScheme(theme);
  } catch {}
}

export function useThemePersistence() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSavedTheme().then(() => setLoaded(true));
  }, []);

  return loaded;
}
