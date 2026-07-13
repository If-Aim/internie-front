import React, { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ApiError, createInquiry } from "../../api/client";
import SeoMeta from "../../utils/SeoMetadata";

import heroImage from "../../assets/landing/hero.svg";
import hero1Image from "../../assets/landing/hero-1.svg";
import hero2Image from "../../assets/landing/hero-2.svg";
import missionImage from "../../assets/landing/mission.svg";
import missionMobileImage from "../../assets/landing/mission-mobile.png";
import projectMainImage from "../../assets/landing/project-main.png";
import projectTrackingImage from "../../assets/landing/project-tracking.png";
import projectMonitoringImage from "../../assets/landing/project-monitoring.png";
import projectReviewImage from "../../assets/landing/project-review.png";
import projectInsightImage from "../../assets/landing/project-insight.png";
import evaluationMainImage from "../../assets/landing/evaluation-main.png";
import evaluationRow1Image from "../../assets/landing/evaluation-row-1.png";
import evaluationRow2Image from "../../assets/landing/evaluation-row-2.png";
import evaluationRow3Image from "../../assets/landing/evaluation-row-3.png";

import heroEnglishImage from "../../assets/landing/en/hero.svg";
import hero1EnglishImage from "../../assets/landing/en/hero-1.svg";
import hero2EnglishImage from "../../assets/landing/en/hero-2.svg";
import missionEnglishImage from "../../assets/landing/en/mission.svg";
// import missionMobileEnglishImage from "../../assets/landing/en/mission-mobile.png";
import projectMainEnglishImage from "../../assets/landing/en/project-main.png";
import projectTrackingEnglishImage from "../../assets/landing/en/project-tracking.png";
import projectMonitoringEnglishImage from "../../assets/landing/en/project-monitoring.png";
import projectReviewEnglishImage from "../../assets/landing/en/project-review.png";
import projectInsightEnglishImage from "../../assets/landing/en/project-insight.png";
import evaluationMainEnglishImage from "../../assets/landing/en/evaluation-main.png";
import evaluationRow1EnglishImage from "../../assets/landing/en/evaluation-row-1.png";
import evaluationRow2EnglishImage from "../../assets/landing/en/evaluation-row-2.png";
import evaluationRow3EnglishImage from "../../assets/landing/en/evaluation-row-3.png";

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

type LandingFooterProps = {
    onLinkClick: (link: LandingFooterLink) => void;
};

function LandingFooter({
    onLinkClick
}: LandingFooterProps): React.ReactElement {
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

                    <p>
                        {t("landing.footer.taglineLine1")}<br />
                        {t("landing.footer.taglineLine2")}
                    </p>

                    {!isEnglish && (
                        <div className="internie-landing-footer-company">
                            <span>{t("landing.footer.companyName")}</span>
                            <span>purieu.k@gmail.com</span>
                        </div>
                    )}

                    {isEnglish && (
                        <div className="internie-landing-footer-company internie-landing-footer-company-mobile">
                            <span>{t("landing.footer.companyName")}</span>
                            <span>purieu.k@gmail.com</span>
                        </div>
                    )}
                </div>

                <div className="internie-landing-footer-column">
                    <strong>{t("landing.footer.linksTitle")}</strong>

                    <nav className="internie-landing-footer-links" aria-label={t("landing.footer.navAria")}>
                        {footerLinks.map((link) => {
                            const pending = !link.path && !link.sectionId;

                            return (
                                <button
                                    key={link.label}
                                    type="button"
                                    aria-disabled={pending}
                                    onClick={() => {
                                        if (!pending) {
                                            onLinkClick(link);
                                        }
                                    }}
                                >
                                    {link.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="internie-landing-footer-column internie-landing-footer-contact">
                    <strong>
                        {isEnglish
                            ? t("landing.footer.companyInfoTitle")
                            : t("landing.footer.contactTitle")}
                    </strong>

                    <div>
                        <p>
                            {isEnglish
                                ? t("landing.footer.companyName")
                                : t("landing.footer.representative")}
                        </p>
                        <span>
                            {isEnglish
                                ? "purieu.k@gmail.com"
                                : "aim2a.kor@gmail.com"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="internie-landing-footer-copyright">
                <span>© 2026 aim. All rights reserved.</span>
            </div>
        </footer>
    );
}

export default function Landing(): React.ReactElement {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const isEnglish = i18n.resolvedLanguage?.startsWith("en") ?? false;
    
    const heroDesktopSrc = isEnglish ? heroEnglishImage : heroImage;
    const heroMobileMainSrc = isEnglish ? hero1EnglishImage : hero1Image;
    const heroMobileSideSrc = isEnglish ? hero2EnglishImage : hero2Image;
    const missionDesktopSrc = isEnglish ? missionEnglishImage : missionImage;
    const missionMobileSrc = isEnglish ? missionEnglishImage : missionMobileImage;

    const projectMainSrc = isEnglish ? projectMainEnglishImage : projectMainImage;
    const projectTrackingSrc = isEnglish ? projectTrackingEnglishImage : projectTrackingImage;
    const projectMonitoringSrc = isEnglish ? projectMonitoringEnglishImage : projectMonitoringImage;
    const projectReviewSrc = isEnglish ? projectReviewEnglishImage : projectReviewImage;
    const projectInsightSrc = isEnglish ? projectInsightEnglishImage : projectInsightImage;

    const evaluationMainSrc = isEnglish ? evaluationMainEnglishImage : evaluationMainImage;
    const evaluationRow1Src = isEnglish ? evaluationRow1EnglishImage : evaluationRow1Image;
    const evaluationRow2Src = isEnglish ? evaluationRow2EnglishImage : evaluationRow2Image;
    const evaluationRow3Src = isEnglish ? evaluationRow3EnglishImage : evaluationRow3Image;
    
    const landingRef = useRef<HTMLDivElement | null>(null);
    const finalCtaButtonRef = useRef<HTMLDivElement | null>(null);
    const inquiryPopoverRef = useRef<HTMLDivElement | null>(null);
    const floatingButtonRef = useRef<HTMLButtonElement | null>(null);
    const inquiryReturnScrollRef = useRef(0);

    const [openFaqIndexes, setOpenFaqIndexes] = useState<Set<number>>(() => new Set());
    const [inquiryOpen, setInquiryOpen] = useState(false);
    const [inquiryForm, setInquiryForm] = useState<InquiryFormState>(EMPTY_INQUIRY_FORM);
    const [privacyAgreed, setPrivacyAgreed] = useState(false);
    const [inquirySubmitting, setInquirySubmitting] = useState(false);
    const [inquirySubmitted, setInquirySubmitted] = useState(false);
    const [inquiryDocked, setInquiryDocked] = useState(false);
    const [inquiryDockPosition, setInquiryDockPosition] = useState({
        top: 0,
        left: 0
    });

    const problemItems = ["item1", "item2", "item3"].map((key) => ({
        number: t(`landing.problem.items.${key}.number`),
        titleLine1: t(`landing.problem.items.${key}.titleLine1`),
        titleLine2: t(`landing.problem.items.${key}.titleLine2`),
        descriptionLine1: t(`landing.problem.items.${key}.descriptionLine1`),
        descriptionLine2: t(`landing.problem.items.${key}.descriptionLine2`)
    }));

    const faqItems = ["item1", "item2", "item3", "item4", "item5"].map((key) => ({
        question: t(`landing.faq.items.${key}.question`),
        answer: t(`landing.faq.items.${key}.answer`)
    }));

    const isMobileViewport = () => {
        return window.matchMedia("(max-width: 768px)").matches;
    };

    const handleInquiryOpen = () => {
        const scrollRoot = document.getElementById("root");

        setInquirySubmitted(false);

        if (isMobileViewport()) {
            inquiryReturnScrollRef.current = scrollRoot?.scrollTop ?? window.scrollY;
        }

        setInquiryOpen(true);

        requestAnimationFrame(() => {
            if (!isMobileViewport()) return;

            scrollRoot?.scrollTo({
                top: 0,
                behavior: "auto"
            });

            window.scrollTo({
                top: 0,
                behavior: "auto"
            });
        });
    };

    const handleInquiryClose = () => {
        const restoreMobileScroll = isMobileViewport();

        setInquiryOpen(false);
        setInquirySubmitted(false);

        requestAnimationFrame(() => {
            if (!restoreMobileScroll) return;

            const scrollRoot = document.getElementById("root");

            scrollRoot?.scrollTo({
                top: inquiryReturnScrollRef.current,
                behavior: "auto"
            });

            window.scrollTo({
                top: inquiryReturnScrollRef.current,
                behavior: "auto"
            });
        });
    };

    const updateInquiryField = (field: keyof InquiryFormState, value: string) => {
        setInquiryForm((prev) => ({
            ...prev,
            [field]: value
        }));
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

        const hasMissingRequiredField = isEnglish
            ? !firstName || !lastName || !payload.companyName || !payload.companyEmail || !payload.phone
            : !payload.companyName || !payload.contactName || !payload.position || !payload.companyEmail || !payload.phone;

        if (hasMissingRequiredField) {
            window.alert(t("landing.inquiry.errors.required"));
            return;
        }

        const phonePattern = isEnglish
            ? /^[0-9+()\s-]{7,30}$/
            : /^[0-9-]+$/;

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
            const message = !isEnglish && error instanceof ApiError
                ? error.message
                : t("landing.inquiry.errors.submitFailed");

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
            document.getElementById(link.sectionId)?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    };

    useEffect(() => {
        const elements = document.querySelectorAll<HTMLElement>(".internie-landing-reveal, .internie-landing-sequence");

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    entry.target.classList.toggle("is-visible", entry.isIntersecting);
                });
            },
            {
                threshold: 0.15,
                rootMargin: "-60px 0px -80px 0px"
            }
        );

        elements.forEach((element) => observer.observe(element));

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const scrollRoot = document.getElementById("root");
        const floatingBottom = 50;

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

                const floatingButtonTop = window.innerHeight - floatingBottom - buttonHeight;
                const shouldDock = slotRect.top <= floatingButtonTop;

                setInquiryDocked((prev) => {
                    return prev === shouldDock ? prev : shouldDock;
                });

                if (!shouldDock) return;

                const nextTop = slotRect.top - landingRect.top;
                const nextLeft = slotRect.left - landingRect.left;

                setInquiryDockPosition((prev) => {
                    if (Math.abs(prev.top - nextTop) < 0.5 && Math.abs(prev.left - nextLeft) < 0.5) {
                        return prev;
                    }

                    return {
                        top: nextTop,
                        left: nextLeft
                    };
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
            <SeoMeta
                title={t("landing.seo.title")}
                description={t("landing.seo.description")}
                lang={isEnglish ? "en" : "ko"}
                canonical="https://www.internie.com/"
            />
            <div ref={landingRef} className={`internie-landing ${isEnglish ? "is-en" : "is-ko"}${inquiryOpen ? " is-inquiry-open" : ""}`}>
                <div className={`internie-landing-default-view${inquiryOpen ? " is-inquiry-open" : ""}`}>
                    <header className="internie-landing-header">
                        <button type="button" className="internie-landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                            internie
                        </button>

                        <button type="button" className="internie-landing-login" onClick={() => navigate("/login")}>
                            {t("landing.header.login")}
                        </button>
                    </header>

                    <main>
                        <section id="internie-landing-top" className="internie-landing-hero">
                            <div className="internie-landing-hero-copy">
                                <div className="internie-landing-hero-logo">internie</div>

                                <div className="internie-landing-hero-copy-desktop">
                                    <p>
                                        <span className="internie-landing-text-line">
                                            <Trans i18nKey="landing.hero.desktop.pretitleLine1" components={{ strong: <strong /> }} />
                                        </span>
                                        <span className="internie-landing-text-line">
                                            <Trans i18nKey="landing.hero.desktop.pretitleLine2" components={{ strong: <strong /> }} />
                                        </span>
                                    </p>

                                    <h1>
                                        <span className="internie-landing-text-line">
                                            <Trans i18nKey="landing.hero.desktop.titleLine1" components={{ strong: <strong /> }} />
                                        </span>
                                        <span className="internie-landing-text-line">
                                            <Trans i18nKey="landing.hero.desktop.titleLine2" components={{ strong: <strong /> }} />
                                        </span>
                                    </h1>

                                    {t("landing.hero.desktop.subtitleLine1") && (
                                        <p className="internie-landing-hero-subtitle">
                                            <span className="internie-landing-text-line">{t("landing.hero.desktop.subtitleLine1")}</span>
                                            <span className="internie-landing-text-line">{t("landing.hero.desktop.subtitleLine2")}</span>
                                        </p>
                                    )}
                                </div>

                                <div className="internie-landing-hero-copy-mobile">
                                    <p>
                                        <span className="internie-landing-text-line">{t("landing.hero.mobile.pretitleLine1")}</span>
                                        <span className="internie-landing-text-line">{t("landing.hero.mobile.pretitleLine2")}</span>
                                    </p>

                                    <h1>
                                        <span className="internie-landing-text-line">{t("landing.hero.mobile.titleLine1")}</span>
                                        <span className="internie-landing-text-line">
                                            <Trans
                                                i18nKey="landing.hero.mobile.titleLine2"
                                                components={{ strong: <strong /> }}
                                            />
                                        </span>
                                    </h1>
                                </div>
                            </div>

                            <picture className="internie-landing-hero-picture internie-landing-reveal">
                                <img className="internie-landing-hero-image" src={heroDesktopSrc} alt={t("landing.hero.imageAlt")} />
                            </picture>

                            <div className="internie-landing-mobile-hero-visual internie-landing-reveal">
                                <img className="internie-landing-mobile-hero-card internie-landing-mobile-hero-card-main" src={heroMobileMainSrc} alt={t("landing.hero.mainCardAlt")} />
                                <img className="internie-landing-mobile-hero-card internie-landing-mobile-hero-card-left" src={heroMobileSideSrc} alt="" aria-hidden="true" />
                                <img className="internie-landing-mobile-hero-card internie-landing-mobile-hero-card-right" src={heroMobileSideSrc} alt="" aria-hidden="true" />
                            </div>
                        </section>

                        <section className="internie-landing-section internie-landing-section-white internie-landing-problem-section">
                            <div className="internie-landing-section-heading">
                                <span>{t("landing.problem.eyebrow")}</span>

                                <h2>
                                    <span className="internie-landing-text-line">{t("landing.problem.titleLine1")}</span>
                                    <span className="internie-landing-text-line">{t("landing.problem.titleLine2")}</span>
                                </h2>
                            </div>

                            <div className="internie-landing-problem-cards">
                                {problemItems.map((item) => (
                                    <article key={item.number} className="internie-landing-problem-card internie-landing-reveal">
                                        <strong>{item.number}</strong>

                                        <h3>
                                            {item.titleLine1}
                                            {item.titleLine2 && <><br />{item.titleLine2}</>}
                                        </h3>

                                        <p>
                                            {item.descriptionLine1}
                                            {item.descriptionLine2 && <><br />{item.descriptionLine2}</>}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section className="internie-landing-section internie-landing-section-blue">
                            <div className="internie-landing-section-heading">
                                <span>{t("landing.howItWorks.eyebrow")}</span>

                                <h2>
                                    <span className="internie-landing-text-line">{t("landing.howItWorks.titleLine1")}</span>
                                    <span className="internie-landing-text-line">{t("landing.howItWorks.titleLine2")}</span>
                                </h2>
                            </div>

                            <div className="internie-landing-content-image-reveal internie-landing-reveal">
                                <picture className="internie-landing-content-picture">
                                    <source media="(max-width: 768px)" srcSet={missionMobileSrc} />
                                    <img className="internie-landing-content-image" src={missionDesktopSrc} alt={t("landing.howItWorks.imageAlt")} />
                                </picture>
                            </div>
                            <div className="internie-landing-section-paragraph">
                                <span className="internie-landing-text-line">{t("landing.howItWorks.descriptionLine1")}</span>
                                <span className="internie-landing-text-line">
                                    <Trans i18nKey="landing.howItWorks.descriptionLine2" components={{ strong: <strong /> }} />
                                </span>
                            </div>
                        </section>

                        <section className="internie-landing-section internie-landing-section-white internie-landing-project-section">
                            <div className="internie-landing-section-heading">
                                <span className="internie-landing-section-heading-badge">{t("landing.project.badge")}</span>

                                <h2>
                                    <span className="internie-landing-text-line">{t("landing.project.titleLine1")}</span>
                                    <span className="internie-landing-text-line">{t("landing.project.titleLine2")}</span>
                                </h2>
                            </div>
                            
                            <div className="internie-landing-project-visual internie-landing-sequence">
                                <img
                                    className="internie-landing-project-main"
                                    src={projectMainSrc}
                                    alt={t("landing.project.mainImageAlt")}
                                />

                                <div className="internie-landing-project-card-group">
                                    <img
                                        className="internie-landing-project-card internie-project-card-1"
                                        src={projectTrackingSrc}
                                        alt={t("landing.project.trackingImageAlt")}
                                    />
                                    <img
                                        className="internie-landing-project-card internie-project-card-2"
                                        src={projectMonitoringSrc}
                                        alt={t("landing.project.monitoringImageAlt")}
                                    />
                                    <img
                                        className="internie-landing-project-card internie-project-card-3"
                                        src={projectReviewSrc}
                                        alt={t("landing.project.reviewImageAlt")}
                                    />
                                    <img
                                        className="internie-landing-project-card internie-project-card-4"
                                        src={projectInsightSrc}
                                        alt={t("landing.project.insightImageAlt")}
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="internie-landing-section internie-landing-section-white internie-landing-evaluation-section">
                            <div className="internie-landing-section-heading">
                                <span className="internie-landing-section-heading-badge">{t("landing.evaluation.badge")}</span>

                                <h2>
                                    <span className="internie-landing-text-line">{t("landing.evaluation.titleLine1")}</span>
                                    <span className="internie-landing-text-line">{t("landing.evaluation.titleLine2")}</span>
                                </h2>
                            </div>

                            <div className="internie-landing-evaluation-visual internie-landing-sequence">
                                <img
                                    className="internie-landing-evaluation-main"
                                    src={evaluationMainSrc}
                                    alt={t("landing.evaluation.mainImageAlt")}
                                />

                                <div className="internie-landing-evaluation-card-group">
                                    <img
                                        className="internie-landing-evaluation-card internie-evaluation-card-1"
                                        src={evaluationRow1Src}
                                        alt={t("landing.evaluation.row1ImageAlt")}
                                    />
                                    <img
                                        className="internie-landing-evaluation-card internie-evaluation-card-2"
                                        src={evaluationRow2Src}
                                        alt={t("landing.evaluation.row2ImageAlt")}
                                    />
                                    <img
                                        className="internie-landing-evaluation-card internie-evaluation-card-3"
                                        src={evaluationRow3Src}
                                        alt={t("landing.evaluation.row3ImageAlt")}
                                    />
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
                                                    <div className="internie-landing-faq-answer-inner">
                                                        <p>{item.answer}</p>
                                                    </div>
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
                                    <h2>
                                        <span className="internie-landing-text-line">{t("landing.finalCta.desktop.titleLine1")}</span>
                                        <span className="internie-landing-text-line">{t("landing.finalCta.desktop.titleLine2")}</span>
                                    </h2>

                                    <p>
                                        <span className="internie-landing-text-line">{t("landing.finalCta.desktop.descriptionLine1")}</span>
                                        <span className="internie-landing-text-line">{t("landing.finalCta.desktop.descriptionLine2")}</span>
                                    </p>
                                </div>

                                <div className="internie-landing-final-cta-mobile-copy">
                                    <h2>
                                        <span className="internie-landing-text-line">{t("landing.finalCta.mobile.titleLine1")}</span>
                                        <span className="internie-landing-text-line">{t("landing.finalCta.mobile.titleLine2")}</span>
                                    </h2>

                                    <p>
                                        <span className="internie-landing-text-line">{t("landing.finalCta.mobile.descriptionLine1")}</span>
                                        <span className="internie-landing-text-line">{t("landing.finalCta.mobile.descriptionLine2")}</span>
                                    </p>
                                </div>

                                <div ref={finalCtaButtonRef} className="internie-landing-final-button-slot" aria-hidden="true"/>
                            </div>
                        </section>
                    </main>

                    <div
                        ref={inquiryPopoverRef}
                        className={`internie-landing-inquiry-anchor${inquiryDocked ? " is-docked" : ""}${inquiryOpen ? " is-open" : ""}`}
                        style={
                            inquiryDocked
                                ? {
                                    top: `${inquiryDockPosition.top}px`,
                                    left: `${inquiryDockPosition.left}px`
                                }
                                : undefined
                        }
                    >
                        <div className={`internie-landing-inquiry-popover${inquiryOpen ? " is-open" : ""}`} aria-hidden={!inquiryOpen}>
                            <div className="internie-landing-inquiry-header">
                                <h2>{t("landing.inquiry.title")}</h2>

                                <button type="button" className="internie-landing-inquiry-close" aria-label={t("landing.inquiry.closeAria")} onClick={handleInquiryClose}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                                    </svg>
                                </button>
                            </div>
                            <InquiryForm
                                form={inquiryForm}
                                privacyAgreed={privacyAgreed}
                                submitting={inquirySubmitting}
                                onFieldChange={updateInquiryField}
                                onPrivacyChange={setPrivacyAgreed}
                                onSubmit={handleInquirySubmit}
                            />
                        </div>

                        <button
                            ref={floatingButtonRef}
                            type="button"
                            className={`internie-landing-consult-button internie-landing-floating-button${inquiryOpen ? " is-active" : ""}`}
                            aria-expanded={inquiryOpen}
                            onClick={() => {
                                if (inquiryOpen) {
                                    handleInquiryClose();
                                    return;
                                }

                                handleInquiryOpen();
                            }}
                        >
                            {t("landing.inquiry.openButton")}
                        </button>
                    </div>
                </div>
                <section
                    className={`internie-landing-mobile-inquiry-page${inquiryOpen ? " is-open" : ""}`}
                    aria-hidden={!inquiryOpen}
                >
                    {inquirySubmitted ? (
                        <div className="internie-landing-mobile-inquiry-success">
                            <div className="internie-landing-mobile-inquiry-success-content">
                                <span className="internie-landing-mobile-inquiry-success-icon" aria-hidden="true">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50" fill="none">
                                        <circle className="internie-inquiry-success-circle" cx="25" cy="25" r="25" fill="#0166FF" />
                                        <path
                                            className="internie-inquiry-success-check"
                                            d="M15 26.1633C16.9613 27.5897 20.884 31.5124 22.4887 34.1869C24.4501 29.9077 29.4426 20.2793 34.7917 16"
                                            pathLength="1"
                                            stroke="white"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </span>
                                <strong>{t("landing.inquiry.success")}</strong>
                            </div>

                            <button type="button" className="internie-landing-mobile-inquiry-success-button" onClick={handleInquiryClose}>
                                {t("landing.inquiry.back")}
                            </button>
                        </div>
                    ) : (
                        <div className="internie-landing-mobile-inquiry-inner">
                            <div className="internie-landing-mobile-inquiry-card">
                                <header className="internie-landing-mobile-inquiry-header">
                                    <button type="button" className="internie-landing-mobile-inquiry-back" aria-label={t("landing.inquiry.backAria")} onClick={handleInquiryClose}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M15 6L9 12L15 18" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>

                                    <h1>{t("landing.inquiry.openButton")}</h1>
                                </header>

                                <InquiryForm
                                    form={inquiryForm}
                                    privacyAgreed={privacyAgreed}
                                    submitting={inquirySubmitting}
                                    onFieldChange={updateInquiryField}
                                    onPrivacyChange={setPrivacyAgreed}
                                    onSubmit={handleInquirySubmit}
                                />
                            </div>
                        </div>
                    )}
                </section>
                <LandingFooter onLinkClick={handleFooterLinkClick} />
            </div>
        </>
    );
}