// src/utils/josa.ts (질문 조사 치환)
export function hasBatchim(word: string) {
    if (!word) return false;
    const target = word.trim();
    if (!target) return false;

    const lastChar = target[target.length - 1];
    const code = lastChar.charCodeAt(0) - 0xac00;

    if (code < 0 || code > 11171) return false;

    return code % 28 !== 0;
}

export function pickJosa(word: string, pair: string) {
    const batchim = hasBatchim(word);

    switch (pair) {
        case "은/는":
            return batchim ? "은" : "는";
        case "을/를":
            return batchim ? "을" : "를";
        case "이/가":
            return batchim ? "이" : "가";
        case "와/과":
            return batchim ? "과" : "와";
        default:
            return pair;
    }
}

export function replaceExperienceName(text: string, name: string) {
    if (!text) return "";

    const safe = name.trim();

    return text
        .replace(/\(@experience_name\)\(은\/는\)/g, `${safe}${pickJosa(safe, "은/는")}`)
        .replace(/\(@experience_name\)\(을\/를\)/g, `${safe}${pickJosa(safe, "을/를")}`)
        .replace(/\(@experience_name\)\(이\/가\)/g, `${safe}${pickJosa(safe, "이/가")}`)
        .replace(/\(@experience_name\)\(와\/과\)/g, `${safe}${pickJosa(safe, "와/과")}`)
        .replace(/\(@experience_name\)/g, safe);
}