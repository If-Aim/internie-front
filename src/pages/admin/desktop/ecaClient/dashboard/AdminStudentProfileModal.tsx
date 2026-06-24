import React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./AdminStudentProfileModal.css";

export type AdminStudentProfile = {
    name: string;
    nickname?: string | null;
    linkedinUrl?: string | null;
    profileImage?: string | null;
};

type AdminStudentProfileModalProps = {
    student: AdminStudentProfile | null;
    onClose: () => void;
};

const STUDENT_PROFILE_MODAL_T = "ecaAdmin.studentProfileModal";

function getSafeExternalUrl(value?: string | null): string {
    const trimmed = value?.trim() ?? "";

    if (!trimmed) return "";

    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
        const url = new URL(normalized);

        if (url.protocol !== "http:" && url.protocol !== "https:") return "";

        return url.toString();
    } catch {
        return "";
    }
}

function getNicknameLabel(student: AdminStudentProfile): string {
    const name = student.name.trim();
    const nickname = student.nickname?.trim() ?? "";

    if (!nickname || nickname === name) return "";

    return nickname;
}

export default function AdminStudentProfileModal({ student, onClose }: AdminStudentProfileModalProps): React.ReactElement | null {
    const { t } = useTranslation();

    if (!student) return null;

    const nickname = getNicknameLabel(student);
    const linkedinUrl = getSafeExternalUrl(student.linkedinUrl);

    function openLinkedin(): void {
        if (!linkedinUrl) return;

        const popup = window.open(linkedinUrl, "_blank", "noopener,noreferrer");

        if (popup) {
            popup.opener = null;
        }
    }

    return createPortal(
        <div className="eca-admin-profile-modal-backdrop" onMouseDown={onClose}>
            <section className="eca-admin-profile-modal" onMouseDown={(event) => event.stopPropagation()}>
                <button type="button" className="eca-admin-profile-modal-close" onClick={onClose} aria-label={t(`${STUDENT_PROFILE_MODAL_T}.close`)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M18 18L6 6" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </button>

                <span className="eca-admin-profile-modal-avatar">
                    {student.profileImage ? (
                        <img
                            src={student.profileImage}
                            alt=""
                            onError={(event) => {
                                event.currentTarget.style.display = "none";
                            }}
                        />
                    ) : null}
                </span>

                <strong>{student.name || t(`${STUDENT_PROFILE_MODAL_T}.noName`)}</strong>

                {nickname ? (
                    <p>{nickname}</p>
                ) : (
                    <p className="is-empty">{t(`${STUDENT_PROFILE_MODAL_T}.noNickname`)}</p>
                )}

                <button type="button" className="eca-admin-profile-modal-linkedin" onClick={openLinkedin} disabled={!linkedinUrl}>
                    {linkedinUrl ? t(`${STUDENT_PROFILE_MODAL_T}.goToLinkedin`) : t(`${STUDENT_PROFILE_MODAL_T}.noLinkedin`)}
                </button>
            </section>
        </div>,
        document.body
    );
}