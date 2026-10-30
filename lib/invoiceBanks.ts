// Conturile bancare tipărite în „Bank Details" pe proforme/facturi.
// Editează aici: un cont nou apare automat în formular. Documentele emise
// păstrează o copie a valorilor (snapshot), deci o modificare aici NU rescrie
// facturile vechi.

export type InvoiceBankAccount = {
  id: string;
  /** Eticheta din formularul de admin (nu se tipărește). */
  label: string;
  /** Valuta pentru care contul e propus implicit. */
  currency: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swift: string;
  bank: string;
};

export const INVOICE_BANK_ACCOUNTS: InvoiceBankAccount[] = [
  {
    id: "maib-gbp",
    label: "MAIB — GBP",
    currency: "GBP",
    accountName: "DAVO GROUP S.R.L.",
    accountNumber: "MD58AG000000022512300410",
    iban: "MD58AG000000022512300410",
    swift: "AGRNMD2X",
    bank: 'BC "MAIB" SA',
  },
  {
    id: "maib-eur",
    label: "MAIB Alecu Russo — EUR",
    currency: "EUR",
    accountName: "DAVO GROUP S.R.L.",
    accountNumber: "MD33AG000000022513845876",
    iban: "MD33AG000000022513845876",
    swift: "AGRNMD2X",
    bank: "BC'MAIB'S.A. suc.'Alecu Russo'",
  },
  {
    id: "maib-mdl",
    label: "MAIB — MDL",
    currency: "MDL",
    accountName: "DAVO GROUP S.R.L.",
    accountNumber: "MD29AG000000022512290650",
    iban: "MD29AG000000022512290650",
    swift: "AGRNMD2X",
    bank: "B.C. „Moldova-Agroindbank” S.A.",
  },
  // RON și USD: încă nu avem conturi — documentul alege explicit unul de mai sus.
];

export function bankAccountById(id: string): InvoiceBankAccount | undefined {
  return INVOICE_BANK_ACCOUNTS.find((a) => a.id === id);
}

export function defaultBankAccountFor(currency: string): InvoiceBankAccount | undefined {
  return INVOICE_BANK_ACCOUNTS.find((a) => a.currency === currency);
}
