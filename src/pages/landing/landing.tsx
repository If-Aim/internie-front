import React, { useEffect, useRef, useState } from "react";
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

import "./landing.css";

type LandingFooterLink = {
    label: string;
    path: string | null;
    sectionId: string | null;
};

type InquiryFormState = {
    companyName: string;
    contactName: string;
    position: string;
    companyEmail: string;
    phone: string;
    question: string;
};

const EMPTY_INQUIRY_FORM: InquiryFormState = {
    companyName: "",
    contactName: "",
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
    return (
        <form className="internie-landing-inquiry-form" onSubmit={onSubmit}>
            <div className="internie-landing-inquiry-row">
                <label>
                    <span>기업명<em>*</em></span>
                    <input type="text" name="companyName" value={form.companyName} maxLength={50} placeholder="예) AIM" autoComplete="organization" required onChange={(event) => onFieldChange("companyName", event.target.value)} />
                </label>

                <label>
                    <span>담당자명<em>*</em></span>
                    <input type="text" name="contactName" value={form.contactName} maxLength={100} placeholder="예) 김유진" autoComplete="name" required onChange={(event) => onFieldChange("contactName", event.target.value)} />
                </label>
            </div>

            <label>
                <span>직책<em>*</em></span>
                <input type="text" name="position" value={form.position} maxLength={50} placeholder="예) 인사팀장" autoComplete="organization-title" required onChange={(event) => onFieldChange("position", event.target.value)} />
            </label>

            <label>
                <span>회사 이메일<em>*</em></span>
                <input type="email" name="companyEmail" value={form.companyEmail} maxLength={255} placeholder="example@company.com" autoComplete="email" required onChange={(event) => onFieldChange("companyEmail", event.target.value)} />
            </label>

            <label>
                <span>연락처<em>*</em></span>
                <input type="tel" name="phone" value={form.phone} maxLength={30} pattern="[0-9-]+" inputMode="tel" placeholder="010-0000-0000" autoComplete="tel" required onChange={(event) => onFieldChange("phone", event.target.value)} />
            </label>

            <label>
                <span>어떤 점이 궁금하신가요? (선택)</span>
                <textarea name="question" value={form.question} maxLength={2000} rows={4} onChange={(event) => onFieldChange("question", event.target.value)} />
            </label>

            <label className="internie-landing-inquiry-agree">
                <input type="checkbox" checked={privacyAgreed} required onChange={(event) => onPrivacyChange(event.target.checked)} />
                <span>개인정보 수집 및 이용에 동의합니다.</span>
            </label>

            <button type="submit" className="internie-landing-inquiry-submit" disabled={submitting}>
                {submitting ? "전송 중..." : "제출하기"}
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

const LANDING_FOOTER_LINKS: LandingFooterLink[] = [
    { label: "홈", path: null, sectionId: "internie-landing-top" },
    { label: "서비스 소개", path: null, sectionId: null },
    { label: "소식 소개", path: null, sectionId: null },
    { label: "FAQ", path: null, sectionId: "internie-landing-faq" }
];

const LANDING_FAQ_ITEMS = [
    {
        question: "세팅에 시간이 얼마나 걸리고, 우리는 뭘 해야 하나요?",
        answer: "담당자는 JD나 실무 과제만 전달해 주시면 됩니다. 미션 설계부터 지원자 운영, 제출물 관리, 평가 지원까지 인터니가 진행합니다. 담당자는 최종 결과를 확인하고 지원자를 검토하면 됩니다."
    },
    {
        question: "어떤 직무·규모에 맞나요? 개발직만 되나요?",
        answer: "개발뿐 아니라 마케팅, 기획, 운영, CS, 디자인 등 결과물을 만드는 대부분의 직무에 적용할 수 있습니다. 채용하려는 직무의 JD나 과제를 공유해 주시면, 그에 맞는 미션으로 설계해드립니다. 특히 신입·인턴처럼 이력서만으로 판단하기 어려운 채용에서 활용도가 높습니다."
    },
    {
        question: "지원자에게 보상을 제공해야 하나요?",
        answer: "필수는 아닙니다. 기본적으로는 무료 참여이며, 완료자에게는 참여 인증 뱃지를 제공합니다. 필요하다면 소정의 참여 보상이나 인증서 발급도 함께 운영할 수 있습니다."
    },
    {
        question: "우리 회사 실무를 외부에 공개해야 하는데, 보안·기밀은 괜찮나요?",
        answer: "원본 업무를 그대로 공개하지 않습니다. 회사명, 고객 정보, 민감한 데이터는 제거하거나 익명화하고, 실무 맥락만 살려 미션을 구성합니다. 어떤 내용을 공개할지는 기업이 직접 결정하며, 필요하면 NDA 절차도 함께 적용할 수 있습니다."
    },
    {
        question: "부정행위나 AI 대필은 어떻게 걸러내나요?",
        answer: "인터니는 결과물만 평가하지 않습니다. 과제를 수행하는 과정과 단계별 산출물을 함께 보기 때문에, 대필이나 단순 복붙은 과정에서 드러날 가능성이 높습니다. AI 역시 사용 여부보다 어떻게 활용했는지를 하나의 평가 요소로 활용합니다."
    }
];

type LandingFooterProps = {
    onLinkClick: (link: LandingFooterLink) => void;
};

function LandingFooter({
    onLinkClick
}: LandingFooterProps): React.ReactElement {
    return (
        <footer className="internie-landing-footer">
            <div className="internie-landing-footer-inner">
                <div className="internie-landing-footer-brand">
                    <div className="internie-landing-footer-logo">
                        <strong>internie</strong>
                    </div>

                    <p>
                        이력서로 알 수 없는 실력을, 데이터로 증명합니다<br />
                        by aim
                    </p>

                    <div className="internie-landing-footer-company">
                        <span>상호 aim(에임) · 대표 김유진</span>
                        <span>purieu.k@gmail.com</span>
                    </div>
                </div>

                <div className="internie-landing-footer-column">
                    <strong>바로가기</strong>

                    <nav className="internie-landing-footer-links" aria-label="푸터 바로가기">
                        {LANDING_FOOTER_LINKS.map((link) => {
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
                    <strong>고객 문의</strong>

                    <div>
                        <p>대표 문의</p>
                        <span>aim2a.kor@gmail.com</span>
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

        const payload = {
            companyName: inquiryForm.companyName.trim(),
            contactName: inquiryForm.contactName.trim(),
            position: inquiryForm.position.trim(),
            companyEmail: inquiryForm.companyEmail.trim(),
            phone: inquiryForm.phone.trim(),
            question: inquiryForm.question.trim() || null
        };

        if (!payload.companyName || !payload.contactName || !payload.position || !payload.companyEmail || !payload.phone) {
            window.alert("필수 항목을 모두 입력해주세요.");
            return;
        }

        if (!/^[0-9-]+$/.test(payload.phone)) {
            window.alert("연락처는 숫자와 하이픈만 입력해주세요.");
            return;
        }

        if (!privacyAgreed) {
            window.alert("개인정보 수집 및 이용에 동의해주세요.");
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

            window.alert("문의가 정상적으로 접수되었습니다.");
            handleInquiryClose();
        } catch (error) {
            const message = error instanceof ApiError
                ? error.message
                : "문의 전송에 실패했습니다. 잠시 후 다시 시도해주세요.";

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
                title="인터니 | 실무 미션 기반 채용 플랫폼"
                description="이력서만으로 알 수 없는 지원자의 실무 역량을 확인하세요. 인터니는 실무 미션의 수행 과정과 결과를 통해 기업의 채용 판단을 돕습니다."
                lang="ko"
                canonical="https://www.internie.com/"
            />
            <div ref={landingRef} className={`internie-landing${inquiryOpen ? " is-inquiry-open" : ""}`}>
                <div className={`internie-landing-default-view${inquiryOpen ? " is-inquiry-open" : ""}`}>
                    <header className="internie-landing-header">
                        <button type="button" className="internie-landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                            internie
                        </button>

                        <button type="button" className="internie-landing-login" onClick={() => navigate("/login")}>
                            로그인
                        </button>
                    </header>

                    <main>
                        <section id="internie-landing-top" className="internie-landing-hero">
                            <div className="internie-landing-hero-copy">
                                <div className="internie-landing-hero-logo">internie</div>
                                <p>
                                    <span className="internie-landing-text-line">인터니에서 누가 <strong>“우리 팀의 일”</strong>을</span>
                                    <span className="internie-landing-text-line">잘하는지 결과물과 수행 데이터로 확인하세요</span>
                                </p>

                                <h1>
                                    <span className="internie-landing-text-line">일하는 방식을 보고</span>
                                    <span className="internie-landing-text-line"><strong>채용</strong> 하세요</span>
                                </h1>
                            </div>

                            <picture className="internie-landing-hero-picture internie-landing-reveal">
                                <img className="internie-landing-hero-image" src={heroImage} alt="인터니 채용 프로세스" />
                            </picture>

                            <div className="internie-landing-mobile-hero-visual internie-landing-reveal">
                                <img className="internie-landing-mobile-hero-card internie-landing-mobile-hero-card-main" src={hero1Image} alt="인터니 지원자 평가 화면" />
                                <img className="internie-landing-mobile-hero-card internie-landing-mobile-hero-card-left" src={hero2Image} alt="" aria-hidden="true" />
                                <img className="internie-landing-mobile-hero-card internie-landing-mobile-hero-card-right" src={hero2Image} alt="" aria-hidden="true" />
                            </div>
                        </section>

                        <section className="internie-landing-section internie-landing-section-white internie-landing-problem-section">
                            <div className="internie-landing-section-heading">
                                <span>이런 스타트업이라면</span>

                                <h2>
                                    <span className="internie-landing-text-line">채용 전에,</span>
                                    <span className="internie-landing-text-line">함께 일해보세요</span>
                                </h2>
                            </div>

                            <div className="internie-landing-problem-cards">
                                <article className="internie-landing-problem-card internie-landing-reveal">
                                    <strong>01</strong>
                                    <h3>이력서만으로<br/>지원자를 알지 못합니다</h3>
                                    <p>지원자가 실제로 어떻게 문제를<br/>해결하는지 파악하기 어렵습니다</p>
                                </article>

                                <article className="internie-landing-problem-card internie-landing-reveal">
                                    <strong>02</strong>
                                    <h3>면접 시간이 늘어나도,<br/>결과는 똑같습니다</h3>
                                    <p>커뮤니케이션, 실행력, 피드백 수용 방식은<br/>실제 업무 과정에서 드러납니다</p>
                                </article>

                                <article className="internie-landing-problem-card internie-landing-reveal">
                                    <strong>03</strong>
                                    <h3>결국,<br/>다시 감에 의존합니다</h3>
                                    <p>과제 전형을 진행해도,<br/>채용 근거는 남지 않습니다</p>
                                </article>
                            </div>
                        </section>

                        <section className="internie-landing-section internie-landing-section-blue">
                            <div className="internie-landing-section-heading">
                                <span>어떻게 사용하나요?</span>

                                <h2>
                                    <span className="internie-landing-text-line">담당자님은 과제만 주세요,</span>
                                    <span className="internie-landing-text-line">나머지는 인터니가 할게요!</span>
                                </h2>
                            </div>

                            <div className="internie-landing-content-image-reveal internie-landing-reveal">
                                <picture className="internie-landing-content-picture">
                                    <source media="(max-width: 768px)" srcSet={missionMobileImage} />
                                    <img className="internie-landing-content-image" src={missionImage} alt="인터니 미션 관리 화면" />
                                </picture>
                            </div>
                            <div className="internie-landing-section-paragraph">
                                <span className="internie-landing-text-line">지원자 모집부터 운영·관리까지,</span>
                                <span className="internie-landing-text-line">담당자님은 결과물과 <strong>'누가 잘했는지'</strong>만 확인하세요</span>
                            </div>
                        </section>

                        <section className="internie-landing-section internie-landing-section-white internie-landing-project-section">
                            <div className="internie-landing-section-heading">
                                <span className="internie-landing-section-heading-badge">과제 생성</span>

                                <h2>
                                    <span className="internie-landing-text-line">우리 팀의 프로젝트가</span>
                                    <span className="internie-landing-text-line">학생에게 제공돼요</span>
                                </h2>
                            </div>
                            
                            <div className="internie-landing-project-visual internie-landing-sequence">
                                <img className="internie-landing-project-main" src={projectMainImage} alt="인터니 과제 관리 화면" />

                                <div className="internie-landing-project-card-group">
                                    <img className="internie-landing-project-card internie-project-card-1" src={projectTrackingImage} alt="트래킹 인프라 구축 과제" />
                                    <img className="internie-landing-project-card internie-project-card-2" src={projectMonitoringImage} alt="모니터링 주기 설정 과제" />
                                    <img className="internie-landing-project-card internie-project-card-3" src={projectReviewImage} alt="성과 리뷰 과제" />
                                    <img className="internie-landing-project-card internie-project-card-4" src={projectInsightImage} alt="인사이트 도출 과제" />
                                </div>
                            </div>
                        </section>

                        <section className="internie-landing-section internie-landing-section-white internie-landing-evaluation-section">
                            <div className="internie-landing-section-heading">
                                <span className="internie-landing-section-heading-badge">과제 평가</span>

                                <h2>
                                    <span className="internie-landing-text-line">단계별 산출물을 통해</span>
                                    <span className="internie-landing-text-line">학생들이 일하는 방식을 확인해요</span>
                                </h2>
                            </div>

                            <div className="internie-landing-evaluation-visual internie-landing-sequence">
                                <img className="internie-landing-evaluation-main" src={evaluationMainImage} alt="인터니 과제 평가 화면" />

                                <div className="internie-landing-evaluation-card-group">
                                    <img className="internie-landing-evaluation-card internie-evaluation-card-1" src={evaluationRow1Image} alt="과제 평가 카드 1" />
                                    <img className="internie-landing-evaluation-card internie-evaluation-card-2" src={evaluationRow2Image} alt="과제 평가 카드 2" />
                                    <img className="internie-landing-evaluation-card internie-evaluation-card-3" src={evaluationRow3Image} alt="과제 평가 카드 3" />
                                </div>
                            </div>
                        </section>

                        <section id="internie-landing-faq" className="internie-landing-faq">
                            <div className="internie-landing-faq-inner">
                                <div className="internie-landing-faq-heading">
                                    <span>FAQ</span>
                                    <h2>자주 묻는 질문</h2>
                                </div>

                                <div className="internie-landing-faq-list">
                                    {LANDING_FAQ_ITEMS.map((item, index) => {
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
                                <div>
                                    <h2>
                                        <span className="internie-landing-text-line">이력서 말고,</span>
                                        <span className="internie-landing-text-line">일하는 걸 보세요.</span>
                                    </h2>

                                    <p>
                                        <span className="internie-landing-text-line">미션 하나면 충분합니다.</span>
                                        <span className="internie-landing-text-line">지금 바로 도입 문의하세요</span>
                                    </p>
                                </div>

                                <div ref={finalCtaButtonRef} className="internie-landing-final-button-slot">
                                    <button type="button" className="internie-landing-mobile-final-button" onClick={handleInquiryOpen}>
                                        문의하기
                                    </button>
                                </div>
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
                                <h2>문의하기</h2>

                                <button type="button" className="internie-landing-inquiry-close" aria-label="문의창 닫기" onClick={handleInquiryClose}>
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
                            문의하기
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
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" fill="none">
                                        <path d="M16 28.5L24 36.5L41 16.5" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>

                                <strong>제출이 완료되었습니다</strong>
                            </div>

                            <button type="button" className="internie-landing-mobile-inquiry-success-button" onClick={handleInquiryClose}>
                                돌아가기
                            </button>
                        </div>
                    ) : (
                        <div className="internie-landing-mobile-inquiry-inner">
                            <div className="internie-landing-mobile-inquiry-card">
                                <header className="internie-landing-mobile-inquiry-header">
                                    <button type="button" className="internie-landing-mobile-inquiry-back" aria-label="랜딩페이지로 돌아가기" onClick={handleInquiryClose}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M15 6L9 12L15 18" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>

                                    <h1>문의하기</h1>
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