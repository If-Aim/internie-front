import React from "react";
import { useTranslation } from "react-i18next";
import "./privacyPolicy.css";

const PRIVACY_T = "privacyPolicy";

type PrivacyTable = {
    headers: string[];
    rows: string[][];
};

type ProcedureItem = {
    title: string;
    paragraph?: string;
    children?: string[];
};

type DefinitionItem = {
    title: string;
    body: string;
};

function renderLines(lines: string[]): React.ReactElement {
    return (
        <>
            {lines.map((line, index) => (
                <React.Fragment key={`${line}-${index}`}>
                    {index > 0 && <br/>}
                    {line}
                </React.Fragment>
            ))}
        </>
    );
}

function renderCell(value: string): React.ReactElement {
    return <>{renderLines(value.split("\n"))}</>;
}

function renderTable(table: PrivacyTable, keyPrefix: string): React.ReactElement {
    return (
        <div className="privacy-table-wrap">
            <table className="privacy-table">
                <thead>
                    <tr>
                        {table.headers.map((header, index) => <th key={`${keyPrefix}-header-${index}`}>{header}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {table.rows.map((row, rowIndex) => (
                        <tr key={`${keyPrefix}-row-${rowIndex}`}>
                            {row.map((cell, cellIndex) => <td key={`${keyPrefix}-cell-${rowIndex}-${cellIndex}`}>{renderCell(cell)}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function renderOrderedList(items: string[], keyPrefix: string): React.ReactElement {
    return (
        <ol className="privacy-ol">
            {items.map((item, index) => <li key={`${keyPrefix}-${index}`}>{item}</li>)}
        </ol>
    );
}

function renderUnorderedList(items: string[], keyPrefix: string): React.ReactElement {
    return (
        <ul className="privacy-ul">
            {items.map((item, index) => <li key={`${keyPrefix}-${index}`}>{item}</li>)}
        </ul>
    );
}

function renderProcedureList(items: ProcedureItem[], keyPrefix: string): React.ReactElement {
    return (
        <ol className="privacy-ol">
            {items.map((item, index) => (
                <li key={`${keyPrefix}-${index}`}>
                    {item.title}
                    {item.paragraph && <p>{item.paragraph}</p>}
                    {item.children && (
                        <ul>
                            {item.children.map((child, childIndex) => <li key={`${keyPrefix}-${index}-${childIndex}`}>{child}</li>)}
                        </ul>
                    )}
                </li>
            ))}
        </ol>
    );
}

function renderDefinitionList(items: DefinitionItem[], keyPrefix: string): React.ReactElement {
    return (
        <ol className="privacy-ol">
            {items.map((item, index) => (
                <li key={`${keyPrefix}-${index}`}>
                    <strong>{item.title}</strong><br/>{item.body}
                </li>
            ))}
        </ol>
    );
}

export default function PrivacyPolicy(): React.ReactElement {
    const { t } = useTranslation();
    const getLines = (key: string) => t(`${PRIVACY_T}.${key}`, { returnObjects: true }) as unknown as string[];
    const getList = (key: string) => t(`${PRIVACY_T}.${key}`, { returnObjects: true }) as unknown as string[];
    const getTable = (key: string) => t(`${PRIVACY_T}.${key}`, { returnObjects: true }) as unknown as PrivacyTable;
    const getProcedureList = (key: string) => t(`${PRIVACY_T}.${key}`, { returnObjects: true }) as unknown as ProcedureItem[];
    const getDefinitionList = (key: string) => t(`${PRIVACY_T}.${key}`, { returnObjects: true }) as unknown as DefinitionItem[];

    return (
        <div className="privacy-page">
            <main className="privacy-content">
                <h1 className="privacy-title">{t(`${PRIVACY_T}.title`)}</h1>
                <p className="privacy-intro">{renderLines(getLines("intro"))}</p>

                <section>
                    <h2>{t(`${PRIVACY_T}.section1.title`)}</h2>
                    <p>{t(`${PRIVACY_T}.section1.description`)}</p>
                    <h3>{t(`${PRIVACY_T}.section1.common.title`)}</h3>
                    {renderTable(getTable("section1.common.table"), "section1-common")}
                    <h3>{t(`${PRIVACY_T}.section1.voice.title`)}</h3>
                    {renderTable(getTable("section1.voice.table"), "section1-voice")}
                    <h3>{t(`${PRIVACY_T}.section1.optional.title`)}</h3>
                    {renderTable(getTable("section1.optional.table"), "section1-optional")}
                    <h3>{t(`${PRIVACY_T}.section1.ai.title`)}</h3>
                    {renderTable(getTable("section1.ai.table"), "section1-ai")}
                    <h3>{t(`${PRIVACY_T}.section1.legalRetention.title`)}</h3>
                    {renderTable(getTable("section1.legalRetention.table"), "section1-legal-retention")}
                </section>

                <section>
                    <h2>{t(`${PRIVACY_T}.section2.title`)}</h2>
                    <p>{renderLines(getLines("section2.paragraph"))}</p>
                </section>

                <section>
                    <h2>{t(`${PRIVACY_T}.section3.title`)}</h2>
                    <p>{renderLines(getLines("section3.paragraph"))}</p>
                    <h3>{t(`${PRIVACY_T}.section3.institution.title`)}</h3>
                    {renderTable(getTable("section3.institution.table"), "section3-institution")}
                    <h3>{t(`${PRIVACY_T}.section3.legalProvision.title`)}</h3>
                    <p>{t(`${PRIVACY_T}.section3.legalProvision.description`)}</p>
                    {renderOrderedList(getList("section3.legalProvision.list"), "section3-legal-provision")}
                    <h3>{t(`${PRIVACY_T}.section3.permissionNotice.title`)}</h3>
                    <p>{renderLines(getLines("section3.permissionNotice.paragraph"))}</p>
                </section>

                <section>
                    <h2>{t(`${PRIVACY_T}.section4.title`)}</h2>
                    <p>{t(`${PRIVACY_T}.section4.description`)}</p>
                    {renderTable(getTable("section4.table"), "section4")}
                    <p>{t(`${PRIVACY_T}.section4.footer`)}</p>
                </section>

                <section>
                    <h2>{t(`${PRIVACY_T}.section5.title`)}</h2>
                    <p>{t(`${PRIVACY_T}.section5.description`)}</p>
                    {renderTable(getTable("section5.table"), "section5")}
                    <p>{renderLines(getLines("section5.paragraph1"))}</p>
                    <p>{renderLines(getLines("section5.paragraph2"))}</p>
                </section>

                <section>
                    <h2>{t(`${PRIVACY_T}.section6.title`)}</h2>
                    <p>{t(`${PRIVACY_T}.section6.description`)}</p>
                    {renderProcedureList(getProcedureList("section6.list"), "section6")}
                </section>

                <section>
                    <h2>{t(`${PRIVACY_T}.section7.title`)}</h2>
                    <p>{t(`${PRIVACY_T}.section7.description`)}</p>
                    {renderOrderedList(getList("section7.rights"), "section7-rights")}
                    <p>{t(`${PRIVACY_T}.section7.paragraph1`)}</p>
                    <p>{t(`${PRIVACY_T}.section7.paragraph2`)}</p>
                    {renderUnorderedList(getList("section7.selfService"), "section7-self-service")}
                    <p>{renderLines(getLines("section7.paragraph3"))}</p>
                </section>

                <section>
                    <h2>{t(`${PRIVACY_T}.section8.title`)}</h2>
                    <p>{t(`${PRIVACY_T}.section8.description1`)}</p>
                    {renderOrderedList(getList("section8.measures"), "section8-measures")}
                    <p>{t(`${PRIVACY_T}.section8.description2`)}</p>
                    {renderUnorderedList(getList("section8.encryptionScopes"), "section8-encryption-scopes")}
                </section>

                <section>
                    <h2>{t(`${PRIVACY_T}.section9.title`)}</h2>
                    <p>{renderLines(getLines("section9.paragraph"))}</p>
                    {renderDefinitionList(getDefinitionList("section9.list"), "section9")}
                    <p>{t(`${PRIVACY_T}.section9.footer`)}</p>
                </section>

                <section>
                    <h2>{t(`${PRIVACY_T}.section10.title`)}</h2>
                    <p>{renderLines(getLines("section10.paragraph"))}</p>
                    {renderOrderedList(getList("section10.criteria"), "section10-criteria")}
                </section>

                <section>
                    <h2>{t(`${PRIVACY_T}.section11.title`)}</h2>
                    <p>{t(`${PRIVACY_T}.section11.paragraph1`)}</p>
                    <p>{t(`${PRIVACY_T}.section11.paragraph2`)}</p>
                </section>

                <section>
                    <h2>{t(`${PRIVACY_T}.section12.title`)}</h2>
                    <p>{t(`${PRIVACY_T}.section12.paragraph1`)}</p>
                    <p>{t(`${PRIVACY_T}.section12.paragraph2`)}</p>
                </section>

                <section>
                    <h2>{t(`${PRIVACY_T}.section13.title`)}</h2>
                    {renderTable(getTable("section13.table"), "section13")}
                    <p>{t(`${PRIVACY_T}.section13.paragraph`)}</p>
                </section>

                <section>
                    <h2>{t(`${PRIVACY_T}.section14.title`)}</h2>
                    <p>{t(`${PRIVACY_T}.section14.paragraph`)}</p>
                    {renderOrderedList(getList("section14.agencies"), "section14-agencies")}
                </section>

                <section>
                    <h2>{t(`${PRIVACY_T}.section15.title`)}</h2>
                    <p>{t(`${PRIVACY_T}.section15.effectiveDate`)}</p>
                    <p>{t(`${PRIVACY_T}.section15.paragraph`)}</p>
                </section>
            </main>
        </div>
    );
}
