export function getFileExtension(fileName?: string | null, fallback = "file"): string {
    const extension = fileName?.split(".").pop();

    if (!extension || extension === fileName) return fallback;

    return extension.toLowerCase();
}

export function normalizeFileExtension(extension?: string | null): string {
    const lower = (extension ?? "").toLowerCase();
    const aliases: Record<string, string> = {
        jpeg: "jpg",
        pptx: "ppt",
        docx: "doc",
        xlsx: "xls",
    };

    return aliases[lower] ?? lower;
}

export function getFileKey(file: Pick<File, "name" | "size" | "lastModified">): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
}

export function isValidHttpUrl(value: string): boolean {
    const trimmedValue = value.trim();

    if (!trimmedValue) return false;

    try {
        const url = new URL(trimmedValue);

        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export function isSameNumberArray(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;

    const sortedA = [...a].sort((prev, next) => prev - next);
    const sortedB = [...b].sort((prev, next) => prev - next);

    return sortedA.every((value, index) => value === sortedB[index]);
}
