// src/pages/admin/desktop/upload/certificates.tsx
// 수료증 업로드 화면 (탭)
import React from "react";
import { ApiError, type AdminUser, getAdminUsers, uploadAdminUserFile, getAdminUserFiles, deleteAdminUserFile, type AdminUserFile } from "../../../../api/client";
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
  
  const [userFilesMap, setUserFilesMap] = React.useState<Record<number, AdminUserFile[]>>({});
  const [filesLoading, setFilesLoading] = React.useState(false);

  const [uploading, setUploading] = React.useState(false);
  
  const selectedUser = React.useMemo(
    () => users.find((u) => u.userId === selectedId) ?? null,
    [users, selectedId]
  );
  
  const selectedUserFiles = React.useMemo(() => {
    if (!selectedUser) return [];
    return userFilesMap[selectedUser.userId] ?? [];
  }, [selectedUser, userFilesMap]);
  const hasFiles = selectedUserFiles.length > 0;

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

  React.useEffect(() => {
    if (!selectedUser) return;

    let mounted = true;

    (async () => {
      try {
        setFilesLoading(true);

        const files = await getAdminUserFiles(selectedUser.userId);
        if (!mounted) return;

        setUserFilesMap((prev) => ({ ...prev, [selectedUser.userId]: files }));
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          alert("관리자 권한이 필요합니다.");
          return;
        }
        console.error(e);
      } finally {
        if (mounted) setFilesLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedUser]);

  const openFilePicker = () => {
    if (!selectedUser) return;
    fileRef.current?.click();
  };

  const handleFileSelected = async (file: File) => {
    if (!selectedUser) return;

    setUploading(true);
    try {
      const files = await uploadAdminUserFile(selectedUser.userId, file);

      setUserFilesMap((prev) => ({ ...prev, [selectedUser.userId]: files }));
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

  const handleDeleteFile = async (fileId: number) => {
  if (!selectedUser) return;

  const ok = window.confirm("해당 파일을 삭제하시겠습니까?");
  if (!ok) return;

  try {
    const nextFiles = await deleteAdminUserFile(selectedUser.userId, fileId);
    setUserFilesMap((prev) => ({ ...prev, [selectedUser.userId]: nextFiles }));
  } catch (e) {
    if (e instanceof ApiError) {
      alert(e.bodyText ? `삭제 실패: ${e.bodyText}` : "삭제에 실패했습니다.");
    } else {
      alert("삭제에 실패했습니다.");
    }
    console.error(e);
  }
};

  return (
    <div className="admin-grid">
      {/* 목록 */}
      <section className="admin-col admin-col--left">
        <div className="admin-section-head"> 
          <div className="admin-section-title">수료증 업로드 현황</div>

        </div>

        <div className="admin-list">
          {loading ? (
            <p className="loading">불러오는 중…</p>
          ) : errorMsg ? (
            <p className="error">{errorMsg}</p>
          ) : users.length === 0 ? (
            <p className="empty">등록된 사용자가 없습니다.</p>
          ) : (
            users.map((u, idx) => {
              const isSelected = u.userId === selectedId;
              const files = userFilesMap[u.userId] ?? [];
              const done = files.length > 0;

              return (
                <button
                  key={u.userId}
                  type="button"
                  className={isSelected ? "admin-list-item admin-list-item--selected" : "admin-list-item"}
                  onClick={() => setSelectedId(u.userId)}
                >
                  <span className="admin-badge">{idx + 1}</span>
                  <span className="admin-user-name">{u.name}</span>
                  <span className="admin-user-school">{displaySchoolOrNickname(u)}</span>

                  <span className="admin-cert-status">{done ? <span className="cert-done">완료</span> : <span className="cert-done cert-done--empty" />}</span>

                  <span className="admin-chevron"><img src="/chevron-right.svg" alt="admin avatar" /></span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* 업로드 영역 */}
      <section className="admin-col admin-col--right">
        <div className="cert-upload-card">
          <div className="cert-files-area">
            {!selectedUser && (
              <p className="cert-upload-hint">목록에서 사용자를 선택해주세요.</p>
            )}

            {selectedUser && hasFiles &&(
              <>
                {filesLoading ? (
                  <p className="cert-upload-hint">파일 목록 불러오는 중…</p>
                ) : (
                  <div className="cert-files-area">
                    <ul className="cert-file-list">
                      {selectedUserFiles.map((f) => (
                        <li key={f.fileId} className="cert-file-item">
                          <div className="cert-file-left">
                            <div className="cert-file-name" title={f.filename}>
                              {f.filename}
                            </div>
                            <div className="cert-file-date" />
                          </div>

                          <button
                            type="button"
                            className="cert-trash-btn"
                            onClick={() => void handleDeleteFile(f.fileId)}
                            aria-label="수료증 삭제"
                            title="삭제"
                          >
                            <img src="/trash-02.svg" alt="" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            {selectedUser && !hasFiles && (
              <div className="cert-center">
                {filesLoading ? (
                  <p className="cert-upload-hint">파일 목록 불러오는 중…</p>
                ) : (
                  <button
                    type="button"
                    className="cert-upload-btn"
                    onClick={openFilePicker}
                    disabled={uploading}
                  >
                    <span className="cert-upload-icon"><img src="/upload-03.svg" alt="" /></span>
                    <span>{uploading ? "업로드 중..." : "업로드 하기"}</span>
                  </button>
                )}
              </div>
            )}
          </div>
          {selectedUser && hasFiles && (
            <div className="cert-upload-footer">
              <button type="button" className="cert-upload-btn" onClick={openFilePicker} disabled={uploading} >
                <span className="cert-upload-icon"><img src="/upload-03.svg" alt="" /></span>
                <span>{uploading ? "업로드 중..." : "업로드 하기"}</span>
              </button>
            </div>
          )}
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
        </div>
      </section>
    </div>
  );
}