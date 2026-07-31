// Numele mai multor pasageri sunt salvate concatenat pe aceeași rezervare:
// firstName = "Anisoara, Ana", lastName = "Lemnaru, Lemnaru" (join cu ", ").
// Trebuie re-împerecheate PER PASAGER la afișare — altfel iese aiurea:
// `${lastName} ${firstName}` = "Lemnaru, Lemnaru Anisoara, Ana" în loc de
// "Lemnaru Anisoara, Lemnaru Ana".

export function splitPassengers(
  firstName: string,
  lastName: string
): { firstName: string; lastName: string }[] {
  const firsts = (firstName || "").split(",").map((s) => s.trim()).filter(Boolean);
  const lasts = (lastName || "").split(",").map((s) => s.trim()).filter(Boolean);
  const n = Math.max(firsts.length, lasts.length, 1);
  return Array.from({ length: n }, (_, i) => ({
    firstName: firsts[i] ?? firsts[0] ?? "",
    lastName: lasts[i] ?? lasts[0] ?? "",
  }));
}

// Numele complet al fiecărui pasager, separați prin ", ".
// Formatul canonic (peste tot: website, emailuri, panou operatori) e „Nume
// Prenume" per pasager → "Lemnaru Anisoara, Lemnaru Ana". `surnameFirst=false`
// dă „Prenume Nume", dacă e nevoie undeva.
export function formatPassengers(
  firstName: string,
  lastName: string,
  surnameFirst = true
): string {
  return splitPassengers(firstName, lastName)
    .map((p) => (surnameFirst ? `${p.lastName} ${p.firstName}` : `${p.firstName} ${p.lastName}`).trim())
    .join(", ");
}

// Prenumele primului pasager — pentru formule de adresare („Bună Anisoara,"),
// ca să nu apară niciodată concatenarea brută „Anisoara, Ana" în saluturi.
export function firstGivenName(firstName: string): string {
  return (firstName || "").split(",")[0].trim();
}
