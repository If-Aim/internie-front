// src/pages/admin/desktop/upload/certificates.tsx
// 수료증 업로드 화면 (탭)
import React from "react";
import { ApiError, type AdminUser, getAdminUsers, uploadAdminUserFile } from "../../../../api/client";
import "./certificates.css";

function displaySchoolOrNickname(u: AdminUser) {
  return (u.nickname ?? "").trim() || "-";
}

export default function AdminCertificatesPage(): React.ReactElement {
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [uploadedUrlMap, setUploadedUrlMap] = React.useState<Record<number, string>>({});

  const [uploading, setUploading] = React.useState(false);

  const selectedUser = React.useMemo(
    () => users.find((u) => u.userId === selectedId) ?? null,
    [users, selectedId]
  );

  const completedCount = React.useMemo(() => {
    return users.filter((u) => uploadedUrlMap[u.userId]).length;
  }, [users, uploadedUrlMap]);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const list = await getAdminUsers();
        if (!mounted) return;

        setUsers(list);
        setSelectedId((prev) =>
          prev && list.some((u) => u.userId === prev) ? prev : list[0]?.userId ?? null
        );
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          setErrorMsg("관리자 권한이 필요합니다.");
          return;
        }
        setErrorMsg("사용자 목록을 불러오지 못했습니다.");
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const openFilePicker = () => {
    if (!selectedUser) return;
    fileRef.current?.click();
  };

  const handleFileSelected = async (file: File) => {
    if (!selectedUser) return;

    setUploading(true);
    try {
      const uploadedUrl = await uploadAdminUserFile(selectedUser.userId, file);

      setUploadedUrlMap((prev) => ({ ...prev, [selectedUser.userId]: uploadedUrl }));
      alert("수료증 업로드가 완료되었습니다.");
    } catch (e) {
      if (e instanceof ApiError) {
        alert(e.bodyText ? `업로드 실패: ${e.bodyText}` : "업로드에 실패했습니다.");
      } else {
        alert("업로드에 실패했습니다.");
      }
      console.error(e);
    } finally {
      setUploading(false);
      // 같은 파일 재선택 가능
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="cert-grid">
      {/* 목록 */}
      <section className="cert-left">
        <div className="cert-left-header">
          <div className="cert-title" />
          <div className="cert-count">
            <span className="cert-count-blue">{completedCount}명</span>/{users.length}명
          </div>
        </div>

        <div className="cert-list">
          {loading ? (
            <p className="cert-loading">불러오는 중…</p>
          ) : errorMsg ? (
            <p className="cert-error">{errorMsg}</p>
          ) : users.length === 0 ? (
            <p className="cert-empty">등록된 사용자가 없습니다.</p>
          ) : (
            users.map((u, idx) => {
              const isSelected = u.userId === selectedId;
              const done = !!uploadedUrlMap[u.userId];

              return (
                <button
                  key={u.userId}
                  type="button"
                  className={isSelected ? "cert-row cert-row--selected" : "cert-row"}
                  onClick={() => setSelectedId(u.userId)}
                >
                  <span className="cert-index">{idx + 1}</span>
                  <span className="cert-name">{u.name}</span>
                  <span className="cert-school">{displaySchoolOrNickname(u)}</span>

                  {done ? <span className="cert-done">완료</span> : <span className="cert-done cert-done--empty" />}

                  <span className="cert-chevron"><img src="/chevron-right.svg" alt="admin avatar" /></span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* 업로드 영역 */}
      <section className="cert-right">
        <div className="cert-upload-card">
          <button
            type="button"
            className="cert-upload-btn"
            onClick={openFilePicker}
            disabled={!selectedUser || uploading}
          >
            <span className="cert-upload-icon"><img src="/upload-03.svg" alt="admin avatar" /></span>
            <span>{uploading ? "업로드 중..." : "업로드 하기"}</span>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFileSelected(f);
            }}
          />

          {!selectedUser && (
            <p className="cert-upload-hint">목록에서 사용자를 선택해주세요.</p>
          )}

          {selectedUser && uploadedUrlMap[selectedUser.userId] && (
            <p className="cert-upload-hint cert-upload-hint--ok">
              해당 사용자는 수료증 업로드가 완료되었습니다.
              <a href={uploadedUrlMap[selectedUser.userId]} target="_blank" rel="noreferrer">파일 보기</a>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}