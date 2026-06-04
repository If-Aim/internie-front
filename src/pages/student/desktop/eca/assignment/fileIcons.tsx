import React from "react";

type FileIconExtension =
    | "txt"
    | "zip"
    | "mp3"
    | "jpg"
    | "fig"
    | "doc"
    | "rar"
    | "wav"
    | "psd"
    | "ppt"
    | "exe"
    | "avi"
    | "png"
    | "ai"
    | "csv"
    | "dmg"
    | "mov"
    | "gif"
    | "aep"
    | "xls"
    | "html"
    | "webp"
    | "sketch"
    | "pdf"
    | "css"
    | "mpg"
    | "tiff"
    | "cdr"
    | "js"
    | "svg"
    | "c4d"
    | "json"
    | "ico"
    | "blend"
    | "java"
    | "hwp"
    | "mp4";

type FileIconMeta = {
    label: string;
    color: string;
};

function normalizeFileIconExtension(extension: string): FileIconExtension | "file" {
    const lower = extension.toLowerCase();

    if (lower === "jpeg") return "jpg";
    if (lower === "docx") return "doc";
    if (lower === "pptx") return "ppt";
    if (lower === "xlsx") return "xls";

    const supportedExtensions: FileIconExtension[] = [
        "txt",
        "zip",
        "mp3",
        "jpg",
        "fig",
        "doc",
        "rar",
        "wav",
        "psd",
        "ppt",
        "exe",
        "avi",
        "png",
        "ai",
        "csv",
        "dmg",
        "mov",
        "gif",
        "aep",
        "xls",
        "html",
        "webp",
        "sketch",
        "pdf",
        "css",
        "mpg",
        "tiff",
        "cdr",
        "js",
        "svg",
        "c4d",
        "json",
        "ico",
        "blend",
        "java",
        "hwp",
        "mp4",
    ];

    return supportedExtensions.includes(lower as FileIconExtension) ? lower as FileIconExtension : "file";
}

function getFileIconMeta(extension: FileIconExtension | "file"): FileIconMeta {
    switch (extension) {
        case "pdf":
            return { label: "PDF", color: "#FF1607" };
        case "ppt":
            return { label: "PPT", color: "#FF1607" };
        case "ai":
            return { label: "AI", color: "#FF5B00" };
        case "blend":
            return { label: "BLEND", color: "#FF8A00" };
        case "sketch":
            return { label: "Sketch", color: "#FFBE32" };
        case "csv":
            return { label: "CSV", color: "#10B86F" };
        case "xls":
            return { label: "XLS", color: "#10B86F" };
        case "html":
            return { label: "HTML", color: "#10B86F" };
        case "css":
            return { label: "CSS", color: "#10B86F" };
        case "js":
            return { label: "JS", color: "#10B86F" };
        case "json":
            return { label: "JSON", color: "#10B86F" };
        case "java":
            return { label: "JAVA", color: "#10B86F" };
        case "cdr":
            return { label: "CDR", color: "#10B86F" };
        case "mp3":
            return { label: "MP3", color: "#6E45F0" };
        case "wav":
            return { label: "WAV", color: "#6E45F0" };
        case "avi":
            return { label: "AVI", color: "#6E45F0" };
        case "mov":
            return { label: "MOV", color: "#6E45F0" };
        case "mpg":
            return { label: "MPG", color: "#6E45F0" };
        case "aep":
            return { label: "AEP", color: "#6E45F0" };
        case "fig":
            return { label: "FIG", color: "#6E45F0" };
        case "mp4":
            return { label: "MP4", color: "#6E45F0" };
        case "txt":
            return { label: "TXT", color: "#334155" };
        case "zip":
            return { label: "ZIP", color: "#334155" };
        case "rar":
            return { label: "RAR", color: "#334155" };
        case "c4d":
            return { label: "C4D", color: "#334155" };
        case "jpg":
            return { label: "JPG", color: "#3873FF" };
        case "png":
            return { label: "PNG", color: "#3873FF" };
        case "doc":
            return { label: "DOC", color: "#3873FF" };
        case "psd":
            return { label: "PSD", color: "#3873FF" };
        case "exe":
            return { label: "EXE", color: "#3873FF" };
        case "dmg":
            return { label: "DMG", color: "#3873FF" };
        case "gif":
            return { label: "GIF", color: "#3873FF" };
        case "webp":
            return { label: "WEBP", color: "#3873FF" };
        case "svg":
            return { label: "SVG", color: "#3873FF" };
        case "ico":
            return { label: "ICO", color: "#3873FF" };
        case "tiff":
            return { label: "TIFF", color: "#3873FF" };
        case "hwp":
            return { label: "HWP", color: "#3873FF" };
        default:
            return { label: "FILE", color: "#334155" };
    }
}

function getLabelWidth(label: string): number {
    if (label.length >= 6) return 86;
    if (label.length === 5) return 78;
    if (label.length === 4) return 70;
    return 62;
}

function getLabelFontSize(label: string): number {
    if (label.length >= 6) return 18;
    if (label.length === 5) return 21;
    return 26;
}

function FileIcon({ extension }: { extension: FileIconExtension | "file" }): React.ReactElement {
    const meta = getFileIconMeta(extension);
    const labelWidth = getLabelWidth(meta.label);
    const fontSize = getLabelFontSize(meta.label);

    return (
        <svg className="eca-student-assignment-file-svg" width="21" height="24" viewBox="0 0 100 115" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M25.7144 2.14258H63.3986L97.8573 36.6013V102.857C97.8573 107.985 93.7 112.143 88.5716 112.143H25.7144C20.586 112.143 16.4287 107.985 16.4287 102.857V11.4283C16.4287 6.29993 20.5861 2.14258 25.7144 2.14258Z" fill="white" stroke="#C8D2E1" strokeWidth="3" />
            <path d="M62.8574 2.85645V28.5707C62.8574 33.3046 66.695 37.1422 71.4288 37.1422H97.1431" stroke="#C8D2E1" strokeWidth="3" strokeLinecap="round" />
            <rect x="0" y="54.2861" width={labelWidth} height="45.7143" rx="5.71429" fill={meta.color} />
            <text x={labelWidth / 2} y="83.5" fill="white" fontSize={fontSize} fontWeight="900" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif">
                {meta.label}
            </text>
        </svg>
    );
}

export function getFileIconByExtension(extension: string): React.ReactElement {
    const normalizedExtension = normalizeFileIconExtension(extension);

    return <FileIcon extension={normalizedExtension} />;
}