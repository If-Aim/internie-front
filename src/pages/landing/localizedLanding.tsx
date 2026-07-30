import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import Landing from "./landing";

type LocalizedLandingProps = {
    language: "ko" | "en";
    canonical?: string;
};

export default function LocalizedLanding({
    language,
    canonical
}: LocalizedLandingProps): React.ReactElement {
    const { i18n } = useTranslation();
    const [languageReady, setLanguageReady] = useState(() => {
        return i18n.resolvedLanguage?.startsWith(language) ?? false;
    });

    useEffect(() => {
        let active = true;

        const synchronizeLanguage = async () => {
            if (i18n.resolvedLanguage?.startsWith(language)) {
                if (active) {
                    setLanguageReady(true);
                }

                return;
            }

            setLanguageReady(false);
            await i18n.changeLanguage(language);

            if (active) {
                setLanguageReady(true);
            }
        };

        void synchronizeLanguage();

        return () => {
            active = false;
        };
    }, [i18n, language]);

    if (!languageReady) {
        return <div aria-hidden="true" />;
    }

    return (
        <Landing
            canonical={
                canonical ?? (language === "en"
                    ? "https://www.internie.com/global"
                    : "https://www.internie.com/company")
            }
        />
    );
}
