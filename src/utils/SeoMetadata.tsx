import { useEffect } from "react";

interface SeoMetaProps {
    title: string;
    description?: string;
    lang?: "ko" | "en";
    noindex?: boolean;
    canonical?: string;
}

export default function SeoMeta({ title, description, lang = "ko", noindex = false, canonical }: SeoMetaProps): null {
    useEffect(() => {
        document.title = title;
        document.documentElement.lang = lang;

        const descriptionMeta = getOrCreateMeta("description");
        descriptionMeta.content = description ?? "";

        const robotsMeta = getOrCreateMeta("robots");
        robotsMeta.content = noindex ? "noindex, nofollow" : "index, follow";

        let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');

        if (canonical) {
            if (!canonicalLink) {
                canonicalLink = document.createElement("link");
                canonicalLink.rel = "canonical";
                document.head.appendChild(canonicalLink);
            }

            canonicalLink.href = canonical;
        } else {
            canonicalLink?.remove();
        }
    }, [canonical, description, lang, noindex, title]);

    return null;
}

function getOrCreateMeta(name: string): HTMLMetaElement {
    let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);

    if (!meta) {
        meta = document.createElement("meta");
        meta.name = name;
        document.head.appendChild(meta);
    }

    return meta;
}