import { useState } from "react";
import type { FormEvent, ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type CheckoutProps = { active: boolean; items: { id: string | number; name: string; price: number }[]; note: string; money: (amount: number) => string; onBack: () => void };

export default function MarketingCheckout({ active, items, note, money, onBack }: CheckoutProps): ReactElement {
    const { t, i18n } = useTranslation("marketing");
    const [region, setRegion] = useState<"domestic" | "international">((i18n.resolvedLanguage ?? i18n.language).startsWith("en") ? "international" : "domestic");
    const [attempted, setAttempted] = useState(false);
    const subtotal = items.reduce((total, item) => total + item.price, 0);
    const vat = Math.round(subtotal * 0.1);

    function handleSubmit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        if (!active || !items.length) return;
        // Restore the checkout preview; payment completion must come from a verified payment API.
        setAttempted(true);
    }

    return (
        <>
            <button className="marketing-back-button" type="button" onClick={() => { setAttempted(false); onBack(); }}>{t("checkout.back")}</button>
            <h2 id="marketing-checkout-title" tabIndex={-1}>{t("checkout.title")}</h2>
            <form onSubmit={handleSubmit} onChange={() => setAttempted(false)}>
                <fieldset className="marketing-checkout-fields" disabled={!active}>
                    <legend className="marketing-sr-only">{t("checkout.fields")}</legend>
                    <div className="marketing-purchase-switch" role="group" aria-label={t("checkout.title")}>
                        <button type="button" aria-pressed={region === "domestic"} onClick={() => { setRegion("domestic"); setAttempted(false); }}>{t("checkout.domestic")}</button>
                        <button type="button" aria-pressed={region === "international"} onClick={() => { setRegion("international"); setAttempted(false); }}>{t("checkout.international")}</button>
                    </div>
                    <div className="marketing-checkout-panels">
                        <section className="marketing-customer-panel" aria-labelledby="marketing-customer-title">
                            <h3 id="marketing-customer-title">{t("checkout.customer")}</h3>
                            <div className="marketing-customer-grid">
                                <label><span>{t("inquiry.company")}</span><input name="company" placeholder={t("checkout.companyPlaceholder")} autoComplete="organization" maxLength={100} pattern=".*\S.*" required /></label>
                                <label><span>{t("inquiry.name")}</span><input name="name" placeholder={t("checkout.namePlaceholder")} autoComplete="name" maxLength={100} pattern=".*\S.*" required /></label>
                                <label><span>{t("inquiry.email")}</span><input type="email" name="email" placeholder="example@company.com" autoComplete="email" maxLength={254} required /></label>
                                <label><span>{t("inquiry.phone")}</span><input type="tel" name="phone" placeholder={region === "domestic" ? "010-0000-0000" : "+1 555 000 0000"} autoComplete="tel" maxLength={30} pattern="[+0-9\(\)\s\-]{7,30}" required /></label>
                                <label hidden={region !== "domestic"}><span>{t("checkout.businessNumber")} <small>{t("checkout.businessHint")}</small></span><input name="businessNumber" placeholder="000-00-00000" inputMode="numeric" maxLength={12} pattern="[0-9]{3}-?[0-9]{2}-?[0-9]{5}" title={t("checkout.businessFormat")} disabled={region !== "domestic"} /></label>
                            </div>
                            <p className="marketing-checkout-followup">{t("checkout.followup")}</p>
                        </section>
                        <section className="marketing-payment-panel" aria-labelledby="marketing-payment-title">
                            <h3 id="marketing-payment-title">{t("checkout.method")}</h3>
                            <label className="marketing-payment-option"><input type="radio" name="paymentMethod" value="paypal" required /><img src="/landing/marketing/paypal.png" alt="PayPal" width={160} height={42} /></label>
                            <div className="marketing-checkout-order">
                                <h4>{t("summary.title")}</h4>
                                <ul>{items.map((item) => <li key={item.id}><span>{item.name}</span><strong>{money(item.price)}</strong></li>)}</ul>
                                <dl className="marketing-summary-prices"><div><dt>{t("summary.subtotal")}</dt><dd>{money(subtotal)}</dd></div><div><dt>{t("summary.vat")}</dt><dd>{money(vat)}</dd></div><div className="marketing-summary-total"><dt>{t("checkout.amountDue")}</dt><dd>{money(subtotal + vat)}</dd></div></dl>
                                <p className="marketing-checkout-note">{note}</p>
                            </div>
                            <label className="marketing-agreement"><input type="checkbox" name="privacy" required /><span>{t("inquiry.privacy")} <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer">{t("inquiry.policy")}</Link></span></label>
                            <p className="marketing-checkout-followup">{t("checkout.followup")}</p>
                            <button className="marketing-primary-button marketing-payment-submit" type="submit" disabled={!items.length}>{t("checkout.pay")}</button>
                            <p className="marketing-checkout-note" id="marketing-payment-preview">{t("checkout.preview")}</p>
                            {attempted && <p className="marketing-payment-status" role="status">{t("checkout.unavailable")}</p>}
                        </section>
                    </div>
                </fieldset>
            </form>
        </>
    );
}
