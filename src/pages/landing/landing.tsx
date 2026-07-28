import React, { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ApiError, createInquiry } from "../../api/client";
import SeoMeta from "../../utils/SeoMetadata";

import "./landing.css";

type LandingFooterLink = {
    label: string;
    path: string | null;
    sectionId: string | null;
};

type InquiryFormState = {
    companyName: string;
    contactName: string;
    firstName: string;
    lastName: string;
    position: string;
    companyEmail: string;
    phone: string;
    question: string;
};

type DiagnosisVisualType = "mission" | "report" | "collaboration" | "compare";

type DiagnosisItem = {
    id: string;
    labelKey: string;
    visual: DiagnosisVisualType;
};

type MissionExample = {
    id: string;
    className: string;
};

const EMPTY_INQUIRY_FORM: InquiryFormState = {
    companyName: "",
    contactName: "",
    firstName: "",
    lastName: "",
    position: "",
    companyEmail: "",
    phone: "",
    question: ""
};

const DIAGNOSIS_ITEMS: DiagnosisItem[] = [
    {
        id: "portfolio",
        labelKey: "landing.diagnosis.items.portfolio",
        visual: "report"
    },
    {
        id: "interviewGap",
        labelKey: "landing.diagnosis.items.interviewGap",
        visual: "collaboration"
    },
    {
        id: "smallTeam",
        labelKey: "landing.diagnosis.items.smallTeam",
        visual: "compare"
    },
    {
        id: "lowApplicants",
        labelKey: "landing.diagnosis.items.lowApplicants",
        visual: "mission"
    },
    {
        id: "companyIntro",
        labelKey: "landing.diagnosis.items.companyIntro",
        visual: "mission"
    },
    {
        id: "internEvaluation",
        labelKey: "landing.diagnosis.items.internEvaluation",
        visual: "report"
    },
    {
        id: "youthHiringDeadline",
        labelKey: "landing.diagnosis.items.youthHiringDeadline",
        visual: "mission"
    }
];

const WORKFLOW_STEPS = [
    {
        number: "1",
        kind: "onboarding",
        titleKey: "landing.workflow.steps.onboarding.title",
        descriptionKey: "landing.workflow.steps.onboarding.description"
    },
    {
        number: "2",
        kind: "design",
        titleKey: "landing.workflow.steps.design.title",
        descriptionKey: "landing.workflow.steps.design.description"
    },
    {
        number: "3",
        kind: "progress",
        titleKey: "landing.workflow.steps.progress.title",
        descriptionKey: "landing.workflow.steps.progress.description"
    },
    {
        number: "4",
        kind: "hire",
        titleKey: "landing.workflow.steps.hire.title",
        descriptionKey: "landing.workflow.steps.hire.description"
    }
];

const MISSION_EXAMPLES: MissionExample[] = [
    {
        id: "influencer",
        className: "is-card-a"
    },
    {
        id: "reels",
        className: "is-card-b"
    },
    {
        id: "onboarding",
        className: "is-card-c"
    },
    {
        id: "cx",
        className: "is-card-d"
    }
];

type InquiryFormProps = {
    form: InquiryFormState;
    privacyAgreed: boolean;
    submitting: boolean;
    onFieldChange: (field: keyof InquiryFormState, value: string) => void;
    onPrivacyChange: (checked: boolean) => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

function InquiryForm({
    form,
    privacyAgreed,
    submitting,
    onFieldChange,
    onPrivacyChange,
    onSubmit
}: InquiryFormProps): React.ReactElement {
    const { t, i18n } = useTranslation();
    const isEnglish = i18n.resolvedLanguage?.startsWith("en") ?? false;

    return (
        <form className="internie-landing-inquiry-form" onSubmit={onSubmit}>
            {isEnglish ? (
                <>
                    <div className="internie-landing-inquiry-row">
                        <label>
                            <span>{t("landing.inquiry.fields.firstName")}<em>*</em></span>
                            <input type="text" name="firstName" value={form.firstName} maxLength={50} autoComplete="given-name" required onChange={(event) => onFieldChange("firstName", event.target.value)} />
                        </label>
                        <label>
                            <span>{t("landing.inquiry.fields.lastName")}<em>*</em></span>
                            <input type="text" name="lastName" value={form.lastName} maxLength={50} autoComplete="family-name" required onChange={(event) => onFieldChange("lastName", event.target.value)} />
                        </label>
                    </div>
                    <label>
                        <span>{t("landing.inquiry.fields.workEmail")}<em>*</em></span>
                        <input type="email" name="companyEmail" value={form.companyEmail} maxLength={255} placeholder="example@company.com" autoComplete="email" required onChange={(event) => onFieldChange("companyEmail", event.target.value)} />
                    </label>
                    <label>
                        <span>{t("landing.inquiry.fields.phone")}<em>*</em></span>
                        <input type="tel" name="phone" value={form.phone} maxLength={30} pattern="[0-9+()\s-]{7,30}" inputMode="tel" placeholder="+1 555 000 0000" autoComplete="tel" required onChange={(event) => onFieldChange("phone", event.target.value)} />
                    </label>
                    <label>
                        <span>{t("landing.inquiry.fields.companyName")}<em>*</em></span>
                        <input type="text" name="companyName" value={form.companyName} maxLength={50} autoComplete="organization" required onChange={(event) => onFieldChange("companyName", event.target.value)} />
                    </label>
                </>
            ) : (
                <>
                    <div className="internie-landing-inquiry-row">
                        <label>
                            <span>{t("landing.inquiry.fields.companyName")}<em>*</em></span>
                            <input type="text" name="companyName" value={form.companyName} maxLength={50} placeholder={t("landing.inquiry.fields.companyNamePlaceholder")} autoComplete="organization" required onChange={(event) => onFieldChange("companyName", event.target.value)} />
                        </label>
                        <label>
                            <span>{t("landing.inquiry.fields.contactName")}<em>*</em></span>
                            <input type="text" name="contactName" value={form.contactName} maxLength={100} placeholder={t("landing.inquiry.fields.contactNamePlaceholder")} autoComplete="name" required onChange={(event) => onFieldChange("contactName", event.target.value)} />
                        </label>
                    </div>
                    <label>
                        <span>{t("landing.inquiry.fields.position")}<em>*</em></span>
                        <input type="text" name="position" value={form.position} maxLength={50} placeholder={t("landing.inquiry.fields.positionPlaceholder")} autoComplete="organization-title" required onChange={(event) => onFieldChange("position", event.target.value)} />
                    </label>
                    <label>
                        <span>{t("landing.inquiry.fields.workEmail")}<em>*</em></span>
                        <input type="email" name="companyEmail" value={form.companyEmail} maxLength={255} placeholder="example@company.com" autoComplete="email" required onChange={(event) => onFieldChange("companyEmail", event.target.value)} />
                    </label>
                    <label>
                        <span>{t("landing.inquiry.fields.phone")}<em>*</em></span>
                        <input type="tel" name="phone" value={form.phone} maxLength={30} pattern="[0-9-]+" inputMode="tel" placeholder="010-0000-0000" autoComplete="tel" required onChange={(event) => onFieldChange("phone", event.target.value)} />
                    </label>
                </>
            )}
            <label>
                <span>{t("landing.inquiry.fields.question")}</span>
                <textarea name="question" value={form.question} maxLength={2000} rows={4} onChange={(event) => onFieldChange("question", event.target.value)} />
            </label>
            <label className="internie-landing-inquiry-agree">
                <input type="checkbox" checked={privacyAgreed} required onChange={(event) => onPrivacyChange(event.target.checked)} />
                <span>{t("landing.inquiry.privacyAgreement")}</span>
            </label>
            <button type="submit" className="internie-landing-inquiry-submit" disabled={submitting}>
                {submitting ? t("landing.inquiry.submitting") : t("landing.inquiry.submit")}
            </button>
        </form>
    );
}

function FaqArrow(): React.ReactElement {
    return (
        <svg className="internie-landing-faq-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <path d="M44 26L32 38L20 26" stroke="#808080" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function LandingFooter({ onLinkClick }: { onLinkClick: (link: LandingFooterLink) => void }): React.ReactElement {
    const { t, i18n } = useTranslation();
    const isEnglish = i18n.resolvedLanguage?.startsWith("en") ?? false;
    const footerLinks: LandingFooterLink[] = [
        { label: t("landing.footer.links.home"), path: null, sectionId: "internie-landing-top" },
        { label: t("landing.footer.links.product"), path: null, sectionId: null },
        { label: t("landing.footer.links.about"), path: null, sectionId: null },
        { label: t("landing.footer.links.faq"), path: null, sectionId: "internie-landing-faq" }
    ];

    return (
        <footer className="internie-landing-footer">
            <div className="internie-landing-footer-inner">
                <div className="internie-landing-footer-brand">
                    <div className="internie-landing-footer-logo">
                        <strong>internie</strong>
                    </div>
                    <p>{t("landing.footer.taglineLine1")}<br />{t("landing.footer.taglineLine2")}</p>
                    <div className="internie-landing-footer-company">
                        <span>{t("landing.footer.companyName")}</span>
                        <span>purieu.k@gmail.com</span>
                    </div>
                </div>
                <div className="internie-landing-footer-column">
                    <strong>{t("landing.footer.linksTitle")}</strong>
                    <nav className="internie-landing-footer-links" aria-label={t("landing.footer.navAria")}>
                        {footerLinks.map((link) => {
                            const pending = !link.path && !link.sectionId;
                            return (
                                <button key={link.label} type="button" aria-disabled={pending} onClick={() => !pending && onLinkClick(link)}>
                                    {link.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>
                <div className="internie-landing-footer-column internie-landing-footer-contact">
                    <strong>{isEnglish ? t("landing.footer.companyInfoTitle") : t("landing.footer.contactTitle")}</strong>
                    <div>
                        <p>{isEnglish ? t("landing.footer.companyName") : t("landing.footer.representative")}</p>
                        <span>{isEnglish ? "purieu.k@gmail.com" : "aim2a.kor@gmail.com"}</span>
                    </div>
                </div>
            </div>
            <div className="internie-landing-footer-copyright">
                <span>© 2026 aim. All rights reserved.</span>
            </div>
            <div className="internie-landing-footer-margin" />
        </footer>
    );
}

function HeroResumeCard({ className = "", label }: { className?: string; label: string }): React.ReactElement {
    return (
        <article className={`internie-hero-resume-card ${className}`} aria-hidden="true">
            <span className="internie-hero-card-label">{label}</span>
            <span className="internie-hero-line is-strong" />
            <span className="internie-hero-line is-medium" />
            <span className="internie-hero-line" />
            <span className="internie-hero-line is-short" />
            <span className="internie-hero-line is-mid" />
            <div className="internie-hero-chip-row">
                <span />
                <span />
            </div>
        </article>
    );
}

function HeroMissionCard(): React.ReactElement {
    const { t } = useTranslation();

    return (
        <article className="internie-hero-mission-card" aria-hidden="true">
            <strong>{t("landing.hero.desktop.cards.missionTitle")}</strong>
            <div className="internie-hero-mission-progress"><span><i /></span><b>{t("landing.hero.desktop.cards.missionPercent")}</b></div>
            <div className="internie-hero-mission-tags"><span>{t("landing.hero.desktop.cards.missionTag1")}</span><span>{t("landing.hero.desktop.cards.missionTag2")}</span><span>{t("landing.hero.desktop.cards.missionTag3")}</span></div>
            <p>{t("landing.hero.desktop.cards.missionDescription")}</p>
        </article>
    );
}

function DiagnosisVisual({ variant }: { variant: DiagnosisVisualType }): React.ReactElement {
    const { t } = useTranslation();

    if (variant === "report") {
        return (
            <div className="internie-dx-visual is-report" aria-live="polite">
                <div className="internie-report-window">
                    <div className="internie-report-head">
                        <span>{t("landing.visual.report.avatar")}</span>
                        <div><strong>{t("landing.visual.report.title")}</strong><small>{t("landing.visual.report.subtitle")}</small></div>
                        <b>87<small>{t("landing.visual.report.scoreLabel")}</small></b>
                    </div>
                    <div className="internie-report-grid">
                        <section className="internie-report-files">
                            <strong>{t("landing.visual.report.filesTitle")}</strong>
                            <p><span>D</span><b>{t("landing.visual.report.files.file1.title")}</b><small>{t("landing.visual.report.files.file1.meta")}</small><em>{t("landing.visual.report.open")}</em></p>
                            <p><span>F</span><b>{t("landing.visual.report.files.file2.title")}</b><small>{t("landing.visual.report.files.file2.meta")}</small><em>{t("landing.visual.report.open")}</em></p>
                            <mark>{t("landing.visual.report.resultTag")}</mark>
                        </section>
                        <section className="internie-report-process">
                            <strong>{t("landing.visual.report.processTitle")}</strong>
                            <ol>
                                <li><span>{t("landing.visual.report.process.day1")}</span>{t("landing.visual.report.process.event1")}</li>
                                <li><span>{t("landing.visual.report.process.day2")}</span>{t("landing.visual.report.process.event2")}</li>
                                <li><span>{t("landing.visual.report.process.day3")}</span>{t("landing.visual.report.process.event3")}</li>
                            </ol>
                            <strong className="internie-report-score-title">{t("landing.visual.report.scoreTitle")}</strong>
                            <div className="internie-score-bars">
                                <p><span>{t("landing.visual.report.scores.problem")}</span><b style={{ width: "90%" }} /></p>
                                <p><span>{t("landing.visual.report.scores.execution")}</span><b style={{ width: "85%" }} /></p>
                                <p><span>{t("landing.visual.report.scores.communication")}</span><b style={{ width: "88%" }} /></p>
                            </div>
                        </section>
                    </div>
                </div>
                <OverlayCard badge={t("landing.visual.report.overlay.badge")} title={t("landing.visual.report.overlay.title")} body={t("landing.visual.report.overlay.body")} />
            </div>
        );
    }

    if (variant === "collaboration") {
        return (
            <div className="internie-dx-visual is-collaboration" aria-live="polite">
                <div className="internie-chat-window">
                    <aside>
                        <strong>{t("landing.visual.collaboration.workspace")}</strong>
                        <span>{t("landing.visual.collaboration.teamChannel")}</span>
                        <b>{t("landing.visual.collaboration.channels.notice")}</b>
                        <b className="is-selected">{t("landing.visual.collaboration.channels.meeting")}</b>
                        <b>{t("landing.visual.collaboration.channels.teamNotice")}</b>
                        <span>{t("landing.visual.collaboration.personal")}</span>
                        <b>{t("landing.visual.collaboration.directMessage")}</b>
                    </aside>
                    <section className="internie-chat-main">
                        <header><strong>{t("landing.visual.collaboration.header")}</strong><span>{t("landing.visual.collaboration.deadline")}</span></header>
                        <article className="internie-chat-message is-student-a">
                            <i>A</i>
                            <div className="internie-chat-message-content">
                                <p className="internie-chat-message-meta"><b>{t("landing.visual.collaboration.messages.studentA")}</b><small>{t("landing.visual.collaboration.messages.timeA")}</small></p>
                                <p className="internie-chat-message-body">{t("landing.visual.collaboration.messages.bodyA")} <span aria-hidden="true">🙌</span></p>
                                <div className="internie-chat-file-card">
                                    <div className="internie-chat-file-main"><span aria-hidden="true">📄</span><p><b>{t("landing.visual.collaboration.messages.fileTitle")}</b><small>{t("landing.visual.collaboration.messages.fileMeta")}</small></p></div>
                                    <div className="internie-chat-reactions"><span>❤️ 2</span><span>👍 1</span><em>💬 3개의 댓글</em></div>
                                </div>
                            </div>
                        </article>
                        <article className="internie-chat-message is-student-b">
                            <i>B</i>
                            <div className="internie-chat-message-content">
                                <p className="internie-chat-message-meta"><b>{t("landing.visual.collaboration.messages.studentB")}</b><small>{t("landing.visual.collaboration.messages.timeB")}</small></p>
                                <p className="internie-chat-message-body">{t("landing.visual.collaboration.messages.bodyB")}</p>
                            </div>
                        </article>
                        <footer>{t("landing.visual.collaboration.dataNote")}</footer>
                    </section>
                </div>
                <OverlayCard badge={t("landing.visual.collaboration.overlay.badge")} title={t("landing.visual.collaboration.overlay.title")} body={t("landing.visual.collaboration.overlay.body")} />
            </div>
        );
    }

    if (variant === "compare") {
        return (
            <div className="internie-dx-visual is-compare" aria-live="polite">
                <div className="internie-compare-window">
                    <header><strong>{t("landing.visual.compare.title")}</strong><span>{t("landing.visual.compare.subtitle")}</span></header>
                    <nav><b>{t("landing.visual.compare.sort.score")}</b><span>{t("landing.visual.compare.sort.quality")}</span><span>{t("landing.visual.compare.sort.period")}</span></nav>
                    <table>
                        <thead><tr><th>{t("landing.visual.compare.headers.candidate")}</th><th>{t("landing.visual.compare.headers.total")}</th><th>{t("landing.visual.compare.headers.strength")}</th><th>{t("landing.visual.compare.headers.evidence")}</th></tr></thead>
                        <tbody>
                            <tr><td><span>{t("landing.visual.compare.rows.row1.avatar")}</span><b>{t("landing.visual.compare.rows.row1.name")}</b><small>{t("landing.visual.compare.rows.row1.meta")}</small></td><td>87</td><td><em>{t("landing.visual.compare.rows.row1.tag1")}</em><em>{t("landing.visual.compare.rows.row1.tag2")}</em></td><td><button type="button">{t("landing.visual.compare.viewEvidence")}</button></td></tr>
                            <tr><td><span>{t("landing.visual.compare.rows.row2.avatar")}</span><b>{t("landing.visual.compare.rows.row2.name")}</b><small>{t("landing.visual.compare.rows.row2.meta")}</small></td><td>81</td><td><em>{t("landing.visual.compare.rows.row2.tag1")}</em><em>{t("landing.visual.compare.rows.row2.tag2")}</em></td><td><button type="button">{t("landing.visual.compare.viewEvidence")}</button></td></tr>
                            <tr><td><span>{t("landing.visual.compare.rows.row3.avatar")}</span><b>{t("landing.visual.compare.rows.row3.name")}</b><small>{t("landing.visual.compare.rows.row3.meta")}</small></td><td>74</td><td><em>{t("landing.visual.compare.rows.row3.tag1")}</em><em>{t("landing.visual.compare.rows.row3.tag2")}</em></td><td><button type="button">{t("landing.visual.compare.viewEvidence")}</button></td></tr>
                        </tbody>
                    </table>
                    <p className="internie-compare-note">
                        <svg className="internie-compare-note-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
                            <path d="M7.88183 1.9707L12.4785 4.59737V7.88071C12.4785 10.8357 10.5085 12.8057 7.88183 13.7907C5.25516 12.8057 3.28516 10.8357 3.28516 7.88071V4.59737L7.88183 1.9707Z" stroke="black" strokeWidth="1.33333" strokeLinejoin="round" />
                        </svg>
                        <span>{t("landing.visual.compare.note")}</span>
                    </p>
                </div>
                <OverlayCard badge={t("landing.visual.compare.overlay.badge")} title={t("landing.visual.compare.overlay.title")} body={t("landing.visual.compare.overlay.body")} />
            </div>
        );
    }

    return (
        <div className="internie-dx-visual is-mission" aria-live="polite">
            <MissionBoard />
            <OverlayCard badge={t("landing.visual.mission.overlay.badge")} title={t("landing.visual.mission.overlay.title")} body={t("landing.visual.mission.overlay.body")} />
        </div>
    );
}

function OverlayCard({ badge, title, body }: { badge: string; title: string; body: string }): React.ReactElement {
    const { t } = useTranslation();

    return (
        <article className="internie-dx-overlay-card">
            <span>{badge}</span>
            <h3>{title}</h3>
            <p>{body}</p>
            <div><small>{t("landing.visual.overlayTags.hiring")}</small><small>{t("landing.visual.overlayTags.candidate")}</small><small>{t("landing.visual.overlayTags.skill")}</small></div>
        </article>
    );
}

function MissionBoard(): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="internie-mission-board" aria-hidden="true">
            <section>
                <h3>{t("landing.visual.mission.board.title")}</h3>
                <nav><b>{t("landing.visual.mission.board.filters.all")}</b><span>{t("landing.visual.mission.board.filters.marketing")}</span><span>{t("landing.visual.mission.board.filters.commerce")}</span><span>{t("landing.visual.mission.board.filters.content")}</span><span>{t("landing.visual.mission.board.filters.cx")}</span></nav>
                <div className="internie-mission-mini-grid">
                    <MiniMissionCard itemKey="commerce" />
                    <MiniMissionCard itemKey="marketing" />
                    <MiniMissionCard itemKey="cx" />
                </div>
                <footer>
                    <svg className="internie-mission-discover-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
                        <path d="M7.33464 11.9993C9.91196 11.9993 12.0013 9.91001 12.0013 7.33268C12.0013 4.75535 9.91196 2.66602 7.33464 2.66602C4.75731 2.66602 2.66797 4.75535 2.66797 7.33268C2.66797 9.91001 4.75731 11.9993 7.33464 11.9993Z" stroke="black" strokeWidth="1.33333" />
                        <path d="M13.3333 13.3333L11 11" stroke="black" strokeWidth="1.33333" strokeLinecap="round" />
                    </svg>
                </footer>
            </section>
        </div>
    );
}

function MiniMissionCard({ itemKey }: { itemKey: string }): React.ReactElement {
    const { t } = useTranslation();

    return (
        <article>
            <span>{t(`landing.visual.mission.board.cards.${itemKey}.category`)}</span>
            <strong>{t(`landing.visual.mission.board.cards.${itemKey}.title`)}</strong>
            <small>{t(`landing.visual.mission.board.cards.${itemKey}.company`)}</small>
            <p>{t("landing.visual.mission.board.cardDescription")}</p>
            <div><b>{t(`landing.visual.mission.board.cards.${itemKey}.period`)}</b><b><Trans i18nKey={`landing.visual.mission.board.cards.${itemKey}.level`} components={{ strong: <strong /> }} /></b></div>
        </article>
    );
}

function StepIllustration({ kind }: { kind: string }): React.ReactElement {
    return (
        <div className={`internie-workflow-step-visual is-${kind}`} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
        </div>
    );
}

function MissionExampleCard({ example, onInquiryOpen }: { example: MissionExample; onInquiryOpen: () => void }): React.ReactElement {
    const { t } = useTranslation();
    const tags = [0, 1, 2].map((index) => t(`landing.missionExamples.items.${example.id}.tags.${index}`));
    const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onInquiryOpen();
    };

    return (
        <article className={`internie-mission-example-card ${example.className}`} role="button" tabIndex={0} aria-label={`${t(`landing.missionExamples.items.${example.id}.title`)} ${t("landing.missionExamples.hoverTitle")}`} onClick={onInquiryOpen} onKeyDown={handleKeyDown}>
            <span>{t(`landing.missionExamples.items.${example.id}.category`)}</span>
            <h3>{t(`landing.missionExamples.items.${example.id}.title`)}</h3>
            <p>{t(`landing.missionExamples.items.${example.id}.description`)}</p>
            <div>{tags.map((tag) => <small key={tag}>{tag}</small>)}</div>
            <div className="internie-mission-card-hover" aria-hidden="true">
                <strong>{t("landing.missionExamples.hoverTitle")}</strong>
                <i />
            </div>
        </article>
    );
}
type LandingProps = {
    canonical: string;
};

export default function Landing({ canonical }: LandingProps): React.ReactElement {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const isEnglish = i18n.resolvedLanguage?.startsWith("en") ?? false;
    const landingRef = useRef<HTMLDivElement | null>(null);
    const finalCtaButtonRef = useRef<HTMLDivElement | null>(null);
    const inquiryPopoverRef = useRef<HTMLDivElement | null>(null);
    const floatingButtonRef = useRef<HTMLButtonElement | null>(null);
    const inquiryReturnScrollRef = useRef(0);
    const [selectedDiagnosisId, setSelectedDiagnosisId] = useState(DIAGNOSIS_ITEMS[0].id);
    const [openFaqIndexes, setOpenFaqIndexes] = useState<Set<number>>(() => new Set());
    const [inquiryOpen, setInquiryOpen] = useState(false);
    const [inquiryForm, setInquiryForm] = useState<InquiryFormState>(EMPTY_INQUIRY_FORM);
    const [privacyAgreed, setPrivacyAgreed] = useState(false);
    const [inquirySubmitting, setInquirySubmitting] = useState(false);
    const [inquirySubmitted, setInquirySubmitted] = useState(false);
    const [inquiryDocked, setInquiryDocked] = useState(false);
    const [inquiryDockPosition, setInquiryDockPosition] = useState({ top: 0, left: 0 });
    const activeDiagnosis = DIAGNOSIS_ITEMS.find((item) => item.id === selectedDiagnosisId) ?? DIAGNOSIS_ITEMS[0];
    const faqItems = ["item1", "item2", "item3", "item4", "item5"].map((key) => ({
        question: t(`landing.faq.items.${key}.question`),
        answer: t(`landing.faq.items.${key}.answer`)
    }));

    const isMobileViewport = () => window.matchMedia("(max-width: 768px)").matches;

    const handleInquiryOpen = () => {
        const scrollRoot = document.getElementById("root");
        setInquirySubmitted(false);
        if (isMobileViewport()) {
            inquiryReturnScrollRef.current = scrollRoot?.scrollTop ?? window.scrollY;
        }
        setInquiryOpen(true);
        requestAnimationFrame(() => {
            if (!isMobileViewport()) return;
            scrollRoot?.scrollTo({ top: 0, behavior: "auto" });
            window.scrollTo({ top: 0, behavior: "auto" });
        });
    };

    const handleInquiryClose = () => {
        const restoreMobileScroll = isMobileViewport();
        setInquiryOpen(false);
        setInquirySubmitted(false);
        requestAnimationFrame(() => {
            if (!restoreMobileScroll) return;
            const scrollRoot = document.getElementById("root");
            scrollRoot?.scrollTo({ top: inquiryReturnScrollRef.current, behavior: "auto" });
            window.scrollTo({ top: inquiryReturnScrollRef.current, behavior: "auto" });
        });
    };

    const handleLogoClick = () => {
        document.getElementById("root")?.scrollTo({ top: 0, behavior: "smooth" });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const updateInquiryField = (field: keyof InquiryFormState, value: string) => {
        setInquiryForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleInquirySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (inquirySubmitting) return;
        const firstName = inquiryForm.firstName.trim();
        const lastName = inquiryForm.lastName.trim();
        const payload = {
            companyName: inquiryForm.companyName.trim(),
            contactName: isEnglish ? `${firstName} ${lastName}`.trim() : inquiryForm.contactName.trim(),
            position: isEnglish ? null : inquiryForm.position.trim(),
            companyEmail: inquiryForm.companyEmail.trim(),
            phone: inquiryForm.phone.trim(),
            question: inquiryForm.question.trim() || null
        };
        const hasMissingRequiredField = isEnglish ? !firstName || !lastName || !payload.companyName || !payload.companyEmail || !payload.phone : !payload.companyName || !payload.contactName || !payload.position || !payload.companyEmail || !payload.phone;
        if (hasMissingRequiredField) {
            window.alert(t("landing.inquiry.errors.required"));
            return;
        }
        const phonePattern = isEnglish ? /^[0-9+()\s-]{7,30}$/ : /^[0-9-]+$/;
        if (!phonePattern.test(payload.phone)) {
            window.alert(t("landing.inquiry.errors.phone"));
            return;
        }
        if (!privacyAgreed) {
            window.alert(t("landing.inquiry.errors.privacy"));
            return;
        }
        setInquirySubmitting(true);
        try {
            await createInquiry(payload);
            setInquiryForm(EMPTY_INQUIRY_FORM);
            setPrivacyAgreed(false);
            if (isMobileViewport()) {
                setInquirySubmitted(true);
                return;
            }
            window.alert(t("landing.inquiry.errors.success"));
            handleInquiryClose();
        } catch (error) {
            const message = !isEnglish && error instanceof ApiError ? error.message : t("landing.inquiry.errors.submitFailed");
            window.alert(message);
        } finally {
            setInquirySubmitting(false);
        }
    };

    const handleFaqToggle = (index: number) => {
        setOpenFaqIndexes((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const handleFooterLinkClick = (link: LandingFooterLink) => {
        if (link.path) {
            navigate(link.path);
            return;
        }
        if (link.sectionId) {
            document.getElementById(link.sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    useEffect(() => {
        const elements = document.querySelectorAll<HTMLElement>(".internie-landing-reveal, .internie-landing-sequence, .internie-mission-scroll");
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                entry.target.classList.toggle("is-visible", entry.isIntersecting);
            });
        }, { threshold: 0.15, rootMargin: "-60px 0px -80px 0px" });
        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const scrollRoot = document.getElementById("root");
        let frameId = 0;
        const updateInquiryPosition = () => {
            cancelAnimationFrame(frameId);
            frameId = requestAnimationFrame(() => {
                const landing = landingRef.current;
                const slot = finalCtaButtonRef.current;
                const button = floatingButtonRef.current;
                if (!landing || !slot || !button) return;
                const landingRect = landing.getBoundingClientRect();
                const slotRect = slot.getBoundingClientRect();
                const buttonHeight = button.offsetHeight;
                const isMobile = isMobileViewport();
                const floatingBottom = isMobile ? 32 : 50;
                const floatingButtonTop = window.innerHeight - floatingBottom - buttonHeight;
                const shouldDock = slotRect.top <= floatingButtonTop;
                setInquiryDocked((prev) => prev === shouldDock ? prev : shouldDock);
                if (!shouldDock) return;
                const nextTop = slotRect.top - landingRect.top + (slotRect.height - button.offsetHeight) / 2;
                const nextLeft = isMobile
                    ? slotRect.left - landingRect.left + slotRect.width / 2
                    : slotRect.left - landingRect.left;
                setInquiryDockPosition((prev) => {
                    if (Math.abs(prev.top - nextTop) < 0.5 && Math.abs(prev.left - nextLeft) < 0.5) {
                        return prev;
                    }
                    return { top: nextTop, left: nextLeft };
                });
            });
        };
        const resizeObserver = new ResizeObserver(updateInquiryPosition);
        if (landingRef.current) {
            resizeObserver.observe(landingRef.current);
        }
        if (finalCtaButtonRef.current) {
            resizeObserver.observe(finalCtaButtonRef.current);
        }
        updateInquiryPosition();
        scrollRoot?.addEventListener("scroll", updateInquiryPosition, { passive: true });
        window.addEventListener("scroll", updateInquiryPosition, { passive: true });
        window.addEventListener("resize", updateInquiryPosition);
        return () => {
            cancelAnimationFrame(frameId);
            resizeObserver.disconnect();
            scrollRoot?.removeEventListener("scroll", updateInquiryPosition);
            window.removeEventListener("scroll", updateInquiryPosition);
            window.removeEventListener("resize", updateInquiryPosition);
        };
    }, []);

    useEffect(() => {
        if (!inquiryOpen || isMobileViewport()) return;
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (inquiryPopoverRef.current?.contains(target)) return;
            setInquiryOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setInquiryOpen(false);
            }
        };
        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [inquiryOpen]);

    return (
        <>
            <SeoMeta title={t("landing.seo.title")} description={t("landing.seo.description")} lang={isEnglish ? "en" : "ko"} canonical={canonical} />
            <div ref={landingRef} className={`internie-landing ${isEnglish ? "is-en" : "is-ko"}${inquiryOpen ? " is-inquiry-open" : ""}`}>
                <div className={`internie-landing-default-view${inquiryOpen ? " is-inquiry-open" : ""}`}>
                    <header className="internie-landing-header">
                        <button type="button" className="internie-landing-logo" onClick={handleLogoClick}>internie</button>
                        <button type="button" className="internie-landing-login" onClick={() => navigate("/login")}>{t("landing.header.login")}</button>
                    </header>
                    <main>
                        <section id="internie-landing-top" className="internie-landing-hero">
                            <div className="internie-landing-hero-inner">
                                <div className="internie-landing-hero-copy">
                                    <h1>{t("landing.hero.desktop.titleLine1")}<br />{t("landing.hero.desktop.titleLine2")}</h1>
                                    <p>{t("landing.hero.desktop.pretitleLine1")}<br />{t("landing.hero.desktop.pretitleLine2")}</p>
                                    <button type="button" onClick={handleInquiryOpen}>{t("landing.hero.desktop.cta")}</button>
                                </div>
                                <div className="internie-landing-hero-visual" aria-hidden="true">
                                    <HeroResumeCard className="is-main" label={t("landing.hero.desktop.cards.resume")} />
                                    <HeroResumeCard className="is-top" label={t("landing.hero.desktop.cards.application")} />
                                    <HeroMissionCard />
                                </div>
                            </div>
                        </section>
                        <section className="internie-landing-section internie-landing-diagnosis-section">
                            <div className="internie-landing-section-heading">
                                <span>{t("landing.diagnosis.eyebrow")}</span>
                                <h2>{t("landing.diagnosis.title")}</h2>
                            </div>
                            <div className="internie-dx-layout">
                                <div className="internie-dx-visual-shell">
                                    <div className="internie-dx-visual-scale">
                                        <DiagnosisVisual key={activeDiagnosis.id} variant={activeDiagnosis.visual} />
                                    </div>
                                </div>
                                <fieldset className="internie-dx-options">
                                    <legend className="sr-only">{t("landing.diagnosis.legend")}</legend>
                                    {DIAGNOSIS_ITEMS.map((item) => {
                                        const checked = item.id === selectedDiagnosisId;
                                        return (
                                            <label key={item.id} className={`internie-dx-option${checked ? " is-active" : ""}`}>
                                                <input type="radio" name="internieDiagnosis" checked={checked} onChange={() => setSelectedDiagnosisId(item.id)} />
                                                <span aria-hidden="true" />
                                                <b>{t(item.labelKey)}</b>
                                            </label>
                                        );
                                    })}
                                </fieldset>
                            </div>
                        </section>
                        <section className="internie-landing-section internie-landing-solution-section" aria-label={t("landing.solution.ariaLabel")}>
                            <div className="internie-landing-section-heading">
                                <span>{t("landing.solution.eyebrow")}</span>
                                <h2>{t("landing.solution.title")}</h2>
                            </div>
                            <div className="internie-solution-animation internie-landing-reveal">
                                <iframe
                                    src="/landing/internie-mission-animation.html"
                                    title={t("landing.solution.frameTitle")}
                                    loading="eager"
                                />
                            </div>
                        </section>
                        <section className="internie-landing-section internie-landing-workflow-section">
                            <div className="internie-workflow-panel internie-landing-sequence">
                                <div className="internie-landing-section-heading">
                                    <span>{t("landing.workflow.eyebrow")}</span>
                                    <h2>{t("landing.workflow.titleLine1")}<br />{t("landing.workflow.titleLine2")}</h2>
                                </div>
                                <div className="internie-workflow-steps">
                                    {WORKFLOW_STEPS.map((step) => (
                                        <article key={step.number} className="internie-workflow-step">
                                            <StepIllustration kind={step.kind} />
                                            <div className="internie-workflow-copy">
                                                <h3><span>{step.number}</span>{t(step.titleKey)}</h3>
                                                <p><Trans i18nKey={step.descriptionKey} components={{ strong: <strong /> }} /></p>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        </section>
                        <section className="internie-landing-section internie-landing-missions-section">
                            <div className="internie-landing-section-heading">
                                <span>{t("landing.missionExamples.eyebrow")}</span>
                                <h2>{t("landing.missionExamples.title")}</h2>
                            </div>
                            <div className="internie-mission-scroll">
                                <div className="internie-mission-stack">
                                    {MISSION_EXAMPLES.map((example) => <MissionExampleCard key={example.id} example={example} onInquiryOpen={handleInquiryOpen} />)}
                                </div>
                            </div>
                        </section>
                        <section id="internie-landing-faq" className="internie-landing-faq">
                            <div className="internie-landing-faq-inner">
                                <div className="internie-landing-faq-heading">
                                    <span>{t("landing.faq.eyebrow")}</span>
                                    <h2>{t("landing.faq.title")}</h2>
                                </div>
                                <div className="internie-landing-faq-list">
                                    {faqItems.map((item, index) => {
                                        const isOpen = openFaqIndexes.has(index);
                                        return (
                                            <div key={item.question} className={`internie-landing-faq-item${isOpen ? " is-open" : ""}`}>
                                                <button type="button" className="internie-landing-faq-question" aria-expanded={isOpen} aria-controls={`internie-faq-answer-${index}`} onClick={() => handleFaqToggle(index)}>
                                                    <span>{item.question}</span>
                                                    <FaqArrow />
                                                </button>
                                                <div id={`internie-faq-answer-${index}`} className="internie-landing-faq-answer" aria-hidden={!isOpen}>
                                                    <div className="internie-landing-faq-answer-inner"><p>{item.answer}</p></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                        <section className="internie-landing-final-cta">
                            <div className="internie-landing-final-cta-inner internie-landing-reveal">
                                <div className="internie-landing-final-cta-desktop">
                                    <h2><span className="internie-landing-text-line">{t("landing.finalCta.desktop.titleLine1")}</span><span className="internie-landing-text-line">{t("landing.finalCta.desktop.titleLine2")}</span></h2>
                                    <p><span className="internie-landing-text-line">{t("landing.finalCta.desktop.descriptionLine1")}</span><span className="internie-landing-text-line">{t("landing.finalCta.desktop.descriptionLine2")}</span></p>
                                </div>
                                <div className="internie-landing-final-cta-mobile-copy">
                                    <h2><span className="internie-landing-text-line">{t("landing.finalCta.mobile.titleLine1")}</span><span className="internie-landing-text-line">{t("landing.finalCta.mobile.titleLine2")}</span></h2>
                                    <p><span className="internie-landing-text-line">{t("landing.finalCta.mobile.descriptionLine1")}</span><span className="internie-landing-text-line">{t("landing.finalCta.mobile.descriptionLine2")}</span></p>
                                </div>
                                <div ref={finalCtaButtonRef} className="internie-landing-final-button-slot" aria-hidden="true" />
                            </div>
                        </section>
                    </main>
                    <div ref={inquiryPopoverRef} className={`internie-landing-inquiry-anchor${inquiryDocked ? " is-docked" : ""}${inquiryOpen ? " is-open" : ""}`} style={inquiryDocked ? { top: `${inquiryDockPosition.top}px`, left: `${inquiryDockPosition.left}px` } : undefined}>
                        <div className={`internie-landing-inquiry-popover${inquiryOpen ? " is-open" : ""}`} aria-hidden={!inquiryOpen}>
                            <div className="internie-landing-inquiry-header">
                                <h2>{t("landing.inquiry.title")}</h2>
                                <button type="button" className="internie-landing-inquiry-close" aria-label={t("landing.inquiry.closeAria")} onClick={handleInquiryClose}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                        <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </button>
                            </div>
                            <InquiryForm form={inquiryForm} privacyAgreed={privacyAgreed} submitting={inquirySubmitting} onFieldChange={updateInquiryField} onPrivacyChange={setPrivacyAgreed} onSubmit={handleInquirySubmit} />
                        </div>
                        <button ref={floatingButtonRef} type="button" className={`internie-landing-consult-button internie-landing-floating-button${inquiryOpen ? " is-active" : ""}`} aria-expanded={inquiryOpen} onClick={() => inquiryOpen ? handleInquiryClose() : handleInquiryOpen()}>
                            {t("landing.inquiry.openButton")}
                        </button>
                    </div>
                </div>
                <section className={`internie-landing-mobile-inquiry-page${inquiryOpen ? " is-open" : ""}`} aria-hidden={!inquiryOpen}>
                    {inquirySubmitted ? (
                        <div className="internie-landing-mobile-inquiry-success">
                            <div className="internie-landing-mobile-inquiry-success-content"><strong>{t("landing.inquiry.success")}</strong></div>
                            <button type="button" className="internie-landing-mobile-inquiry-success-button" onClick={handleInquiryClose}>{t("landing.inquiry.back")}</button>
                        </div>
                    ) : (
                        <div className="internie-landing-mobile-inquiry-inner">
                            <div className="internie-landing-mobile-inquiry-card">
                                <header className="internie-landing-mobile-inquiry-header">
                                    <button type="button" className="internie-landing-mobile-inquiry-back" aria-label={t("landing.inquiry.backAria")} onClick={handleInquiryClose}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                            <path d="M15 6L9 12L15 18" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                    <h1>{t("landing.inquiry.openButton")}</h1>
                                </header>
                                <InquiryForm form={inquiryForm} privacyAgreed={privacyAgreed} submitting={inquirySubmitting} onFieldChange={updateInquiryField} onPrivacyChange={setPrivacyAgreed} onSubmit={handleInquirySubmit} />
                            </div>
                        </div>
                    )}
                </section>
                <LandingFooter onLinkClick={handleFooterLinkClick} />
            </div>
        </>
    );
}
