// src/components/languageSwitcher.tsx
//import React from "react";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { t } = useTranslation();

  const setLang = (lang: "ko" | "en") => {
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button type="button" onClick={() => setLang("ko")}>
        {t("common.korean")}
      </button>
      <button type="button" onClick={() => setLang("en")}>
        {t("common.english")}
      </button>
    </div>
  );
}
