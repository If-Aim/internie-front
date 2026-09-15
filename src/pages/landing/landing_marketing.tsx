import { useId, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { createInquiry } from "../../api/client";
import SeoMeta from "../../utils/SeoMetadata";
import MarketingCheckout from "./marketing_checkout";
import "./landing_marketing.css";

type PlanId = "starter" | "launch" | "standard" | "growth";
type SegmentId = "beauty" | "tech" | "local";
type InquiryTopic = PlanId | "contract" | "single";
type PurchaseMode = "single" | "subscription";
type FaqItem = { question: string; answer: string };

const PLANS: Record<PlanId, { price: number; setup: number; saving?: number }> = {
    starter: { price: 1000000, setup: 400000 },
    launch: { price: 2400000, setup: 900000, saving: 25 },
    standard: { price: 2950000, setup: 900000, saving: 16 },
    growth: { price: 3300000, setup: 900000, saving: 10 }
};
const SEGMENTS: SegmentId[] = ["beauty", "tech", "local"];
const SINGLE_PRICES = [160000, 200000, 270000, 70000];
const CONTRACT_TOTAL = PLANS.launch.price + PLANS.launch.setup + PLANS.standard.price * 2;

function MarketingFaqItem({ question, answer }: FaqItem): ReactElement {
    const [isOpen, setIsOpen] = useState(false);
    const id = useId();

    return (
        <div className={`marketing-faq-item${isOpen ? " is-open" : ""}`}>
            <h3><button type="button" className="marketing-faq-question" id={`${id}-question`} aria-expanded={isOpen} aria-controls={`${id}-answer`} onClick={() => setIsOpen((current) => !current)}>{question}<span aria-hidden="true" /></button></h3>
            <div className="marketing-faq-answer" id={`${id}-answer`} role="region" aria-labelledby={`${id}-question`} aria-hidden={!isOpen} inert={!isOpen}><div><p>{answer}</p></div></div>
        </div>
    );
}

export default function MarketingLanding(): ReactElement {
    const { t, i18n } = useTranslation("marketing");
    const language = (i18n.resolvedLanguage ?? i18n.language).startsWith("en") ? "en" : "ko";
    const isEnglish = language === "en";
    const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("single");
    const [singleSelections, setSingleSelections] = useState<number[]>([]);
    const [segment, setSegment] = useState<SegmentId>("beauty");
    const [selection, setSelection] = useState<PlanId | null>(null);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [checkoutTopic, setCheckoutTopic] = useState<InquiryTopic>("single");
    const checkoutRef = useRef<HTMLElement>(null);
    const orderFlowRef = useRef<HTMLDivElement>(null);
    const productsStepRef = useRef<HTMLDivElement>(null);
    const checkoutTriggerRef = useRef<HTMLButtonElement | null>(null);
    const checkoutChangedRef = useRef(false);
    const [inquiryTopic, setInquiryTopic] = useState<InquiryTopic>("contract");
    const [inquiryStatus, setInquiryStatus] = useState<"idle" | "sending" | "success" | "error" | "required">("idle");
    const dialogRef = useRef<HTMLDialogElement>(null);
    const singleModeButtonRef = useRef<HTMLButtonElement>(null);
    const inquiryTriggerRef = useRef<HTMLButtonElement | null>(null);
    const submittingRef = useRef(false);
    const visiblePlans: PlanId[] = segment === "beauty" ? ["standard", "growth"] : segment === "local" ? ["starter", "launch"] : ["launch", "standard"];
    const selectedPlan = selection && visiblePlans.includes(selection) ? selection : visiblePlans[0];
    const faqs = t("faq.items", { returnObjects: true }) as FaqItem[];
    const notices = t("notices.items", { returnObjects: true }) as string[];
    const singleItems = t("single.items", { returnObjects: true }) as string[];
    const selectedSingleItems = singleItems.flatMap((name, index) => singleSelections.includes(index) ? [{ id: index, name, price: SINGLE_PRICES[index] }] : []);
    const singleSubtotal = selectedSingleItems.reduce((total, item) => total + item.price, 0);
    const singleVat = Math.round(singleSubtotal * 0.1);
    const singleTotal = singleSubtotal + singleVat;
    const topicLabel = inquiryTopic === "contract" ? t("contract.label") : inquiryTopic === "single" ? t("purchase.single") : t(`plans.${inquiryTopic}.name`);
    const checkoutItems = checkoutTopic === "single" ? selectedSingleItems : checkoutTopic === "contract" ? [
        { id: "launch", name: t("contract.launchSetup"), price: PLANS.launch.price + PLANS.launch.setup },
        { id: "standard", name: `${t("contract.month23")} · ${t("plans.standard.name")}`, price: PLANS.standard.price * 2 },
        { id: "discount", name: t("checkout.prepayDiscount"), price: -CONTRACT_TOTAL * 0.05 }
    ] : [
        { id: checkoutTopic, name: `${t(`plans.${checkoutTopic}.name`)} · ${t("contract.month1")}`, price: PLANS[checkoutTopic].price },
        { id: "setup", name: t("checkout.setup"), price: PLANS[checkoutTopic].setup }
    ];
    const checkoutNote = checkoutTopic === "single" ? t("single.note") : checkoutTopic === "contract" ? t("checkout.contractNote") : t("checkout.subscriptionNote", { price: money(PLANS[checkoutTopic].price, false) });

    useLayoutEffect(() => {
        const flow = orderFlowRef.current;
        const step = checkoutOpen ? checkoutRef.current : productsStepRef.current;
        if (!flow || !step) return;
        const updateHeight = () => { flow.style.height = `${step.offsetHeight}px`; };
        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        observer.observe(step);

        if (checkoutChangedRef.current) {
            if (checkoutOpen) {
                checkoutRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
                checkoutRef.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
            } else {
                checkoutTriggerRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
                checkoutTriggerRef.current?.focus({ preventScroll: true });
            }
        }
        return () => observer.disconnect();
    }, [checkoutOpen]);

    function openCheckout(topic: InquiryTopic, trigger: HTMLButtonElement): void {
        setCheckoutTopic(topic);
        checkoutTriggerRef.current = trigger;
        checkoutChangedRef.current = true;
        setCheckoutOpen(true);
    }

    function money(amount: number, compact = true): string {
        return isEnglish ? `KRW ${amount.toLocaleString("en-US")}` : compact ? `${(amount / 10000).toLocaleString("ko-KR")}만원` : `${amount.toLocaleString("ko-KR")}원`;
    }

    function showSingleProducts(): void {
        setCheckoutOpen(false);
        setPurchaseMode("single");
        singleModeButtonRef.current?.focus({ preventScroll: true });
        singleModeButtonRef.current?.scrollIntoView({ block: "start" });
    }

    function toggleSingleProduct(id: number): void {
        setSingleSelections((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    }

    function selectSegment(next: SegmentId): void {
        setSegment(next);
        setSelection(null);
    }

    function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number): void {
        const next = event.key === "ArrowRight" ? (index + 1) % SEGMENTS.length : event.key === "ArrowLeft" ? (index + SEGMENTS.length - 1) % SEGMENTS.length : event.key === "Home" ? 0 : event.key === "End" ? SEGMENTS.length - 1 : -1;
        if (next < 0) return;
        event.preventDefault();
        selectSegment(SEGMENTS[next]);
        document.getElementById(`marketing-tab-${SEGMENTS[next]}`)?.focus();
    }

    function openInquiry(topic: InquiryTopic, trigger: HTMLButtonElement): void {
        setInquiryTopic(topic);
        setInquiryStatus("idle");
        inquiryTriggerRef.current = trigger;
        dialogRef.current?.showModal();
    }

    async function handleInquirySubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        if (submittingRef.current) return;
        const form = event.currentTarget;
        const data = new FormData(form);
        const value = (key: string) => String(data.get(key) ?? "").trim();
        if (!["company", "name", "email", "phone"].every((key) => value(key)) || !data.get("privacy")) {
            setInquiryStatus("required");
            return;
        }
        submittingRef.current = true;
        setInquiryStatus("sending");
        const singleDetails = inquiryTopic === "single" ? `\n${selectedSingleItems.map((item) => `${item.name}: ${money(item.price, false)}`).join("\n")}\n${t("summary.subtotal")}: ${money(singleSubtotal, false)}\n${t("summary.vat")}: ${money(singleVat, false)}\n${t("summary.total")}: ${money(singleTotal, false)}\n` : "";
        try {
            await createInquiry({ companyName: value("company"), contactName: value("name"), position: null, companyEmail: value("email"), phone: value("phone"), question: `[internie marketing · ${language} · ${inquiryTopic}] ${topicLabel}${singleDetails}\n${value("message")}` });
            form.reset();
            setInquiryStatus("success");
        } catch {
            setInquiryStatus("error");
        } finally {
            submittingRef.current = false;
        }
    }

    return (
        <div className="marketing-landing" id="marketing-top" lang={language}>
            <SeoMeta title={t("seo.title")} description={t("seo.description")} lang={language} canonical="https://www.internie.com/" />
            <a className="marketing-skip-link" href="#marketing-products" onClick={() => setCheckoutOpen(false)}>{t("header.skip")}</a>
            <header className="marketing-header">
                <a className="marketing-logo" href="#marketing-top" aria-label={t("header.home")}>internie</a>
                <button className="marketing-language" type="button" aria-label={t("header.languageAria")} onClick={() => { setSelection(null); void i18n.changeLanguage(isEnglish ? "ko" : "en"); }}>{t("header.language")}</button>
            </header>
            <main>
                <section className="marketing-hero" aria-labelledby="marketing-hero-title">
                    <p className="marketing-eyebrow">{t("hero.eyebrow")}</p>
                    <h1 id="marketing-hero-title">{t("hero.line1")}<br />{t("hero.line2")}{!isEnglish && " "}<span>{t("hero.accent")}</span>{t("hero.ending")}</h1>
                    <img className="marketing-hero-art" src="/landing/marketing/marketer-handwriting.png" alt="Do you need marketer?" width={1096} height={644} fetchPriority="high" />
                </section>
                <div className={`marketing-order-flow${checkoutOpen ? " is-checkout-open" : ""}`} ref={orderFlowRef}>
                    <div className="marketing-products-step" ref={productsStepRef} inert={checkoutOpen} aria-hidden={checkoutOpen}>
                        <section className="marketing-pricing" id="marketing-products" aria-labelledby="marketing-pricing-title">
                            <div className="marketing-section-heading">
                                <p className="marketing-section-eyebrow">{t("pricing.eyebrow")}</p>
                                <h2 id="marketing-pricing-title">{t("pricing.title")}</h2>
                                <p>{t("pricing.description")}<br />{t(purchaseMode === "subscription" ? "pricing.term" : "single.description")}</p>
                                <small>{t("pricing.region")}</small>
                            </div>
                            <div className="marketing-purchase-switch" role="group" aria-label={t("purchase.label")}>
                                <button type="button" ref={singleModeButtonRef} aria-pressed={purchaseMode === "single"} aria-controls="marketing-single-products" onClick={() => setPurchaseMode("single")}>{t("purchase.single")}</button>
                                <button type="button" aria-pressed={purchaseMode === "subscription"} aria-controls="marketing-subscription-products" onClick={() => setPurchaseMode("subscription")}>{t("purchase.subscription")}</button>
                            </div>
                            <div id="marketing-single-products" hidden={purchaseMode !== "single"}>
                                <div className="marketing-product-layout">
                                    <fieldset className="marketing-product-list">
                                        <legend className="marketing-sr-only">{t("purchase.select")}</legend>
                                        {singleItems.map((item, index) => <label className={`marketing-product-card${singleSelections.includes(index) ? " is-selected" : ""}`} key={index}><input type="checkbox" name="single-products" value={index} checked={singleSelections.includes(index)} onChange={() => toggleSingleProduct(index)} aria-label={item} /><strong>{item}</strong><span className="marketing-product-unit">{t("purchase.unit")}</span><span className="marketing-product-price">{money(SINGLE_PRICES[index])}<small>{t("pricing.vat")}</small></span></label>)}
                                    </fieldset>
                                    <aside className="marketing-summary" aria-labelledby="marketing-summary-title">
                                        <span className="marketing-summary-eyebrow">SUMMARY</span>
                                        <h2 id="marketing-summary-title">{t("summary.title")}</h2>
                                        <div className="marketing-summary-selection" aria-live="polite">{selectedSingleItems.length ? <><p>{t("summary.selected", { count: selectedSingleItems.length })}</p><ul>{selectedSingleItems.map((item) => <li key={item.id}>{item.name}</li>)}</ul></> : <p>{t("summary.empty")}</p>}</div>
                                        <dl className="marketing-summary-prices" aria-live="polite" aria-atomic="true"><div><dt>{t("summary.subtotal")}</dt><dd>{money(singleSubtotal, false)}</dd></div><div><dt>{t("summary.vat")}</dt><dd>{money(singleVat, false)}</dd></div><div className="marketing-summary-total"><dt>{t("summary.total")}</dt><dd>{money(singleTotal, false)}</dd></div></dl>
                                        <p className="marketing-summary-note">{t("summary.note")}</p>
                                        <button type="button" className="marketing-primary-button" disabled={!selectedSingleItems.length} onClick={(event) => openCheckout("single", event.currentTarget)}>{t("summary.cta")}</button>
                                    </aside>
                                </div>
                                <p className="marketing-single-disclaimer">{t("single.note")}</p>
                            </div>
                            <div id="marketing-subscription-products" hidden={purchaseMode !== "subscription"}>
                                <div className="marketing-segment-tabs" role="tablist" aria-label={t("pricing.segments")}>
                                    {SEGMENTS.map((id, index) => <button key={id} type="button" role="tab" id={`marketing-tab-${id}`} aria-selected={segment === id} aria-controls="marketing-plan-panel" tabIndex={segment === id ? 0 : -1} onKeyDown={(event) => handleTabKey(event, index)} onClick={() => selectSegment(id)}>{t(`pricing.${id}`)}</button>)}
                                </div>
                                <div id="marketing-plan-panel" className="marketing-plan-panel" role="tabpanel" aria-labelledby={`marketing-tab-${segment}`}>
                                    <fieldset className="marketing-plan-grid">
                                        <legend className="marketing-sr-only">{t("pricing.selection")}</legend>
                                        {visiblePlans.map((id, index) => {
                                            const plan = PLANS[id];
                                            const features = t(`plans.${id}.features`, { returnObjects: true }) as string[];
                                            return (
                                                <article className={`marketing-plan-card${selectedPlan === id ? " is-selected" : ""}`} key={id}>
                                                    <div className="marketing-plan-topline"><span className={`marketing-plan-badge${id === "standard" || index === 0 ? "" : " is-muted"}`}>{id === "standard" ? t("pricing.popular") : index === 0 ? t("pricing.recommended") : t(`plans.${id}.name`)}</span><label className="marketing-plan-choice"><input type="radio" name="marketing-plan" value={id} checked={selectedPlan === id} onChange={() => setSelection(id)} /><span className="marketing-sr-only">{t(`plans.${id}.name`)} · {t("pricing.selection")}</span></label></div>
                                                    <h3>{t(`plans.${id}.name`)}</h3>
                                                    <p className="marketing-plan-description">{t(`plans.${id}.description`)}</p>
                                                    {segment === "local" && id === "launch" && <p className="marketing-next-step">{t("pricing.nextStep")}</p>}
                                                    <div className="marketing-plan-price">{!isEnglish && <span>{t("pricing.monthly")} </span>}<strong>{money(plan.price)}</strong>{isEnglish && <span> {t("pricing.monthly")}</span>}<small>{t("pricing.vat")}</small></div>
                                                    <ul className="marketing-plan-features">{features.map((feature, featureIndex) => <li className={id === "growth" && featureIndex > 1 ? "is-highlighted" : undefined} key={feature}>{feature}</li>)}</ul>
                                                    <div className="marketing-plan-bottom"><p className="marketing-setup">{t("pricing.setup", { price: money(plan.setup) })}<small>{t("pricing.vat")}</small></p>{plan.saving && <p className="marketing-saving">{t("pricing.saving", { percent: plan.saving })}</p>}<button type="button" className={selectedPlan === id ? "marketing-primary-button" : "marketing-secondary-button"} onClick={(event) => { setSelection(id); openCheckout(id, event.currentTarget); }}>{t("pricing.consult", { plan: t(`plans.${id}.name`) })}</button></div>
                                                </article>
                                            );
                                        })}
                                    </fieldset>
                                </div>
                                <section className="marketing-contract" aria-labelledby="marketing-contract-title">
                                    <div className="marketing-contract-heading"><p className="marketing-section-eyebrow">{t("contract.eyebrow")}</p><h2 id="marketing-contract-title">{t("contract.title")}</h2><p>{t("contract.description")}</p></div>
                                    <div className="marketing-table-wrap"><table className="marketing-table"><caption className="marketing-sr-only">{t("contract.label")}</caption><thead><tr><th scope="col">{t("contract.period")}</th><th scope="col">{t("contract.plan")}</th><th scope="col">{t("contract.price")}</th></tr></thead><tbody>
                                        <tr><th scope="row">{t("contract.month1")}</th><td>{t("contract.launchSetup")}</td><td>{money(PLANS.launch.price + PLANS.launch.setup)}<small>{t("pricing.vat")}</small></td></tr>
                                        <tr><th scope="row">{t("contract.month23")}</th><td>{t("plans.standard.name")}</td><td>{t("contract.perMonth", { price: money(PLANS.standard.price) })}<small>{t("pricing.vat")}</small></td></tr>
                                        <tr><th scope="row">{t("contract.month4")}</th><td>{t("contract.growthOptional")}</td><td>{t("contract.perMonth", { price: money(PLANS.growth.price) })}<small>{t("pricing.vat")}</small></td></tr>
                                    </tbody></table></div>
                                    <div className="marketing-contract-total"><div><p>{t("contract.minimum")}</p><span>{t("contract.total")} <strong>{money(CONTRACT_TOTAL)}</strong></span><small>{t("pricing.vat")}</small></div><div className="marketing-prepay"><p>{t("contract.prepay")} <span>{t("contract.discount")}</span></p><strong>{money(CONTRACT_TOTAL * 0.95)}</strong><small>{t("pricing.vat")}</small></div></div>
                                    <button type="button" className="marketing-primary-button" onClick={(event) => openCheckout("contract", event.currentTarget)}>{t("contract.cta")}</button>
                                </section>
                                <details className="marketing-single" id="marketing-single">
                                    <summary>{t("single.title")}<span aria-hidden="true" /></summary>
                                    <div className="marketing-single-content"><p>{t("single.description")}</p><div className="marketing-table-wrap"><table className="marketing-table"><thead><tr><th scope="col">{t("single.item")}</th><th scope="col">{t("single.price")}</th></tr></thead><tbody>{singleItems.map((item, index) => <tr key={item}><th scope="row">{item}</th><td>{money(SINGLE_PRICES[index])}<small>{t("pricing.vat")}</small></td></tr>)}</tbody></table></div><p className="marketing-single-note">{t("single.note")}</p><button type="button" className="marketing-secondary-button" onClick={showSingleProducts}>{t("single.cta")}</button></div>
                                </details>
                            </div>
                            <aside className="marketing-notices" aria-labelledby="marketing-notices-title"><h3 id="marketing-notices-title">{t("notices.title")}</h3><ul>{notices.map((notice) => <li key={notice}>{notice}</li>)}</ul></aside>
                        </section>
                        <section className="marketing-faq" aria-labelledby="marketing-faq-title"><p className="marketing-section-eyebrow">FAQ</p><h2 id="marketing-faq-title">{t("faq.title")}</h2><div>{faqs.map((faq) => <MarketingFaqItem key={faq.question} {...faq} />)}</div></section>
                        <section className="marketing-final-cta">
                            <div><h2>{t("cta.title")}</h2><p>{t("cta.description")}</p></div>
                            <div className="marketing-cta-actions"><button type="button" onClick={(event) => openCheckout("contract", event.currentTarget)}>{t("cta.primary")}</button><button type="button" onClick={showSingleProducts}>{t("cta.secondary")}</button></div>
                        </section>
                    </div>
                    <section className="marketing-checkout" ref={checkoutRef} inert={!checkoutOpen} aria-hidden={!checkoutOpen} aria-labelledby="marketing-checkout-title">
                        <MarketingCheckout active={checkoutOpen} items={checkoutItems} note={checkoutNote} money={(amount) => money(amount, false)} onBack={() => setCheckoutOpen(false)} />
                    </section>
                </div>
            </main>
            <footer className="marketing-footer">
                <div className="marketing-footer-inner">
                    <div className="marketing-footer-brand"><a href="#marketing-top">{t("footer.brand")}<span>by aim</span></a><p>{t("footer.description")}</p></div>
                    <nav aria-label={t("footer.links")}><h2>{t("footer.links")}</h2><a href="#marketing-top">{t("footer.home")}</a><a href="#marketing-products" onClick={() => setCheckoutOpen(false)}>{t("footer.plans")}</a><button type="button" onClick={(event) => openInquiry("contract", event.currentTarget)}>{t("footer.contact")}</button><Link to="/privacy-policy">{t("footer.privacy")}</Link></nav>
                    <div className="marketing-footer-company"><h2>{t("footer.company")}</h2><p>{t("footer.business")}</p><a href="mailto:purieu.k@gmail.com">purieu.k@gmail.com</a><p>{t("footer.registration")}</p></div>
                    <small>© 2026 aim. All rights reserved.</small>
                </div>
            </footer>
            <dialog className="marketing-inquiry" ref={dialogRef} aria-labelledby="marketing-inquiry-title" onCancel={(event) => { if (submittingRef.current) event.preventDefault(); }} onClose={() => inquiryTriggerRef.current?.focus({ preventScroll: true })}>
                <div className="marketing-inquiry-heading"><h2 id="marketing-inquiry-title">{t("inquiry.title")}</h2><button type="button" disabled={inquiryStatus === "sending"} onClick={() => dialogRef.current?.close()}>{t("inquiry.close")}</button></div>
                <p className="marketing-inquiry-topic">{t("inquiry.selected")}<strong>{topicLabel}</strong></p>
                {inquiryTopic === "single" && <div className="marketing-inquiry-order"><ul>{selectedSingleItems.map((item) => <li key={item.id}>{item.name} · {money(item.price, false)}</li>)}</ul><strong>{t("summary.total")}: {money(singleTotal, false)}</strong><small>{t("summary.vatIncluded")}</small></div>}
                <form onSubmit={handleInquirySubmit}>
                    <fieldset disabled={inquiryStatus === "sending" || inquiryStatus === "success"}>
                        <legend className="marketing-sr-only">{t("inquiry.title")}</legend>
                        <div className="marketing-customer-grid">
                            <label><span>{t("inquiry.company")}</span><input name="company" autoComplete="organization" maxLength={100} pattern=".*\S.*" required /></label>
                            <label><span>{t("inquiry.name")}</span><input name="name" autoComplete="name" maxLength={100} pattern=".*\S.*" required /></label>
                            <label><span>{t("inquiry.email")}</span><input type="email" name="email" autoComplete="email" maxLength={254} required /></label>
                            <label><span>{t("inquiry.phone")}</span><input type="tel" name="phone" autoComplete="tel" maxLength={30} pattern="[+0-9\(\)\s\-]{7,30}" required /></label>
                            <label className="marketing-message-field"><span>{t("inquiry.message")}</span><textarea name="message" rows={3} maxLength={3000} placeholder={t("inquiry.messagePlaceholder")} /></label>
                        </div>
                        <label className="marketing-agreement"><input type="checkbox" name="privacy" required /><span>{t("inquiry.privacy")} <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer">{t("inquiry.policy")}</Link></span></label>
                        <button type="submit" className="marketing-primary-button">{t(inquiryStatus === "sending" ? "inquiry.submitting" : "inquiry.submit")}</button>
                    </fieldset>
                    <p className={`marketing-inquiry-status is-${inquiryStatus}`} role="status">{["success", "error", "required"].includes(inquiryStatus) ? t(`inquiry.${inquiryStatus}`) : ""}</p>
                </form>
            </dialog>
        </div>
    );
}
