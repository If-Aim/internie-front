import React from "react";
import { useNavigate } from "react-router-dom";
import "./certificates.css";
import { ApiError, type AdminUserFile, getMyAdminFiles, getMyAdminFileDownloadUrl } from "../../../../api/client";

import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min?url";
import { useTranslation } from "react-i18next";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

async function renderPdfFirstPageThumbnail(
	signedUrl: string,
	width = 60 // 썸네일 가로 크기
): Promise<string> {
	const res = await fetch(signedUrl);
	const arrayBuffer = await res.arrayBuffer();

	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

	const page = await pdf.getPage(1);

	const viewport = page.getViewport({ scale: 1 });
	const scale = width / viewport.width;
	const scaledViewport = page.getViewport({ scale });

	const canvas = document.createElement("canvas");
	canvas.width = scaledViewport.width;
	canvas.height = scaledViewport.height;

	await page.render({
		canvas,
		viewport: scaledViewport,
	}).promise;

	return canvas.toDataURL("image/png");
}


export default function Certificates() {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const [items, setItems] = React.useState<AdminUserFile[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

	const [downloadingId, setDownloadingId] = React.useState<number | null>(null);
	const [previewMap, setPreviewMap] = React.useState<Record<number, string>>({});

	function getFileType(filename: string) {
		const ext = filename.split(".").pop()?.toLowerCase();
		if (ext === "jpg" || ext === "jpeg" || ext === "png") return "image";
		if (ext === "pdf") return "pdf";
		return "other";
	}

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
				setErrorMsg(t("error.failGetMyCerts"));
				console.error(e);
			} finally {
				if (mounted) setLoading(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, []);

	// 수료증 미리보기
	React.useEffect(() => {
		if (items.length === 0) return;
		let cancelled = false;
		(async () => {
			try {
				const results = await Promise.all(
					items.map(async (item) => {
						try {
							const signedUrl = await getMyAdminFileDownloadUrl(item.fileId);
							const type = getFileType(item.filename);
							if (type === "image") {
								const res = await fetch(signedUrl);
								const blob = await res.blob();
								const objectUrl = URL.createObjectURL(blob);
								return { fileId: item.fileId, previewUrl: objectUrl };
							}

							// PDF → 첫 페이지 썸네일
							if (type === "pdf") {
								const dataUrl = await renderPdfFirstPageThumbnail(signedUrl);
								return { fileId: item.fileId, previewUrl: dataUrl };
							}
							return null;
						} catch {
							return null; 
						}
					})
				);

				if (cancelled) {
					results.forEach((r) => {
						if (r?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(r.previewUrl);
					});
					return;
				}

				setPreviewMap((prev) => {
					const next = { ...prev };
					results.forEach((r) => {
						if (r) next[r.fileId] = r.previewUrl;
					});
					return next;
				});
			} catch (e) {
				console.error("전체 미리보기 로딩 실패", e);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [items]);

	React.useEffect(() => {
		return () => {
			Object.values(previewMap).forEach((url) => {
				if (url.startsWith("blob:")) URL.revokeObjectURL(url);
			});
		};
	}, [previewMap]);
	const handleDownload = async (fileId: number) => {
		if (downloadingId != null) return;

		setDownloadingId(fileId);
		try {
			const signedUrl = await getMyAdminFileDownloadUrl(fileId);
			const res = await fetch(signedUrl, { method: "GET" });
			if (!res.ok) {
				const text = await res.text().catch(() => "");
				throw new ApiError(res.status, t("error.failToDownload"), text);
			}
			const blob = await res.blob();
			const objectUrl = URL.createObjectURL(blob);
			
			window.open(objectUrl, "_blank", "noreferrer");

			setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
		} catch (e) {
			if (e instanceof ApiError) {
				if (e.status === 404) {
					alert(t("mypage.noCerts"));
					return;
				}
				alert(e.bodyText ? `다운로드 실패: ${e.bodyText}` : t("error.failToDownload"));
			} else {
				alert(t("error.failToDownload"));
			}
			console.error(e);
		} finally {
			setDownloadingId(null);
		}
	};

	return (
		<div className="cert-s-page">
			<header className="cert-s-header">
				<div className="cert-s-header-left" />
				<div className="cert-s-header-title">{t("mypage.certs")}</div>
				<button type="button" className="cert-s-header-close" aria-label="닫기" onClick={handleClose}>
					<img src="/icons/x-01.svg" alt="" />
				</button>
			</header>

			<main className="cert-s-body">
				{loading ? (
					<div className="cert-s-empty">{t("common.loading")}</div>
				) : errorMsg ? (
					<div className="cert-s-empty">{errorMsg}</div>
				) : items.length === 0 ? (
					<div className="cert-s-empty">{t("mypage.noCerts")}</div>
				) : (
					<div className="cert-s-list">
						{items.map((item) => (
						<div key={item.fileId} className="cert-s-card">
							<div className="cert-s-thumb" >
								{previewMap[item.fileId] ? (
									<img src={previewMap[item.fileId]} alt="" className="cert-s-thumb-img" />
								) : (
									<div className="cert-s-thumb-placeholder" />
								)}
							</div>

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
									<img
										src={
											downloadingId === item.fileId
											? "/icons/download-02-blue.svg"
											: "/icons/download-02.svg"
										}
										alt=""
									/>
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