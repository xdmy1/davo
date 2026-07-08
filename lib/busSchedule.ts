// REGULĂ RECURENTĂ a autobuzelor, per ȚARĂ (sursa: programul real aliniat, iul
// 2026). Cursele create lazy (ensureTripsForSchedule) primesc autobuzul corect
// din start, ca panoul operatorilor și davo.md să fie sincronizate.
//   Anglia + Luxemburg      → DAW 077
//   Germania + Belgia + Olanda → ZNQ 874

function isMD(c?: string | null): boolean {
  return /moldova/i.test(c ?? "");
}

export function busPlateForCountry(country: string): string | null {
  const c = (country || "").trim().toLowerCase();
  if (c === "anglia" || c === "luxemburg") return "DAW 077";
  if (c === "germania" || c === "belgia" || c === "olanda") return "ZNQ 874";
  return null;
}

export function busPlateForRun(originCountry?: string | null, destCountry?: string | null): string | null {
  const nonMD = isMD(originCountry) ? destCountry : originCountry;
  return busPlateForCountry(nonMD ?? "");
}
