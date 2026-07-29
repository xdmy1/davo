/**
 * Catalogul secțiunilor din panoul operatorilor (rezervari.davo.md).
 *
 * E o copie deliberată a listei din `lib/operatorPermissions.ts` al repo-ului
 * rezervari: panoul „Conturi & Acces" trăiește aici, în davo, dar acordă
 * permisiuni pentru un deploy separat — între cele două repo-uri nu există
 * import posibil, doar baza de date comună (`Operator.permissions`).
 *
 * Sursa de adevăr la execuție rămâne fișierul din repo-ul rezervari; aici
 * ținem doar ce trebuie să vadă adminul când bifează permisiuni. Cheile
 * TREBUIE să rămână identice în cele două locuri, altfel adminul salvează
 * chei pe care panoul operatorilor nu le recunoaște.
 */

export type RezervariRole = "operator" | "supervisor";

export type RezervariSection = {
  key: string;
  label: string;
  group: string;
  ui: string[]; // prefixe de path din panoul operatorilor
};

export const REZERVARI_SECTIONS: RezervariSection[] = [
  { key: "active", label: "Rezervări active", group: "Panou operatori", ui: ["/panou"] },
  { key: "rezervare", label: "Rezervare nouă", group: "Panou operatori", ui: ["/panou/rezervare"] },
  { key: "arhiva", label: "Arhivă", group: "Panou operatori", ui: ["/panou/arhiva"] },
  {
    key: "operatori",
    label: "Gestiune operatori",
    group: "Panou operatori",
    ui: ["/panou/operatori"],
  },
];

export const REZERVARI_ROLE_PRESETS: Record<RezervariRole, string[]> = {
  operator: ["active", "rezervare", "arhiva"],
  supervisor: REZERVARI_SECTIONS.map((s) => s.key),
};

/** Default „operator": rolul cu cele mai puține drepturi, când valoarea e necunoscută. */
export function normalizeRezervariRole(value: string | null | undefined): RezervariRole {
  return value === "supervisor" ? "supervisor" : "operator";
}

export function isRezervariSectionKey(key: string): boolean {
  return REZERVARI_SECTIONS.some((s) => s.key === key);
}
