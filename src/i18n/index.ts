// src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ko from "./locales/ko.json";
import en from "./locales/en.json";

type Lang = "ko" | "en";

function detectDeviceLang(): Lang {
  const navLang =
    (navigator.languages && navigator.languages[0]) ||
    navigator.language ||
    "ko";

  const lower = navLang.toLowerCase();
  if (lower.startsWith("en")) return "en";
  if (lower.startsWith("ko")) return "ko";
  return "ko";
}

function getInitialLang(): Lang {
  const saved = localStorage.getItem("lang") as Lang | null;
  if (saved === "ko" || saved === "en") return saved;
  return detectDeviceLang();
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
    },
    lng: getInitialLang(),
    fallbackLng: "ko",
    interpolation: { escapeValue: false },
  });

export default i18n;
