// src/pages/admin/desktop/ecaClient/settings/settings.tsx
import React from "react";
import "./settings.css";

export default function EcaAdminSettingsPage(): React.ReactElement {
    return (
        <div className="eca-settings-page">
            <section className="eca-settings-section">
                <div className="eca-settings-section-head">
                    <h1 className="eca-settings-page-title">설정</h1>
                    <p className="eca-settings-page-desc">대외활동 관리자 화면에서 사용할 기본 설정 영역입니다.</p>
                </div>
            </section>

            <section className="eca-settings-section">
                <div className="eca-settings-card">
                    <div className="eca-settings-card-head">
                        <h2 className="eca-settings-card-title">관리자 정보</h2>
                        <div className="eca-settings-card-sub">기본 프로필 및 표시 정보를 관리합니다.</div>
                    </div>

                    <div className="eca-settings-form-grid">
                        <div className="eca-settings-field">
                            <label className="eca-settings-label">이름</label>
                            <input className="eca-settings-input" type="text" placeholder="관리자 이름" />
                        </div>
                        <div className="eca-settings-field">
                            <label className="eca-settings-label">이메일</label>
                            <input className="eca-settings-input" type="email" placeholder="admin@example.com" />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}