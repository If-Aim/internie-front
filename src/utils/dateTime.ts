export const SERVER_TIME_ZONE = "Asia/Seoul";

export function getUserTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || SERVER_TIME_ZONE;
}

export function parseServerKstDateTime(value?: string | null): Date | null {
    if (!value) return null;

    const trimmed = value.trim();

    if (!trimmed) return null;

    const hasTimeZone = /([zZ]|[+-]\d{2}:\d{2})$/.test(trimmed);
    const date = new Date(hasTimeZone ? trimmed : `${trimmed}+09:00`);

    if (Number.isNaN(date.getTime())) return null;

    return date;
}

function getDatePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
    return parts.find((part) => part.type === type)?.value ?? "00";
}

export function formatDateTimePayloadInTimeZone(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);

    const year = getDatePart(parts, "year");
    const month = getDatePart(parts, "month");
    const day = getDatePart(parts, "day");
    const hour = getDatePart(parts, "hour");
    const minute = getDatePart(parts, "minute");
    const second = getDatePart(parts, "second");

    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

export function localDateTimeInputToServerKst(date: string, time: string): string {
    const localDate = new Date(`${date}T${time}:00`);

    if (Number.isNaN(localDate.getTime())) return "";

    return formatDateTimePayloadInTimeZone(localDate, SERVER_TIME_ZONE);
}

export function addMinutesToServerKstDateTime(value: string, amount: number): string {
    const date = parseServerKstDateTime(value);

    if (!date) return value;

    date.setMinutes(date.getMinutes() + amount);

    return formatDateTimePayloadInTimeZone(date, SERVER_TIME_ZONE);
}

export function formatServerKstDateTimeForUser(value?: string | null): string {
    const date = parseServerKstDateTime(value);

    if (!date) return "-";

    return new Intl.DateTimeFormat("en-US", {
        timeZone: getUserTimeZone(),
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

export type ServerKstDateTimeParts = {
    date: string;
    time: string;
    dateTime: string;
};

export function buildServerKstDateTime(date?: string | null, time?: string | null, fallbackTime: string = "00:00:00"): string | null {
    if (!date) return null;

    const safeTime = (time || fallbackTime).slice(0, 8);

    return `${date}T${safeTime}`;
}

export function parseServerKstDateAndTime(date?: string | null, time?: string | null, fallbackTime: string = "00:00:00"): Date | null {
    const dateTime = buildServerKstDateTime(date, time, fallbackTime);

    if (!dateTime) return null;

    return parseServerKstDateTime(dateTime);
}

export function splitDateTimePayload(value: string): { date: string; time: string } {
    const [date = "", rawTime = "00:00:00"] = value.split("T");
    const time = rawTime.slice(0, 8);

    return { date, time };
}

export function localDateTimeInputToServerKstParts(date: string, time: string): ServerKstDateTimeParts {
    const dateTime = localDateTimeInputToServerKst(date, time);
    const parts = splitDateTimePayload(dateTime);

    return {
        date: parts.date,
        time: parts.time,
        dateTime,
    };
}

export function serverKstDateAndTimeToUserDate(date?: string | null, time?: string | null, fallbackTime: string = "00:00:00"): Date | null {
    const parsed = parseServerKstDateAndTime(date, time, fallbackTime);

    if (!parsed) return null;

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: getUserTimeZone(),
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(parsed);

    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return null;
    }

    return new Date(year, month - 1, day);
}

export function serverKstDateAndTimeToUserTime(date?: string | null, time?: string | null, fallbackTime: string = "00:00:00"): string {
    const parsed = parseServerKstDateAndTime(date, time, fallbackTime);

    if (!parsed) return fallbackTime.slice(0, 5);

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: getUserTimeZone(),
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(parsed);

    const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

    return `${hour}:${minute}`;
}

export function formatServerKstDateAndTimeCompactForUser(date?: string | null, time?: string | null, fallbackTime: string = "00:00:00"): string {
    const parsed = parseServerKstDateAndTime(date, time, fallbackTime);

    if (!parsed) return "-";

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: getUserTimeZone(),
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(parsed);

    const year = parts.find((part) => part.type === "year")?.value ?? "0000";
    const month = parts.find((part) => part.type === "month")?.value ?? "00";
    const day = parts.find((part) => part.type === "day")?.value ?? "00";
    const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
    const minute = parts.find((part) => part.type === "minute")?.value ?? "00";

    return `${year}.${month}.${day} ${hour}:${minute}`;
}