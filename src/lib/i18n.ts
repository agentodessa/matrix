import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "../locales/en.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import ru from "../locales/ru.json";

const SUPPORTED_LANGS = ["en", "es", "fr", "ru"] as const;
const LANG_STORAGE_KEY = "@executive_lang";

function getDeviceLanguage(): string {
  const locales = getLocales();
  const deviceLang = locales[0]?.languageCode ?? "en";
  return SUPPORTED_LANGS.includes(deviceLang as any) ? deviceLang : "en";
}

async function getStoredLanguage(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setLanguage(lng: string) {
  await AsyncStorage.setItem(LANG_STORAGE_KEY, lng);
  await i18n.changeLanguage(lng);
}

// Initialize
getStoredLanguage().then((stored) => {
  const lng = stored ?? getDeviceLanguage();

  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      ru: { translation: ru },
    },
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    keySeparator: false,
    nsSeparator: false,
  });
});

export default i18n;
