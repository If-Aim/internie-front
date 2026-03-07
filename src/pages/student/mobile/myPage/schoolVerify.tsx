// src/pages/student/mobile/myPage/schoolVerify.tsx
// 재학생 인증 페이지 
import React from "react";
import { useNavigate } from "react-router-dom";
import { applyMyVerification, searchSchools, selectMySchool, ApiError, type UserSchool } from "../../../../api/client";
import "./schoolVerify.css";

type Step = "SCHOOL_SEARCH" | "UPLOAD" | "DONE" | "SUBMITTED";

export default function SchoolVerify() {
    const navigate = useNavigate();

    const [step, setStep] = React.useState<Step>("SCHOOL_SEARCH");

    // 학교 검색/선택
    const [query, setQuery] = React.useState("");
    const [selectedSchool, setSelectedSchool] = React.useState<UserSchool | null>(null);
    const [schools, setSchools] = React.useState<UserSchool[]>([]);
    const [searching, setSearching] = React.useState(false);

    // 학생증 파일
    const [file, setFile] = React.useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string>("");

    // 제출 상태
    const [submitting, setSubmitting] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string>("");

    const isDropdownOpen = query.trim() !== "" && !selectedSchool && (schools.length > 0 || searching);

    function onClose() { navigate("/student/mypage"); }

    function onPickSchool(s: UserSchool) {
        setSelectedSchool(s);
        setQuery(s.name);
        setSchools([]);
    }

    async function onNextFromSchool() {
        if (!selectedSchool) return;

        setSubmitting(true);
        setErrorMsg("");

        try {
            await selectMySchool({ schoolId: selectedSchool.id });
            setStep("UPLOAD");
        } catch (e) {
            if (e instanceof ApiError) {
                const msg =
                    e.status === 404
                        ? "찾을 수 없는 학교입니다."
                        : e.status === 400
                        ? "학교 정보가 올바르지 않습니다."
                        : "학교 선택에 실패했습니다.";
                setErrorMsg(msg);
            } else {
                setErrorMsg("학교 선택에 실패했습니다.");
            }
        } finally {
            setSubmitting(false);
        }
        }

    function resetFile() {
        setFile(null);
        setPreviewUrl("");
        setErrorMsg("");
        setStep("UPLOAD");
    }

    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0] ?? null;
        if (!f) return;

        if (!f.type.startsWith("image/")) {
            setErrorMsg("이미지 파일만 업로드할 수 있습니다.");
            return;
        }
        setErrorMsg("");
        setFile(f);
        setStep("DONE");
        e.currentTarget.value = "";
    }
    React.useEffect(() => {
        const q = query.trim();
        if (selectedSchool) return;

        if (!q) {
            setSchools([]);
            setSearching(false);
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            setSearching(true);
            setErrorMsg("");

            try {
                const res = await searchSchools(q);
                if (cancelled) return;
                setSchools(res.slice(0, 10));
            } catch (e) {
                if (cancelled) return;
                if (e instanceof ApiError) {
                    setErrorMsg(e.status === 400 ? "검색어를 입력해주세요." : "학교 검색에 실패했습니다.");
                } else {
                    setErrorMsg("학교 검색에 실패했습니다.");
                }
                setSchools([]);
            } finally {
                if (!cancelled) setSearching(false);
            }
        }, 250);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [query, selectedSchool]);

    React.useEffect(() => {
        if (!file) {
            setPreviewUrl("");
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    async function onSubmit() {
        if (!file) return;
        setSubmitting(true);
        setErrorMsg("");

        try {
            await applyMyVerification(file); 
            setStep("SUBMITTED");
        } catch (e) {
            if (e instanceof ApiError) {
                const msg = e.bodyText?.includes("이미 승인된 사용자")
                    ? "이미 승인된 사용자입니다."
                    : e.bodyText?.includes("사용자를 찾을 수 없습니다")
                    ? "사용자를 찾을 수 없습니다."
                    : "업로드에 실패했습니다. 다시 시도해주세요.";
                setErrorMsg(msg);
            } else {
                setErrorMsg("업로드에 실패했습니다. 다시 시도해주세요.");
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="sv-screen">
            <header className="sv-header">
                <button type="button" className="sv-close" aria-label="닫기" onClick={onClose}>
                    <span aria-hidden><img src="/icons/x-01.svg" alt="" /></span>
                </button>
            </header>

            {step === "SCHOOL_SEARCH" && (
                <>
                <main className="sv-body">
                    <h1 className="sv-title">학교를 선택해주세요</h1>

                    <div className={`sv-searchWrap ${isDropdownOpen ? "is-open" : ""}`}>
                        <input
                            className={`sv-input ${query ? "has-value" : ""}`}
                            value={query}
                            placeholder=""
                            inputMode="search"
                            aria-label="학교 검색"
                            onFocus={() => {
                                if (selectedSchool) {
                                    setSelectedSchool(null);
                                    setQuery("");
                                }
                            }}
                            onChange={(e) => {
                                setQuery(e.target.value);
                            }}
                        />
                        <span className={`sv-rightIcon ${selectedSchool ? "is-check" : "is-search"}`} aria-hidden>
                            <img src={selectedSchool ? "/icons/check-02.svg" : "/icons/search-01.svg"} alt="" />
                        </span>
                        {isDropdownOpen && (
                            <div className="sv-dropdown" role="listbox" aria-label="검색 결과">
                                {searching && <div className="sv-item" aria-disabled>검색 중...</div>}
                                {!searching && schools.length === 0 && <div className="sv-item" aria-disabled>검색 결과가 없습니다.</div>}

                                {schools.map((s) => (
                                <button type="button" key={s.id} className="sv-item" onClick={() => onPickSchool(s)} >
                                    <span>{s.name}</span>
                                </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                </main>

                <footer className="sv-footer">
                    <button type="button" className="sv-primary" disabled={!selectedSchool || submitting} onClick={onNextFromSchool} >
                        {submitting ? "저장 중..." : "다음"}
                    </button>
                </footer>
                </>
            )}

            {step === "UPLOAD" && (
                <>
                    <main className="sv-body sv-upload">
                        <h1 className="sv-title">재학생 인증을 위한<br />학생증 사진이 필요해요</h1>

                        <div className="sv-cardPreview">
                            {previewUrl ? (
                            <img className="sv-previewImg" src={previewUrl} alt="" />
                            ) : (
                            <img className="sv-previewGuide" src="/studentcard_guide.png" alt="학생증 촬영 가이드" />
                            )}
                        </div>

                        {errorMsg && <div className="sv-error">{errorMsg}</div>}
                    </main>

                    <footer className="sv-footer sv-footer--upload">
                        <label className="sv-secondary sv-footerBtn">
                            사진 선택하기
                            <input type="file" accept="image/*" className="sv-fileInput" onChange={onFileChange} />
                        </label>

                        <label className="sv-primary sv-primary--alt sv-footerBtn">
                            학생증 촬영하기
                            <input type="file" accept="image/*" capture="environment" className="sv-fileInput" onChange={onFileChange} />
                        </label>
                    </footer>
                </>
            )}

            {step === "DONE" && (
                <>
                <main className="sv-body sv-done">
                    <h1 className="sv-title">학생증 업로드 완료!</h1>

                    <div className="sv-doneBox">
                        {previewUrl ? (
                            <img className="sv-doneImg" src={previewUrl} alt="업로드된 학생증 사진"/>
                        ) : (
                            <div className="sv-doneCard">(학생증 사진)</div>
                        )}
                    </div>
                    <div className="sv-hint">
                        재학생 인증까지<br/>약 1주일 정도 소요될 수 있어요.
                    </div>
                </main>

                <footer className="sv-footer">
                    <button type="button" className="sv-secondary sv-footerBtn" onClick={resetFile}>
                        사진 다시 선택하기
                    </button>
                    <button type="button" className="sv-primary sv-primary--alt sv-footerBtn" disabled={!file || submitting} onClick={onSubmit} >
                        {submitting ? "제출 중..." : "제출하기"}
                    </button>
                </footer>
                </>
            )}

            {step === "SUBMITTED" && (
                <main className="sv-submitted" role="status" aria-live="polite">
                    <div className="sv-submittedCenter">
                        <div className="sv-checkCircle" aria-hidden><img src="/icons/check-02.svg" alt="" /></div>
                        <h1 className="sv-submittedTitle">제출완료!</h1>
                    </div>
                </main>
            )}
        </div>
    );
}