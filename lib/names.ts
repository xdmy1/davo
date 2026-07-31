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
// `surnameFirst` → "Nume Prenume" (convenția din panoul operatorilor);
// implicit „Prenume Nume".
export function formatPassengers(
  firstName: string,
  lastName: string,
  surnameFirst = false
): string {
  return splitPassengers(firstName, lastName)
    .map((p) => (surnameFirst ? `${p.lastName} ${p.firstName}` : `${p.firstName} ${p.lastName}`).trim())
    .join(", ");
}
