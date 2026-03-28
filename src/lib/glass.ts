import { Platform } from "react-native";

let _glassAvailable: boolean | null = null;

export const isGlassAvailable = (): boolean => {
  if (_glassAvailable !== null) return _glassAvailable;
  if (Platform.OS !== "ios") {
    _glassAvailable = false;
    return false;
  }
  try {
    const { isGlassEffectAPIAvailable } = require("expo-glass-effect");
    _glassAvailable = isGlassEffectAPIAvailable();
  } catch {
    _glassAvailable = false;
  }
  return _glassAvailable;
};
