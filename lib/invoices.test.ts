// Teste pentru proforme/facturi. Rulează cu: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  amountInWords,
  formatInvoiceDate,
  formatMoney,
  formatRate,
  integerToWords,
  invoiceFileName,
  invoiceTotals,
  nextInvoiceNumber,
  parseDay,
  parseInvoiceInput,
} from "./invoices";

test("suma în cuvinte ca pe factura de referință", () => {
  assert.equal(amountInWords(6130, "EUR"), "SIX THOUSAND ONE HUNDRED THIRTY EUROS ONLY");
  assert.equal(amountInWords(5040, "GBP"), "FIVE THOUSAND FORTY POUNDS ONLY");
});

test("suma în cuvinte: cenți, singular, zero, valori mari", () => {
  assert.equal(amountInWords(6130.5, "EUR"), "SIX THOUSAND ONE HUNDRED THIRTY EUROS AND FIFTY CENTS ONLY");
  assert.equal(amountInWords(1.01, "GBP"), "ONE POUND AND ONE PENNY ONLY");
  assert.equal(amountInWords(0.99, "USD"), "ZERO DOLLARS AND NINETY-NINE CENTS ONLY");
  assert.equal(amountInWords(1000.25, "MDL"), "ONE THOUSAND LEI AND TWENTY-FIVE BANI ONLY");
  assert.equal(amountInWords(1, "RON"), "ONE LEU ONLY");
  assert.equal(integerToWords(1_002_015), "ONE MILLION TWO THOUSAND FIFTEEN");
  assert.equal(integerToWords(110), "ONE HUNDRED TEN");
  assert.equal(integerToWords(0), "ZERO");
});

test("formatare bani: Rate fără zecimale când e întreg, restul cu 2 zecimale", () => {
  assert.equal(formatRate(5040, "GBP"), "£5,040");
  assert.equal(formatRate(140.5, "GBP"), "£140.50");
  assert.equal(formatMoney(5040, "GBP"), "£5,040.00");
  assert.equal(formatMoney(0, "EUR"), "€0.00");
  assert.equal(formatMoney(1234567.891, "USD"), "$1,234,567.89");
  assert.equal(formatMoney(1000, "MDL"), "MDL 1,000.00");
  assert.equal(formatMoney(12.5, "RON"), "RON 12.50");
});

test("totaluri: sumă, TVA, achitat parțial și integral", () => {
  const items = [
    { description: "a", taxRate: 0, quantity: 1, rate: 5040 },
    { description: "b", taxRate: 20, quantity: 3, rate: 10.33 },
  ];
  const t = invoiceTotals(items, 1000, "issued");
  assert.deepEqual(t.lines[1], { amount: 30.99, tax: 6.2, total: 37.19 });
  assert.equal(t.amount, 5070.99);
  assert.equal(t.tax, 6.2);
  assert.equal(t.total, 5077.19);
  assert.equal(t.paid, 1000);
  assert.equal(t.balance, 4077.19);

  const paid = invoiceTotals(items, null, "paid");
  assert.equal(paid.paid, 5077.19);
  assert.equal(paid.balance, 0);
  assert.equal(invoiceTotals(items, null, "issued").paid, 0);
});

test("numerotare: max din serie + 1, start implicit, sare peste numere ocupate", () => {
  assert.equal(nextInvoiceNumber("proforma", []), "DAV25493");
  assert.equal(nextInvoiceNumber("invoice", []), "DAV26003");
  assert.equal(nextInvoiceNumber("invoice", ["DAV26010", "DAV26004", "X-1"]), "DAV26011");
  // Un număr mai mic decât startul nu trage seria înapoi.
  assert.equal(nextInvoiceNumber("proforma", ["DAV100"]), "DAV25493");
  // Numărul propus e deja folosit (de cealaltă serie) → următorul liber.
  assert.equal(nextInvoiceNumber("proforma", ["DAV25999"], ["DAV25999", "DAV26000", "DAV26001"]), "DAV26002");
});

test("date în engleză și nume de fișier", () => {
  assert.equal(formatInvoiceDate(parseDay("2026-10-15")!), "Oct 15, 2026");
  assert.equal(parseDay("2026-02-30"), null);
  assert.equal(
    invoiceFileName("invoice", "DAV26002", "SC MIRBUS SRL"),
    "invoice-dav26002-davo-group-srl-sc-mirbus-srl",
  );
  assert.equal(
    invoiceFileName("proforma", "DAV25492", "Pro-Force Limited"),
    "proforma-dav25492-davo-group-srl-pro-force-limited",
  );
});

test("validare input", () => {
  const base = {
    type: "invoice",
    number: " dav26003 ",
    issueDate: "2026-10-12",
    dueDate: "",
    currency: "EUR",
    bankAccountId: "maib-eur",
    clientName: "SC MIRBUS SRL",
    items: [{ description: "x", taxRate: "0", quantity: "1", rate: "6130" }],
    status: "draft",
    showTotalInWords: true,
  };
  const ok = parseInvoiceInput(base);
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.data.number, "DAV26003");
    assert.equal(ok.data.dueDate, null);
    assert.equal(ok.data.items[0].rate, 6130);
  }
  assert.equal(parseInvoiceInput({ ...base, currency: "XYZ" }).ok, false);
  assert.equal(parseInvoiceInput({ ...base, items: [] }).ok, false);
  assert.equal(parseInvoiceInput({ ...base, items: [{ description: "x", quantity: 0, rate: 1 }] }).ok, false);
});
