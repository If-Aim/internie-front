// src/pages/admin/desktop/ecaClient/home/home.tsx
import React from "react";
import "./home.css";

export default function EcaAdminHomePage(): React.ReactElement {
    return (
        <div className="eca-home-page">
            <section className="eca-home-hero">
                <div className="eca-home-hero-text">
                    <div className="eca-home-eyebrow">ECA ADMIN</div>
                    <h1 className="eca-home-title">대외활동 관리자 홈</h1>
                    <p className="eca-home-desc">
                        참가자 현황, 활동 진행 상태, 주요 공지를 한눈에 확인할 수 있는 관리자 홈 화면입니다.
                    </p>
                </div>
            </section>

        </div>
    );
}