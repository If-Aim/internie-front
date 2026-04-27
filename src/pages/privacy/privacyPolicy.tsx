import React from "react";
import "./privacyPolicy.css";

export default function PrivacyPolicy(): React.ReactElement {
    return (
        <div className="privacy-page">
            <main className="privacy-content">

                <h1 className="privacy-title">개인정보 처리방침</h1>

                <p className="privacy-intro">
                    aim(이하 “회사”)은 「개인정보 보호법」 등 관련 법령을 준수하며 개인정보를 안전하게 처리합니다.
                </p>

                {/* 1 */}
                <section>
                    <h2>1. 개인정보의 처리 목적 및 수집 항목</h2>

                    <h3>회원가입 및 서비스 이용</h3>
                    <ul>
                        <li>수집 항목: 이메일, 비밀번호, 이름, 프로필 정보 등</li>
                        <li>목적: 회원 식별, 서비스 제공</li>
                        <li>보유기간: 회원 탈퇴 시까지</li>
                    </ul>

                    <h3>활동 및 프로그램 관리</h3>
                    <ul>
                        <li>출석 정보, 참여 기록, 과제 제출 정보, 평가 데이터</li>
                        <li>목적: 활동 관리 및 평가</li>
                    </ul>

                    <h3>음성 기록 기능</h3>
                    <ul>
                        <li>수집 항목: 음성파일, 전사문, 기록 데이터</li>
                        <li>목적: 기록 저장, 요약, 리포트 생성</li>
                        <li>보유기간: 삭제 요청 시까지</li>
                    </ul>

                </section>

                {/* 2 */}
                <section>
                    <h2>2. 만 14세 미만 아동의 개인정보 처리</h2>
                    <p>
                        회사는 만 14세 미만 아동의 개인정보를 수집하지 않습니다.
                    </p>
                </section>

                {/* 3 */}
                <section>
                    <h2>3. 개인정보의 제3자 제공</h2>
                    <p>
                        사용자가 참여하는 기관(운영기관 등)에 한하여 프로그램 운영 목적 내에서 최소한의 정보가 제공될 수 있습니다.
                    </p>
                </section>

                {/* 4 */}
                <section>
                    <h2>4. 개인정보 처리 위탁</h2>
                    <ul>
                        <li>AWS: 서버 및 인프라 운영</li>
                        <li>OpenAI: 음성 처리 및 AI 기능</li>
                    </ul>
                </section>

                {/* 5 */}
                <section>
                    <h2>5. 개인정보 국외 이전</h2>
                    <p>
                        OpenAI 서비스를 통해 일부 데이터가 해외 서버에서 처리될 수 있습니다.
                    </p>
                </section>

                {/* 6 */}
                <section>
                    <h2>6. 개인정보 파기</h2>
                    <ul>
                        <li>전자 데이터: 복구 불가능한 방식으로 삭제</li>
                        <li>문서: 분쇄 또는 소각</li>
                    </ul>
                </section>

                {/* 7 */}
                <section>
                    <h2>7. 이용자의 권리</h2>
                    <ul>
                        <li>열람 / 수정 / 삭제 / 처리정지 요청 가능</li>
                        <li>회원탈퇴를 통한 데이터 삭제 가능</li>
                    </ul>
                </section>

                {/* 8 */}
                <section>
                    <h2>8. 개인정보 보호 조치</h2>
                    <ul>
                        <li>비밀번호 해시 저장</li>
                        <li>HTTPS 전송 암호화</li>
                        <li>접근 권한 관리</li>
                    </ul>
                </section>

                {/* 9 */}
                <section>
                    <h2>9. 쿠키 사용</h2>
                    <p>
                        로그인 유지 및 인증을 위해 쿠키를 사용합니다.
                    </p>
                </section>

                {/* 10 */}
                <section>
                    <h2>10. 자동화 처리</h2>
                    <p>
                        일부 평가 및 분석 기능은 자동화 처리되며 최종 판단은 사람의 검토를 거칩니다.
                    </p>
                </section>

                {/* 11 */}
                <section>
                    <h2>11. 문의</h2>
                    <p>
                        개인정보 관련 문의는 서비스 운영자에게 연락 바랍니다.
                    </p>
                </section>

                <div className="privacy-footer">
                    시행일: 2026년 4월 27일
                </div>

            </main>
        </div>
    );
}