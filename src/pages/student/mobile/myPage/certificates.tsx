import React from "react";
import { useNavigate } from "react-router-dom";
import "./certificates.css";
// import { ApiError } from "../../../../api/client";

type CertItem = { 
  id: string;
  filename: string;
  createdAt: string;
};

function formatDateDot(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${y}.${m}.${d}.`;
}

const mockCertificates: CertItem[] = [
  { id: "admin-file", filename: "관리자 업로드 파일", createdAt: "2026-01-19" },
];

export default function Certificates() {
  const navigate = useNavigate();
  const [items] = React.useState<CertItem[]>(mockCertificates);
  const [downloading, setDownloading] = React.useState(false);

  const handleClose = () => {
    navigate(-1); // 또는 navigate("/student/mypage") 등
  };

  const handleDownload = () => {
    if (downloading) return;

    setDownloading(true);
    try {
      console.log("[cert] click (navigate) /users/me/admin-file");

      window.location.href = `${import.meta.env.VITE_API_BASE_URL}/users/me/admin-file`;
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  const handleDelete = (/*id: string*/) => { // 백엔드 삭제 API 미구현
    alert("서비스 준비중입니다.");
  };

  return (
    <div className="cert-s-page">
      <header className="cert-s-header">
        <div className="cert-s-header-left" />
        <div className="cert-s-header-title">수료증</div>
        <button type="button" className="cert-s-header-close" aria-label="닫기" onClick={handleClose}>
          <img src="/x-01.svg" alt="" />
        </button>
      </header>

      <main className="cert-s-body">
        <div className="cert-s-list">
          {items.map(item => (
            <div key={item.id} className="cert-s-card">
              <div className="cert-s-thumb" aria-hidden="true" />

              <div className="cert-s-info">
                <div className="cert-s-name" title={item.filename}>
                  {item.filename}
                </div>
                <div className="cert-s-date">{formatDateDot(item.createdAt)}</div>
              </div>

              <div className="cert-s-actions">
                <button
                  type="button"
                  className="cert-s-icon-btn"
                  aria-label="다운로드"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  <img src="/download-02.svg" alt="" />
                </button>

                <button type="button" className="cert-s-icon-btn" aria-label="삭제" onClick={handleDelete} >
                  <img src="/trash-02.svg" alt="" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}