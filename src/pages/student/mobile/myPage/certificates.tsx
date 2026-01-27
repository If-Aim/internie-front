import React from "react";
import { useNavigate } from "react-router-dom";
import "./certificates.css";

type CertItem = { // TODO:추후 API 참고 후 변경
  id: string;
  filename: string;
  createdAt: string; // "2026-01-19"
  fileUrl?: string;  // 다운로드 URL (있으면 실제 다운로드)
};

function formatDateDot(iso: string) {
  // "2026-01-19" -> "2026.01.19."
  const [y, m, d] = iso.split("-");
  return `${y}.${m}.${d}.`;
}

const mockCertificates: CertItem[] = [
  { id: "1", filename: "썬데이나마...pdf", createdAt: "2026-01-19", fileUrl: "" },
  { id: "2", filename: "썬데이나마...pdf", createdAt: "2026-01-19", fileUrl: "" },
  { id: "3", filename: "썬데이나마...pdf", createdAt: "2026-01-19", fileUrl: "" },
];

export default function Certificates() {
  const navigate = useNavigate();
  const [items, setItems] = React.useState<CertItem[]>(mockCertificates);

  const handleClose = () => {
    navigate(-1); // 또는 navigate("/student/mypage") 등
  };

  const handleDownload = (item: CertItem) => {
    if (item.fileUrl) {
      window.open(item.fileUrl, "_blank", "noopener,noreferrer");
      return;
    }
    alert("서비스 준비중입니다."); // TODO: API 연결 후 삭제
  };

  const handleDelete = (id: string) => {
    const ok = window.confirm("해당 수료증을 삭제할까요?");
    if (!ok) return;
    setItems(prev => prev.filter(x => x.id !== id));
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
                  onClick={() => handleDownload(item)}
                >
                  <img src="/download-02.svg" alt="" />
                </button>

                <button type="button" className="cert-s-icon-btn" aria-label="삭제" onClick={() => handleDelete(item.id)} >
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