import { defineConfig } from 'i18next-cli';

export default defineConfig({
  locales: ["en", "es", "fr", "ru"],
  primaryLocale: "en",
  extract: {
    input: [
      "app/**/*.{ts,tsx}",
      "src/**/*.{ts,tsx}",
    ],
    output: "src/locales/{{language}}.json",
    defaultNS: "translation",
    functions: ["t", "*.t"],
    keySeparator: false,
    nsSeparator: false,
  },
});
