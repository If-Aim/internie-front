import React from "react";
import { useNavigate } from "react-router-dom";
import "./certificates.css";
import { ApiError, type AdminUserFile, getMyAdminFiles, getMyAdminFileDownloadUrl } from "../../../../api/client";

export default function Certificates() {
  const navigate = useNavigate();

  const [items, setItems] = React.useState<AdminUserFile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [downloadingId, setDownloadingId] = React.useState<number | null>(null);

  const handleClose = () => {
    navigate(-1);
  };

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const list = await getMyAdminFiles();
        if (!mounted) return;

        setItems(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!mounted) return;

        if (e instanceof ApiError && e.status === 404) {
          setItems([]);
          setErrorMsg(null);
          return;
        }

        setErrorMsg("수료증 목록을 불러오지 못했습니다.");
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleDownload = async (fileId: number) => {
    if (downloadingId != null) return;

    setDownloadingId(fileId);
    try {
      const url = await getMyAdminFileDownloadUrl(fileId);

      window.open(url, "_blank", "noreferrer");

    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 404) {
          alert("발급된 수료증이 없습니다.");
          return;
        }
        alert(e.bodyText ? `다운로드 실패: ${e.bodyText}` : "다운로드에 실패했습니다.");
      } else {
        alert("다운로드에 실패했습니다.");
      }
      console.error(e);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = () => {
    alert("서비스 준비중입니다.");
  };

  return (
    <div className="cert-s-page">
      <header className="cert-s-header">
        <div className="cert-s-header-left" />
        <div className="cert-s-header-title">수료증</div>
        <button
          type="button"
          className="cert-s-header-close"
          aria-label="닫기"
          onClick={handleClose}
        >
          <img src="/x-01.svg" alt="" />
        </button>
      </header>

      <main className="cert-s-body">
        {loading ? (
          <div className="cert-s-empty">불러오는 중…</div>
        ) : errorMsg ? (
          <div className="cert-s-empty">{errorMsg}</div>
        ) : items.length === 0 ? (
          <div className="cert-s-empty">발급된 수료증이 없습니다.</div>
        ) : (
          <div className="cert-s-list">
            {items.map((item) => (
              <div key={item.fileId} className="cert-s-card">
                <div className="cert-s-thumb" aria-hidden="true" />

                <div className="cert-s-info">
                  <div className="cert-s-name" title={item.filename}>
                    {item.filename}
                  </div>

                  <div className="cert-s-date" aria-hidden="true">
                    {/* TODO:날짜 표시 */}
                  </div>
                </div>

                <div className="cert-s-actions">
                  <button type="button" className="cert-s-icon-btn" aria-label="다운로드" onClick={() => void handleDownload(item.fileId)} disabled={downloadingId === item.fileId} >
                    <img src="/download-02.svg" alt="" />
                  </button>
                  <button type="button" className="cert-s-icon-btn" aria-label="삭제" onClick={handleDelete} > 
                    <img src="/trash-02.svg" alt="" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}