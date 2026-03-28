import { useEffect, useState } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "@executive_theme";

export const loadSavedTheme = async () => {
  try {
    const saved = await AsyncStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") {
      Appearance.setColorScheme(saved);
      return saved;
    }
  } catch {}
  return "light";
};

export const saveTheme = (theme: "light" | "dark") => {
  Appearance.setColorScheme(theme);
  AsyncStorage.setItem(THEME_KEY, theme);
};

export const useThemePersistence = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSavedTheme().then(() => setLoaded(true));
  }, []);

  return loaded;
};
