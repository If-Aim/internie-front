//src/pages/student/mobile/schedule/detailSchedule.tsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ApiError, getEventDayDetail, getEventDayQuestions, type Transcription, } from "../../../../api/client";

import "./schedule.css"

type Params = { eventDayId?: string };

type SlideItem = {
    idx: number;
    question: string;
    answerText: string;
};

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function formatRecordedAt(date: string, startTime?: string | null) {
    const [y, m, d] = date.split("-").map(Number);
    const hhmm = startTime ? startTime.slice(0, 5) : "00:00";
    return `${y}.${pad2(m)}.${pad2(d)} ${hhmm}`;
}
function applyExperienceName(q: string, title: string) {
    if (!q.includes("(@experience_name)")) return q;
    return q.replaceAll("(@experience_name)", title);
}

export default function DetailSchedule(): React.ReactElement {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { eventDayId } = useParams<Params>();

    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const [title, setTitle] = React.useState<string>(t("schedule_detail.titleFallback", "새로운 이벤트"));
    const [recordedAtText, setRecordedAtText] = React.useState<string>("2000.00.00 00:00");
    const [slides, setSlides] = React.useState<SlideItem[]>([]);

    const scrollerRef = React.useRef<HTMLDivElement | null>(null);
    const [page, setPage] = React.useState(0);
    const rafRef = React.useRef<number | null>(null);
    
    const onScroll = React.useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return;

        const firstPage = el.querySelector<HTMLElement>(".detail-page");
        if (!firstPage) return;

        const styles = window.getComputedStyle(el);
        const gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;

        const step = firstPage.offsetWidth + gap; 
        if (step <= 0) return;

        const raw = Math.round(el.scrollLeft / step);
        const max = Math.max(0, slides.length - 1);
        setPage(Math.min(max, Math.max(0, raw)));
    }, [slides.length]);

    React.useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);
    React.useEffect(() => {
        (async () => {
            try {
                if (!eventDayId) throw new Error("missing eventDayId");

                setLoading(true);
                setError(null);

                const [qRes, dRes] = await Promise.all([
                getEventDayQuestions(eventDayId),
                getEventDayDetail(eventDayId),
                ]);

                setTitle(dRes.title || t("schedule_detail.titleFallback", "새로운 이벤트"));

                setRecordedAtText(formatRecordedAt(dRes.date, dRes.startTime));

                const questions = (qRes.questionList ?? []).slice(0, 4);
                const trans: Transcription[] = Array.isArray(dRes.transcriptions) ? dRes.transcriptions : [];

                const merged: SlideItem[] = questions.map((q, i) => ({
                idx: i + 1,
                question: applyExperienceName(q, dRes.title),
                answerText: (trans[i]?.text ?? "").trim(),
                }));

                setSlides(merged);
            } catch (e: any) {
                if (e instanceof ApiError) {
                setError(`HTTP ${e.status}`);
                } else {
                setError(e?.message ?? "error");
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [eventDayId, t]);

    React.useEffect(() => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
    }, []);
    // 4개 중 답변 텍스트가 하나도 없으면 empty
    const hasAnyAnswer = React.useMemo(
        () => slides.some((s) => s.answerText.length > 0),
        [slides]
    );

    const close = () => navigate(-1);
    
    return (
        <div className="detail-screen">
            <div className="detail-topbar">
                <div className="detail-topbar-title">{title}</div>
                <button className="detail-topbar-close" type="button" aria-label={t("common.close")} onClick={close}>
                    <img className="icon" alt="" src="/x-01.svg" />
                </button>
            </div>

            <div className="detail-body">             
                <div
                    className={"detail-dots" + (!loading && !error && hasAnyAnswer ? "" : " detail-dots--placeholder")}
                    aria-hidden={!(!loading && !error && hasAnyAnswer)}
                >
                    {!loading && !error && hasAnyAnswer &&
                        slides.map((_, i) => (
                            <span key={i} className={"dot" + (i === page ? " active" : "")} />
                        ))}
                </div>
                <div ref={scrollerRef} className="detail-snap-scroller" onScroll={onScroll} >
                    {loading && (
                        <section className="detail-card detail-card--single">
                            <div className="detail-center muted">{t("common.loading", "Loading...")}</div>
                        </section>
                    )}

                    {!loading && error && (
                        <section className="detail-card detail-card--single">
                            <div className="detail-center muted">{t("common.error", "오류가 발생했어요")}</div>
                        </section>
                    )}

                    {!loading && !error && !hasAnyAnswer && (
                    <section className="detail-card detail-card--single">
                        <div className="detail-center">
                            <div className="detail-empty">{t("schedule_detail.empty", "기록이 없어요")}</div>
                        </div>
                    </section>
                    )}
                    {!loading && !error && hasAnyAnswer && (
                        slides.map((s) => (
                            <section key={s.idx} className="detail-page">
                                <div className="detail-card">
                                    <div className="qa-wrap">
                                        <div className="qa-q">
                                            <div className="qa-q-text">{s.question}</div>
                                        </div>
                                        <div className="qa-a">
                                            <div className="qa-a-text">
                                                {s.answerText.length > 0 ? s.answerText : t("schedule_detail.noAnswer", "답변이 없어요")}
                                            </div>
                                        </div>

                                        <div className="detail-footer">
                                            <div className="detail-recordedAt">
                                                {i18n.language.startsWith("ko")
                                                ? `${recordedAtText} 기록됨`
                                                : `${recordedAtText} recorded`}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}