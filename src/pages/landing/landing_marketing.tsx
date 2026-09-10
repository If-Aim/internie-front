import { useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { Link } from "react-router-dom";
import SeoMeta from "../../utils/SeoMetadata";
import "./landing_marketing.css";

type PurchaseMode = "single" | "subscription";
type PaymentRegion = "domestic" | "international";

// 상품명과 금액은 Figma의 임시 값입니다. 실제 상품·결제 API 확정 후 교체합니다.
const PRODUCTS = [
    { id: "product-1", name: "항목 1", description: "내용", features: ["포함 내용", "컨택 문안", "선정 기준"] },
    { id: "product-2", name: "항목 1", description: "내용", features: ["포함 내용", "컨택 문안", "선정 기준"] },
    { id: "product-3", name: "항목 1", description: "내용", features: ["포함 내용", "컨택 문안", "선정 기준"] }
];

export default function MarketingLanding(): ReactElement {
    const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("single");
    const [paymentRegion, setPaymentRegion] = useState<PaymentRegion>("domestic");
    const [selections, setSelections] = useState<Record<PurchaseMode, string[]>>({ single: [], subscription: [] });
    const [agreed, setAgreed] = useState(false);
    const [paymentSelected, setPaymentSelected] = useState(false);
    const [previewMessage, setPreviewMessage] = useState("");
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const stepChangedRef = useRef(false);
    const orderFormRef = useRef<HTMLFormElement>(null);
    const productsRef = useRef<HTMLElement>(null);
    const checkoutRef = useRef<HTMLElement>(null);
    const completeButtonRef = useRef<HTMLButtonElement>(null);
    const checkoutTitleRef = useRef<HTMLHeadingElement>(null);
    const selectedIds = selections[purchaseMode];
    const selectedProducts = PRODUCTS.filter((product) => selectedIds.includes(product.id));

    useLayoutEffect(() => {
        const form = orderFormRef.current;
        const section = checkoutOpen ? checkoutRef.current : productsRef.current;
        if (!form || !section) return;

        // 현재 단계의 실제 높이만 반영하고, 상품 추가·화면 크기 변경에도 갱신합니다.
        const updateHeight = () => { form.style.height = `${section.offsetHeight}px`; };
        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        observer.observe(section);

        if (stepChangedRef.current) {
            (checkoutOpen ? checkoutTitleRef.current : completeButtonRef.current)?.focus({ preventScroll: true });
        }
        return () => observer.disconnect();
    }, [checkoutOpen]);

    function changeStep(open: boolean): void {
        stepChangedRef.current = true;
        setPreviewMessage("");
        setCheckoutOpen(open);
    }

    function toggleProduct(id: string): void {
        setSelections((current) => ({ ...current, [purchaseMode]: current[purchaseMode].includes(id) ? current[purchaseMode].filter((item) => item !== id) : [...current[purchaseMode], id] }));
        setPreviewMessage("");
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        if (!checkoutOpen || !selectedIds.length || !agreed) return;
        setPreviewMessage("현재 디자인 미리보기입니다. 실제 주문 접수와 결제는 진행되지 않습니다.");
    }

    return (
        <div className="marketing-landing" id="marketing-top">
            <SeoMeta title="인터니 | 구독형 마케터" description="채용하지 말고 필요한 만큼 구독하세요. 인터니 구독형 마케터." canonical="https://www.internie.com/" />
            <a className="marketing-skip-link" href="#marketing-products" onClick={() => changeStep(false)}>상품 선택으로 바로가기</a>
            <header className="marketing-header">
                <a className="marketing-logo" href="#marketing-top" aria-label="인터니 처음으로">internie</a>
            </header>
            <main>
                <section className="marketing-hero" aria-labelledby="marketing-hero-title">
                    <p className="marketing-eyebrow">구독형 마케터</p>
                    <h1 id="marketing-hero-title">채용하지 말고<br />필요한 만큼 <span>구독</span>하세요</h1>
                    <img className="marketing-hero-art" src="/landing/marketing/marketer-handwriting.png" alt="Do you need marketer?" width={1096} height={644} fetchPriority="high" />
                </section>
                <form ref={orderFormRef} className={`marketing-order-form${checkoutOpen ? " is-checkout-open" : ""}`} onSubmit={handleSubmit} onChange={() => setPreviewMessage("")}>
                    <section className="marketing-products" id="marketing-products" ref={productsRef} inert={checkoutOpen} aria-hidden={checkoutOpen} aria-label="상품 선택">
                        <div className="marketing-switch" role="group" aria-label="구매 방식">
                            <button type="button" aria-pressed={purchaseMode === "single"} onClick={() => { setPurchaseMode("single"); setPreviewMessage(""); }}>개별 상품 구매</button>
                            <button type="button" aria-pressed={purchaseMode === "subscription"} onClick={() => { setPurchaseMode("subscription"); setPreviewMessage(""); }}>구독 하기</button>
                        </div>
                        <div className="marketing-product-layout">
                            <fieldset className="marketing-product-list">
                                <legend className="marketing-sr-only">{purchaseMode === "single" ? "개별 구매 상품" : "구독할 상품"}</legend>
                                {PRODUCTS.map((product, index) => (
                                    <label className={`marketing-product-card${selectedIds.includes(product.id) ? " is-selected" : ""}`} key={product.id}>
                                        <input type="checkbox" name={`${purchaseMode}-products`} value={product.id} checked={selectedIds.includes(product.id)} onChange={() => toggleProduct(product.id)} aria-label={`${index + 1}번 ${product.name} 선택`} />
                                        <strong>{product.name}</strong>
                                        <span className="marketing-product-description">{product.description}</span>
                                        <span className="marketing-product-features">{product.features.map((feature) => <span key={feature}>{feature}</span>)}</span>
                                    </label>
                                ))}
                            </fieldset>
                            <aside className="marketing-summary" aria-labelledby="marketing-summary-title">
                                <span className="marketing-summary-eyebrow">SUMMARY</span>
                                <h2 id="marketing-summary-title">주문 요약</h2>
                                <div className="marketing-summary-selection" aria-live="polite">
                                    {selectedProducts.length ? <><span>{purchaseMode === "single" ? "개별 상품 구매" : "구독"} · {selectedProducts.length}개 선택</span><ul>{selectedProducts.map((product) => <li key={product.id}>{product.name}</li>)}</ul></> : <p>아직 고른 구성이 없습니다</p>}
                                </div>
                                <dl className="marketing-summary-prices">
                                    <div><dt>공급가액</dt><dd>$0</dd></div>
                                    <div><dt>부가세 (10%)</dt><dd>$0</dd></div>
                                    <div className="marketing-summary-total"><dt>합계</dt><dd>$0</dd></div>
                                </dl>
                                <label className="marketing-agreement"><input type="checkbox" name="agreement" required checked={agreed} onChange={(event) => setAgreed(event.target.checked)} /><span>이용 약관과 환불 정책에 동의합니다</span></label>
                                <button className="marketing-primary-button" ref={completeButtonRef} type="button" disabled={!selectedIds.length || !agreed} aria-controls="marketing-checkout" aria-expanded={checkoutOpen} onClick={() => changeStep(true)}>완료</button>
                            </aside>
                        </div>
                    </section>
                    <section className="marketing-checkout" id="marketing-checkout" ref={checkoutRef} inert={!checkoutOpen} aria-hidden={!checkoutOpen} aria-labelledby="marketing-checkout-title">
                        <button className="marketing-back-button" type="button" onClick={() => changeStep(false)}>상품 선택으로 돌아가기</button>
                        <h2 id="marketing-checkout-title" ref={checkoutTitleRef} tabIndex={-1}>결제 지역</h2>
                        <fieldset className="marketing-checkout-fields" disabled={!checkoutOpen}>
                            <legend className="marketing-sr-only">주문 및 결제 정보</legend>
                            <div className="marketing-switch" role="group" aria-label="결제 지역">
                                <button type="button" aria-pressed={paymentRegion === "domestic"} onClick={() => { setPaymentRegion("domestic"); setPreviewMessage(""); }}>국내 결제</button>
                                <button type="button" aria-pressed={paymentRegion === "international"} onClick={() => { setPaymentRegion("international"); setPreviewMessage(""); }}>해외 결제</button>
                            </div>
                            <div className="marketing-checkout-panels">
                                <section className="marketing-customer-panel" aria-labelledby="marketing-customer-title">
                                    <h3 id="marketing-customer-title">주문자 정보</h3>
                                    <div className="marketing-customer-grid">
                                        <label><span>Company</span><input type="text" name="company" placeholder="e.g. Acme" autoComplete="organization" maxLength={100} required pattern=".*\S.*" /></label>
                                        <label><span>Your name</span><input type="text" name="name" placeholder="e.g. Jane Doe" autoComplete="name" maxLength={100} required pattern=".*\S.*" /></label>
                                        <label><span>Work email</span><input type="email" name="email" placeholder="example@company.com" autoComplete="email" maxLength={254} required /></label>
                                        <label><span>Phone</span><input type="tel" name="phone" placeholder={paymentRegion === "domestic" ? "010-0000-0000" : "+1 555 000 0000"} autoComplete="tel" maxLength={30} required pattern="[+0-9()\s\-]{7,30}" /></label>
                                        {paymentRegion === "domestic" && <label><span>사업자 번호 <span className="marketing-field-hint">(세금 계산서 발행용)</span></span><input type="text" name="businessNumber" placeholder="000-00-00000" inputMode="numeric" maxLength={12} pattern="[0-9]{3}-?[0-9]{2}-?[0-9]{5}" title="사업자등록번호 10자리를 입력해 주세요." /></label>}
                                    </div>
                                </section>
                                <section className="marketing-payment-panel" aria-labelledby="marketing-payment-title">
                                    <h3 id="marketing-payment-title">결제 수단</h3>
                                    <label className="marketing-payment-option"><input type="radio" name="paymentMethod" value="paypal" required checked={paymentSelected} onChange={() => setPaymentSelected(true)} /><img src="/landing/marketing/paypal.png" alt="PayPal" width={160} height={42} /></label>
                                    <button className="marketing-primary-button marketing-payment-submit" type="submit">결제하기</button>
                                    <p className="marketing-preview-message" role="status">{previewMessage}</p>
                                </section>
                            </div>
                        </fieldset>
                    </section>
                </form>
                <section className="marketing-final-cta">
                    <div><h2>채용하지 말고, 필요한 만큼 구독하세요.</h2><p>지금 필요한 마케팅 업무, 인터니와 함께 시작하세요.</p></div>
                    <a href="#marketing-products" onClick={() => changeStep(false)}>상품 선택하기</a>
                </section>
            </main>
            <footer className="marketing-footer">
                <div className="marketing-footer-inner">
                    <div className="marketing-footer-brand"><a href="#marketing-top">인터니 <span>internie</span></a><p>필요한 만큼 함께하는 구독형 마케터.<br />by aim</p></div>
                    <nav aria-label="하단 바로가기"><h2>바로가기</h2><a href="#marketing-top">홈</a><a href="#marketing-products" onClick={() => changeStep(false)}>상품 선택</a><a href={selectedIds.length && agreed ? "#marketing-checkout" : "#marketing-products"} onClick={() => changeStep(Boolean(selectedIds.length && agreed))}>주문서 작성</a><Link to="/privacy-policy">개인정보처리방침</Link></nav>
                    <div className="marketing-footer-company"><h2>사업자 정보</h2><p>상호 aim (에임) · 대표 김유진</p><a href="mailto:purieu.k@gmail.com">purieu.k@gmail.com</a><p>사업자등록번호 : 830-39-01486</p></div>
                    <small>© 2026 aim. All rights reserved.</small>
                </div>
            </footer>
        </div>
    );
}
