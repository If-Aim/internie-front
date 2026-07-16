import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import SeoMeta from "../../utils/SeoMetadata";

import "./opening.css";

type OpeningCardProps = {
    title: string;
    descriptionLine1: string;
    descriptionLine2: string;
    language?: "ko" | "en";
    onClick: () => void;
};

function OpeningArrow(): React.ReactElement {
    return (
        <svg className="internie-opening-card-arrow" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M12 7L21 16L12 25" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function OpeningCard({
    title,
    descriptionLine1,
    descriptionLine2,
    language = "ko",
    onClick
}: OpeningCardProps): React.ReactElement {
    return (
        <button type="button" className="internie-opening-card" lang={language} onClick={onClick}>
            <strong>{title}</strong>

            <span className="internie-opening-card-description">
                <span>{descriptionLine1}</span>
                <span>{descriptionLine2}</span>
            </span>

            <OpeningArrow />
        </button>
    );
}

export default function Opening(): React.ReactElement {
    const navigate = useNavigate();
    const { i18n } = useTranslation();

    const navigateToLanding = async (language: "ko" | "en", path: string) => {
        await i18n.changeLanguage(language);
        navigate(path);
    };

    return (
        <>
            <SeoMeta
                title="인터니 | 실무 미션 기반 인재 검증 플랫폼"
                description="이력서만으로 알 수 없는 실력을 실제 미션 수행 과정과 결과 데이터로 확인하세요."
                lang="ko"
                canonical="https://www.internie.com/"
            />

            <div className="internie-opening">
                <header className="internie-opening-header">
                    <button type="button" className="internie-opening-logo" onClick={() => navigate("/")}>
                        internie
                    </button>
                </header>

                <main className="internie-opening-main">
                    <section className="internie-opening-intro">
                        <h1>
                            <span>이력서는 추론입니다,</span>
                            <span>인터니는 <strong>‘증거’</strong>입니다</span>
                        </h1>

                        <p>
                            <span>기업은 실무 미션을 등록하고, 학생들은 실시간으로 수행합니다.</span>
                            <span>수행 과정과 결과가 모두 데이터로 남아, 진짜 실력을 검증합니다.</span>
                        </p>
                    </section>

                    <section className="internie-opening-card-grid" aria-label="인터니 사용자 유형 선택">
                        <OpeningCard
                            title="학생이신가요?"
                            descriptionLine1="인터니 프로젝트를 탐색하고"
                            descriptionLine2="기업과 매칭해요"
                            onClick={() => navigate("/login")}
                        />

                        <OpeningCard
                            title="기업이신가요?"
                            descriptionLine1="필요한 인재를 발견하고"
                            descriptionLine2="채용까지 진행해요"
                            onClick={() => void navigateToLanding("ko", "/company")}
                        />

                        <OpeningCard
                            title="Foreigner?"
                            descriptionLine1="Discover the talent you need for"
                            descriptionLine2="Korea GTM and proceed with hiring"
                            language="en"
                            onClick={() => void navigateToLanding("en", "/global")}
                        />
                    </section>

                    <div className="internie-opening-login">
                        <span>이미 계정이 있으신가요?</span>

                        <button type="button" onClick={() => navigate("/login")}>
                            로그인
                        </button>
                    </div>
                </main>

                <footer className="internie-opening-footer">
                    <div className="internie-opening-footer-inner">
                        <div className="internie-opening-footer-brand">
                            <div className="internie-opening-footer-logo">
                                <strong>인터니</strong>
                                <span>internie</span>
                            </div>

                            <p>
                                이력서로 알 수 없는 실력을,<br />
                                미션 수행 데이터로 증명합니다.<br />
                                by aim
                            </p>
                        </div>

                        <div className="internie-opening-footer-column">
                            <strong>바로가기</strong>

                            <nav className="internie-opening-footer-links" aria-label="오프닝 페이지 바로가기">
                                <button type="button" onClick={() => navigate("/")}>홈</button>
                                <button type="button" onClick={() => void navigateToLanding("ko", "/company")}>서비스 소개</button>
                                <a href="https://blog.naver.com/pur1star" target="_blank" rel="noopener noreferrer">블로그</a>
                                <button type="button" onClick={() => void navigateToLanding("ko", "/company")}>FAQ</button>
                            </nav>
                        </div>

                        <div className="internie-opening-footer-column">
                            <strong>사업자 정보</strong>

                            <p>
                                상호 aim (에임) · 대표 김유진
                            </p>

                            <span>purieu.k@gmail.com</span>
                        </div>
                    </div>

                    <div className="internie-opening-footer-copyright">
                        © 2026 aim. All rights reserved.
                    </div>
                </footer>
            </div>
        </>
    );
}