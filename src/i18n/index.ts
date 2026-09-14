import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ko from "./locales/ko.json";
import en from "./locales/en.json";
import marketingKo from "./locales/marketing.ko.json";
import marketingEn from "./locales/marketing.en.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko, marketing: marketingKo },
      en: { translation: en, marketing: marketingEn },
    },

    fallbackLng: "ko",

    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "lang",
      caches: ["localStorage"],
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
