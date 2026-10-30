// Replica A4 a proformelor/facturilor Refrens (referințele DAV25492 / DAV26002).
// Toate cotele sunt în pt, măsurate din PDF-urile originale (pagina 595.9pt).
//
// Fontul: originalul conține DOAR Open Sans Regular; „semibold"-ul e bold
// sintetic (aceleași lățimi de litere ca regular). De aceea încărcăm doar
// greutatea 400 și lăsăm browserul să sintetizeze bold-ul — rândurile se rup
// în aceleași locuri ca în original. Titlurile mov din original sunt puțin mai
// strânse (letter-spacing măsurat), iar subsolul e în DejaVu Sans (mai lat),
// imitat cu Open Sans 5.8pt.

import { Open_Sans } from "next/font/google";
import {
  amountInWords,
  formatInvoiceDate,
  formatMoney,
  formatPlain,
  formatRate,
} from "@/lib/invoices";
import type { InvoiceDTO } from "@/lib/invoiceStore";

const openSans = Open_Sans({ weight: "400", subsets: ["latin", "latin-ext"], display: "block" });

const CSS = `
@page { size: A4; margin: 0; }
.inv-sheet, .inv-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
.inv-sheet {
  position: relative; width: 210mm; min-height: 297mm; margin: 0 auto;
  padding: 0 28.18pt 40pt 27.83pt; background: #fff; color: #1D1D1D;
  font-size: 9.45pt; line-height: 12.87pt; font-weight: 400; text-align: left;
  font-synthesis: weight; -webkit-font-smoothing: antialiased;
}
.inv-sheet b { font-weight: 700; }
.inv-sheet p, .inv-sheet h2, .inv-sheet h3, .inv-sheet h4 { margin: 0; font-weight: 400; }
.inv-logo { position: absolute; top: 27.5pt; right: 27.7pt; width: 161.8pt; height: auto; }
.inv-title-row { display: flex; align-items: flex-start; padding-top: 26.41pt; margin-left: .21pt; }
.inv-title { font-size: 21.6pt; line-height: 29.42pt; color: #6539C0; white-space: nowrap; letter-spacing: -.8pt; }
.inv-pill {
  margin: 8.14pt 0 0 6.3pt; height: 14.39pt; padding: 1.05pt 4pt 0 4.12pt;
  font-size: 8.09pt; line-height: 11.02pt; color: #fff; background: #52C41A; border-radius: 2.5pt;
}
.inv-meta { margin: 9.82pt 0 0 .96pt; display: grid; grid-template-columns: 65.15pt auto; row-gap: 8.88pt; justify-content: start; }
.inv-meta dt { color: #7F7F7F; }
.inv-meta dd { margin: 0; font-weight: 700; }
.inv-parties { display: grid; grid-template-columns: 1fr 1fr; column-gap: 7.2pt; margin-top: 18.95pt; }
.inv-box { background: #EFEAF8; border-radius: 3.2pt; }
.inv-party { padding: 9.7pt 10pt 10.44pt 10.34pt; line-height: 14.25pt; overflow-wrap: anywhere; }
.inv-party h3 { font-size: 14.17pt; line-height: 19.3pt; color: #6539C0; margin-bottom: .81pt; letter-spacing: -.96pt; }
.inv-grid { display: grid; grid-template-columns: 22.67pt 202.36pt 37.42pt 57.92pt 49.06pt 63.6pt 42.58pt 1fr; }
.inv-thead { margin-top: 13.9pt; background: #6539C0; color: #fff; font-weight: 700; line-height: 14.25pt; padding: 4.18pt 0 6.2pt; border-radius: 3pt 3pt 0 0; }
.inv-row { background: #EFEAF8; line-height: 14pt; padding: 5.18pt 0 6.8pt; break-inside: avoid; }
.inv-row:last-child { border-radius: 0 0 3pt 3pt; }
.inv-grid > div { text-align: center; padding: 0 1pt; }
.inv-grid > .inv-c-no { text-align: left; padding-left: 5.6pt; }
.inv-grid > .inv-c-item { text-align: left; padding: 0 5.36pt; white-space: pre-line; overflow-wrap: anywhere; }
.inv-row > div:not(.inv-c-item) { align-self: center; }
.inv-lower { display: flex; align-items: flex-start; margin-top: 11.94pt; break-inside: avoid; }
.inv-left { width: 315.23pt; flex: none; }
.inv-sheet .inv-words { font-weight: 700; margin: 0 0 28.9pt .21pt; }
.inv-bank { padding: 6.34pt 10pt 9.25pt 14.46pt; }
.inv-bank h4 { font-size: 11.05pt; line-height: 15.05pt; color: #6539C0; margin: 0 0 -2.21pt -.75pt; letter-spacing: -.56pt; }
.inv-bank dl { margin: 0; display: grid; grid-template-columns: 143.91pt 1fr; line-height: 17.625pt; }
.inv-bank dt { font-weight: 700; }
.inv-bank dd { margin: 0; overflow-wrap: anywhere; }
.inv-totals { margin-left: auto; width: 198.6pt; flex: none; }
.inv-trow { display: flex; justify-content: space-between; gap: 6pt; padding-right: 11.19pt; }
.inv-trow + .inv-trow { margin-top: 12.63pt; }
.inv-total { display: grid; grid-template-columns: 103.2pt 1fr; column-gap: 1.44pt; margin-top: 18.88pt; font-size: 13.5pt; line-height: 18.38pt; font-weight: 700; white-space: nowrap; }
.inv-total > div { border-top: .5pt solid #000; border-bottom: 1pt solid #000; padding: 3.17pt 0 3.85pt; }
.inv-total > div + div { text-align: right; padding-right: 11.19pt; }
.inv-total + .inv-trow { margin-top: 13.35pt; }
.inv-paid { color: #201742; }
.inv-footer { position: absolute; left: 0; right: 0; bottom: 15pt; text-align: center; font-size: 5.73pt; line-height: 7.9pt; }
@media print {
  html, body { background: #fff !important; }
  .inv-sheet { margin: 0; box-shadow: none !important; }
  .inv-footer { position: fixed; }
}
`;

function clientLines(inv: InvoiceDTO): string[] {
  const lines = inv.clientAddress.split("\n").map((l) => l.trim()).filter(Boolean);
  const country = [inv.clientCountry, inv.clientPostcode].filter(Boolean).join(" - ");
  const after = [inv.clientCity ? `${inv.clientCity},` : null, country || null].filter(Boolean) as string[];
  if (lines.length && after.length && !lines[lines.length - 1].endsWith(",")) {
    lines[lines.length - 1] += ",";
  }
  return [...lines, ...after];
}

export default function InvoiceDocument({ invoice: inv }: { invoice: InvoiceDTO }) {
  const { totals } = inv;
  const cur = inv.currency;
  const isPaid = inv.status === "paid";
  const showPaid = totals.paid > 0;

  return (
    <div className={`inv-sheet ${openSans.className}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* eslint-disable-next-line @next/next/no-img-element -- trebuie să se tipărească identic, fără lazy-load */}
      <img className="inv-logo" src="/images/invoice/davo-group-logo.png" alt="DAVO GROUP" />

      <div className="inv-title-row">
        <h2 className="inv-title">{inv.type === "proforma" ? "Proforma Invoice" : "Invoice"}</h2>
        {isPaid && <span className="inv-pill">Paid</span>}
      </div>

      <dl className="inv-meta">
        <dt>Invoice No</dt>
        <dd>{inv.number}</dd>
        <dt>Invoice Date</dt>
        <dd>{formatInvoiceDate(inv.issueDate)}</dd>
        {inv.dueDate && (
          <>
            <dt>Due Date</dt>
            <dd>{formatInvoiceDate(inv.dueDate)}</dd>
          </>
        )}
        {inv.poNumber && (
          <>
            <dt>PO Number</dt>
            <dd>{inv.poNumber}</dd>
          </>
        )}
      </dl>

      <div className="inv-parties">
        <div className="inv-box inv-party">
          <h3>Billed By</h3>
          <p><b>DAVO GROUP S.R.L.</b></p>
          <p>Calea Ieșilor 11/3,</p>
          <p>Chisinau,</p>
          <p>Moldova - MD 2069</p>
          <p><b>Email:</b> info@davo.md</p>
          <p><b>Phone:</b> +373 680 65 699</p>
        </div>
        <div className="inv-box inv-party">
          <h3>Billed To</h3>
          <p><b>{inv.clientName}</b></p>
          {clientLines(inv).map((l, i) => (
            <p key={i}>{l}</p>
          ))}
          {inv.clientVat && (
            <p><b>VAT Number:</b> {inv.clientVat}</p>
          )}
        </div>
      </div>

      <div className="inv-grid inv-thead">
        <div className="inv-c-no" />
        <div className="inv-c-item">Item</div>
        <div>TAX Rate</div>
        <div>Quantity</div>
        <div>Rate</div>
        <div>Amount</div>
        <div>TAX</div>
        <div>Total</div>
      </div>
      <div>
        {inv.items.map((it, i) => (
          <div className="inv-grid inv-row" key={i}>
            <div className="inv-c-no">{i + 1}.</div>
            <div className="inv-c-item">{it.description}</div>
            <div>{formatPlain(it.taxRate)}%</div>
            <div>{formatPlain(it.quantity)}</div>
            <div>{formatRate(it.rate, cur)}</div>
            <div>{formatMoney(totals.lines[i].amount, cur)}</div>
            <div>{formatMoney(totals.lines[i].tax, cur)}</div>
            <div>{formatMoney(totals.lines[i].total, cur)}</div>
          </div>
        ))}
      </div>

      <div className="inv-lower">
        <div className="inv-left">
          {inv.showTotalInWords && (
            <p className="inv-words">Total (in words) : {amountInWords(totals.total, cur)}</p>
          )}
          <div className="inv-box inv-bank">
            <h4>Bank Details</h4>
            <dl>
              <dt>Account Name</dt>
              <dd>{inv.bank.accountName}</dd>
              <dt>Account Number</dt>
              <dd>{inv.bank.accountNumber}</dd>
              <dt>IBAN</dt>
              <dd>{inv.bank.iban}</dd>
              <dt>SWIFT Code</dt>
              <dd>{inv.bank.swift}</dd>
              <dt>Bank</dt>
              <dd>{inv.bank.bank}</dd>
            </dl>
          </div>
        </div>

        <div className="inv-totals">
          <div className="inv-trow">
            <span>Amount</span>
            <span>{formatMoney(totals.amount, cur)}</span>
          </div>
          <div className="inv-trow">
            <span>TAX</span>
            <span>{formatMoney(totals.tax, cur)}</span>
          </div>
          <div className="inv-total">
            <div>Total ({cur})</div>
            <div>{formatMoney(totals.total, cur)}</div>
          </div>
          {showPaid && (
            <div className="inv-trow inv-paid">
              <span>Amount Paid</span>
              <span>({formatMoney(totals.paid, cur)})</span>
            </div>
          )}
          {showPaid && totals.balance > 0 && (
            <div className="inv-trow">
              <span>Balance Due</span>
              <span>{formatMoney(totals.balance, cur)}</span>
            </div>
          )}
        </div>
      </div>

      <p className="inv-footer">This is an electronically generated document, no signature is required.</p>
    </div>
  );
}
