export const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
	`${String(h).padStart(2, "0")}:00`
);

export const WEEK_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export const toApiHHmmss = (hhmm: string) => `${hhmm}:00`;

export function displayTimeLabel(hhmm: string, locale: string) {
	const [hh, mm] = hhmm.split(":").map(Number);
	const d = new Date(2000, 0, 1, hh, mm, 0);

	return new Intl.DateTimeFormat(locale, {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	}).format(d);
}

export function toYmd(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export function stripTime(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function getTimeIndex(t: string | null): number {
    return t ? TIME_OPTIONS.indexOf(t) : -1;
}

export function displayTimePillLabel(hhmm: string) {
    const [hh, mm] = hhmm.split(":").map(Number);
    const d = new Date(2000, 0, 1, hh, mm, 0);

    return new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(d);
}


export function isSameDay(a: Date, b: Date) {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function addMonths(d: Date, diff: number) {
	return new Date(d.getFullYear(), d.getMonth() + diff, 1);
}
export function daysInMonth(year: number, month: number) {
	return new Date(year, month + 1, 0).getDate();
}

export function getMonthGrid(base: Date) {
	const year = base.getFullYear();
	const month = base.getMonth();

	const first = new Date(year, month, 1);
	const jsDay = first.getDay();
	const offset = (jsDay + 6) % 7;

	const dim = daysInMonth(year, month);
	const totalCells = offset + dim;
	const rows = Math.ceil(totalCells / 7);
	const cellCount = rows * 7;

	const start = new Date(year, month, 1 - offset);

	const days = Array.from({ length: cellCount }, (_, i) => {
		const d = new Date(start);
		d.setDate(start.getDate() + i);
		return d;
	});

	return { year, month, days };
}