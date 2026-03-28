module.exports = {
  input: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
  output: "./",
  options: {
    sort: true,
    removeUnusedKeys: true,
    func: {
      list: ["t", "i18next.t", "i18n.t"],
      extensions: [".ts", ".tsx"],
    },
    lngs: ["en", "es", "fr", "ru"],
    defaultLng: "en",
    defaultNs: "translation",
    resource: {
      loadPath: "src/locales/{{lng}}.json",
      savePath: "src/locales/{{lng}}.json",
    },
    keySeparator: false,
    nsSeparator: false,
  },
};
