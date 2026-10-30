/**
 * Un număr de înmatriculare scris oricum („daw077”, „ DAW-077 ”) → forma din listă („DAW 077”):
 * majuscule, liniuțele și spațiile multiple devin un spațiu, iar un „ABC123” lipit primește spațiul.
 * null când nu e un număr plauzibil (2–12 caractere, litere/cifre).
 */
export function normalizePlate(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let s = input.toUpperCase().replace(/[-_.]+/g, " ").replace(/\s+/g, " ").trim();
  if (/^[A-Z]{2,3}\d{2,4}$/.test(s)) s = s.replace(/^([A-Z]{2,3})(\d+)$/, "$1 $2");
  if (!/^[A-Z0-9 ]{2,12}$/.test(s) || !/\d/.test(s)) return null;
  return s;
}
