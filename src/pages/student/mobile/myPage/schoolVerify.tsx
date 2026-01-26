// src/pages/student/mobile/myPage/schoolVerify.tsx
// 재학생 인증 페이지 
import React from "react";
import { useNavigate } from "react-router-dom";
import { applyMyVerification, ApiError } from "../../../../api/client";
import "./schoolVerify.css";

type School = { id: string; name: string };
type Step = "SCHOOL_SEARCH" | "UPLOAD" | "DONE";

const MOCK_SCHOOLS: School[] = [
    { id: "1", name: "서울대학교" },
    { id: "2", name: "연세대학교" },
    { id: "3", name: "고려대학교" },
    { id: "4", name: "성균관대학교" },
    { id: "5", name: "한양대학교" },
    { id: "6", name: "중앙대학교" },
    { id: "7", name: "경희대학교" },
    { id: "8", name: "이화여자대학교" },
    { id: "9", name: "숭실대학교" },
    { id: "10", name: "숙명여자대학교" },
    { id: "11", name: "서강대학교" },
    { id: "12", name: "한국외국어대학교" },
    { id: "13", name: "국민대학교" },
    { id: "14", name: "동국대학교" },
    { id: "15", name: "명지대학교" },
    { id: "16", name: "광운대학교" },
    { id: "17", name: "서경대학교" },
    { id: "18", name: "삼육대학교" },
    { id: "19", name: "상명대학교" },
    { id: "20", name: "세종대학교" },
    { id: "21", name: "홍익대학교" },
    { id: "22", name: "단국대학교" },
    // TODO: 실제 API 연동 시 목록 제거/교체
];
export default function SchoolVerify() {
    const navigate = useNavigate();

    const [step, setStep] = React.useState<Step>("SCHOOL_SEARCH");

    // 학교 검색/선택
    const [query, setQuery] = React.useState("");
    const [selectedSchool, setSelectedSchool] = React.useState<School | null>(null);

    // 학생증 파일
    const [file, setFile] = React.useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string>("");

    // 제출 상태
    const [submitting, setSubmitting] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string>("");

    const filtered = React.useMemo(() => {
        const q = query.trim();
        if (!q) return [];
        return MOCK_SCHOOLS.filter((s) => s.name.includes(q)).slice(0, 10);
    }, [query]);

    const isDropdownOpen = query.trim() !== "" && !selectedSchool;

    function onClose() {
        navigate(-1);
    }

    function onPickSchool(s: School) {
        setSelectedSchool(s);
        setQuery(s.name);
    }

    function onNextFromSchool() {
        if (!selectedSchool) return;
        setStep("UPLOAD");
        setErrorMsg("");
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
            navigate(-1);
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
                    <span aria-hidden><img src="/x-01.svg" alt="" /></span>
                </button>
            </header>

            {step === "SCHOOL_SEARCH" && (
                <>
                <main className="sv-body">
                    <h1 className="sv-title">학교를 선택해주세요</h1>

                    <div className={`sv-searchWrap ${isDropdownOpen ? "is-open" : ""}`}>
                        <input
                            className="sv-input"
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
                            <img src={selectedSchool ? "/check-02.svg" : "/search-01.svg"} alt="" />
                        </span>
                        {isDropdownOpen && (
                            <div className="sv-dropdown" role="listbox" aria-label="검색 결과">
                                {filtered.map((s) => (
                                    <button
                                        type="button"
                                        key={s.id}
                                        className="sv-item"
                                        onClick={() => onPickSchool(s)}
                                    >
                                        <span>{s.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                <footer className="sv-footer">
                    <button
                        type="button"
                        className="sv-primary"
                        disabled={!selectedSchool}
                        onClick={onNextFromSchool}
                        >
                        다음
                    </button>
                </footer>
                </>
            )}

            {step === "UPLOAD" && (
                <>
                    <main className="sv-body">
                    <h1 className="sv-title">재학생 인증을 위한 학생증 사진이 필요해요</h1>

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
                            <input
                                type="file"
                                accept="image/*"
                                className="sv-fileInput"
                                onChange={onFileChange}
                            />
                        </label>

                        <label className="sv-primary sv-primary--alt sv-footerBtn">
                            학생증 촬영하기
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="sv-fileInput"
                                onChange={onFileChange}
                            />
                        </label>
                    </footer>
                </>
            )}

            {step === "DONE" && (
                <>
                <main className="sv-body sv-done">
                    <h1 className="sv-title">학생증이 등록되었어요!</h1>

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
                    <button type="button" className="sv-link" onClick={resetFile}>
                        사진 다시 선택하기
                    </button>
                    <button
                        type="button"
                        className="sv-primary"
                        disabled={!file || submitting}
                        onClick={onSubmit}
                    >
                        {submitting ? "제출 중..." : "제출하기"}
                    </button>
                </footer>
                </>
            )}
        </div>
    );
}