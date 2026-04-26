import type { Booking } from "@prisma/client";

const dateFmt = new Intl.DateTimeFormat("ro-RO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("ro-RO", {
  hour: "2-digit",
  minute: "2-digit",
});

function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit && !explicit.includes("localhost")) return explicit;
  const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prodHost) return `https://${prodHost}`;
  return explicit || "http://localhost:3000";
}

function logoUrl(): string {
  return `${appUrl()}/images/logo-davo.png`;
}

function ticketUrlFor(bookingNumber: string): string {
  return `${appUrl()}/bilet/${bookingNumber}`;
}

function formatDate(d: Date): string {
  return dateFmt.format(d);
}

function formatTime(d: Date): string {
  return timeFmt.format(d);
}

function formatPrice(amount: number, currency: string): string {
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : currency;
  return `${amount} ${symbol}`;
}

export type ResponseUrls = { confirmUrl?: string; cancelUrl?: string };

// ----- Building blocks -----

type DetailRow = { label: string; value: string };

function detailsCard(rows: DetailRow[]): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:0 0 24px;">
    ${rows
      .map(
        (r, i) => `
    <tr>
      <td style="padding:14px 18px;${i < rows.length - 1 ? "border-bottom:1px solid #e2e8f0;" : ""}">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;">${r.label}</div>
        <div style="margin-top:4px;font-size:15px;font-weight:600;color:#0b2653;">${r.value}</div>
      </td>
    </tr>`
      )
      .join("")}
  </table>`;
}

function vxButtons(urls: ResponseUrls, intro?: string): string {
  if (!urls.confirmUrl || !urls.cancelUrl) return "";
  const text =
    intro ??
    "Apasă pe unul din butoane ca să ne confirmi prezența. Dacă nu mai poți, anulează — eliberăm locul.";
  return `
  <div style="margin:0 0 24px;">
    <div style="font-size:18px;font-weight:800;color:#0b2653;margin-bottom:6px;">Mai vii la cursă?</div>
    <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.5;">${text}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td width="50%" style="padding-right:6px;">
          <a href="${urls.confirmUrl}"
             style="display:block;background:#10c49b;color:#ffffff;text-align:center;text-decoration:none;padding:16px 12px;border-radius:10px;font-weight:700;font-size:15px;">
            ✓ Confirm că vin
          </a>
        </td>
        <td width="50%" style="padding-left:6px;">
          <a href="${urls.cancelUrl}"
             style="display:block;background:#ffffff;color:#b91c1c;text-align:center;text-decoration:none;padding:14px 12px;border-radius:10px;font-weight:700;font-size:15px;border:2px solid #fecaca;">
            ✗ Nu mai pot
          </a>
        </td>
      </tr>
    </table>
  </div>`;
}

function ticketButton(bookingNumber: string): string {
  const href = ticketUrlFor(bookingNumber);
  return `
  <div style="margin:0 0 24px;">
    <a href="${href}"
       style="display:inline-block;color:#0b2653;text-decoration:none;font-weight:700;font-size:14px;border-bottom:2px solid #e11e2b;padding-bottom:2px;">
      📄 Vezi biletul electronic
    </a>
  </div>`;
}

// ----- Layout -----

function layout(opts: {
  preheader?: string;
  title: string;
  body: string;
}): string {
  const { preheader = "", title, body } = opts;
  return `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Tahoma,sans-serif;color:#0b2653;">
  ${
    preheader
      ? `<div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>`
      : ""
  }
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 20px 40px -20px rgba(11,38,83,0.18);">
          <tr>
            <td style="padding:28px 28px 8px;text-align:left;">
              <img src="${logoUrl()}" alt="DAVO Group" width="130" height="35" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:130px;">
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 32px;font-size:15px;line-height:1.55;color:#0b2653;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 28px;font-size:13px;color:#64748b;text-align:center;">
              Întrebări?
              <a href="tel:+37368065699" style="color:#0b2653;font-weight:700;text-decoration:none;">+373 68 065 699</a>
              ·
              <a href="mailto:info@davo.md" style="color:#0b2653;font-weight:700;text-decoration:none;">info@davo.md</a>
              <div style="margin-top:6px;font-size:11px;color:#94a3b8;">© ${new Date().getFullYear()} DAVO Group</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ----- Confirmation -----

export type ConfirmationData = {
  bookingNumber: string;
  type: "passenger" | "parcel";
  tripType?: "one-way" | "round-trip";
  firstName: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: Date;
  returnDate?: Date | null;
  adults: number;
  children: number;
  parcelDetails?: string | null;
  price: number;
  currency: string;
  payMethod?: string | null;
};

function paxLine(adults: number, children: number): string {
  const a = `${adults} ${adults === 1 ? "adult" : "adulți"}`;
  return children > 0 ? `${a}, ${children} ${children === 1 ? "copil" : "copii"}` : a;
}

function payLabel(payMethod?: string | null): string {
  if (payMethod === "card_on_pickup") return "Card la îmbarcare (POS la șofer)";
  if (payMethod === "cash_on_pickup") return "Cash la îmbarcare";
  if (payMethod === "cash_on_delivery") return "Cash la livrare";
  return "La îmbarcare";
}

export function confirmationHtml(b: ConfirmationData, urls?: ResponseUrls): string {
  const isParcel = b.type === "parcel";
  const isRoundTrip = b.tripType === "round-trip";

  const rows: DetailRow[] = [
    { label: "Cursa", value: `${b.departureCity} → ${b.arrivalCity}` },
    {
      label: "Plecare",
      value: `${formatDate(b.departureDate)} · ${formatTime(b.departureDate)}`,
    },
  ];
  if (isRoundTrip && b.returnDate) {
    rows.push({
      label: "Întoarcere",
      value: `${formatDate(b.returnDate)} · ${formatTime(b.returnDate)}`,
    });
  }
  if (isParcel && b.parcelDetails) {
    rows.push({ label: "Colet", value: b.parcelDetails });
  } else if (!isParcel) {
    rows.push({ label: "Pasageri", value: paxLine(b.adults, b.children) });
  }
  rows.push({ label: "Total", value: formatPrice(b.price, b.currency) });
  rows.push({ label: "Plata", value: payLabel(b.payMethod) });
  rows.push({ label: "Nr. rezervare", value: b.bookingNumber });

  const body = `
    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#10c49b;margin-bottom:6px;">✓ Rezervare confirmată</div>
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#0b2653;line-height:1.2;">Bună ${b.firstName}, te așteptăm la cursă</h1>
    <p style="margin:0 0 22px;font-size:14px;color:#475569;line-height:1.55;">
      ${
        isParcel
          ? "Mai jos sunt detaliile transportului tău. Te sunăm pentru confirmare și ridicare."
          : "Mai jos sunt detaliile călătoriei tale. Sosește la îmbarcare cu 30 min înainte de plecare."
      }
    </p>
    ${detailsCard(rows)}
    ${urls ? vxButtons(urls, "Confirmă-ne acum că vii sau anulează — durează 1 secundă, ne ajuți să gestionăm locurile.") : ""}
    ${ticketButton(b.bookingNumber)}
  `;

  return layout({
    preheader: `Rezervare ${b.bookingNumber} confirmată — ${b.departureCity} → ${b.arrivalCity}`,
    title: `Confirmare rezervare DAVO — ${b.bookingNumber}`,
    body,
  });
}

// ----- Reminders -----

export function reminder24hHtml(b: Booking, urls?: ResponseUrls): string {
  const body = `
    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#e11e2b;margin-bottom:6px;">Mâine pleci</div>
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#0b2653;line-height:1.2;">Bună ${b.firstName}, mâine e ziua mare</h1>
    <p style="margin:0 0 22px;font-size:14px;color:#475569;line-height:1.55;">Cursa ta pleacă mâine. Aruncă o privire pe detalii și confirmă-ne că vii.</p>
    ${detailsCard([
      { label: "Cursa", value: `${b.departureCity} → ${b.arrivalCity}` },
      { label: "Plecare", value: `${formatDate(b.departureDate)} · ${formatTime(b.departureDate)}` },
      { label: "Nr. rezervare", value: b.bookingNumber },
    ])}
    ${urls ? vxButtons(urls, "Mai vii la cursă? Confirmă-ne acum sau anulează dacă nu mai poți.") : ""}
    ${ticketButton(b.bookingNumber)}
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:14px 16px;font-size:13px;color:#78350f;line-height:1.5;">
      <strong>Pentru drum:</strong> buletin/pașaport valabil, max. 35 kg bagaj, sosește cu 30 min înainte de plecare.
    </div>
  `;
  return layout({
    preheader: `Cursa ta pleacă mâine — ${b.departureCity} → ${b.arrivalCity}`,
    title: "Mâine pleci cu DAVO",
    body,
  });
}

export function reminder2hHtml(b: Booking, urls?: ResponseUrls): string {
  const body = `
    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#e11e2b;margin-bottom:6px;">Pleci în 2 ore</div>
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#0b2653;line-height:1.2;">${b.firstName}, e timpul să pornești</h1>
    <p style="margin:0 0 22px;font-size:14px;color:#475569;line-height:1.55;">
      Cursa <strong style="color:#0b2653;">${b.departureCity} → ${b.arrivalCity}</strong>
      pleacă la ora <strong style="color:#e11e2b;">${formatTime(b.departureDate)}</strong>.
      Pleacă acum spre punctul de îmbarcare.
    </p>
    ${urls ? vxButtons(urls, "Dacă ceva s-a schimbat, anunță-ne acum cu un click.") : ""}
    ${ticketButton(b.bookingNumber)}
    <p style="margin:0;font-size:13px;color:#64748b;">
      Nr. rezervare: <strong style="color:#0b2653;">${b.bookingNumber}</strong>
    </p>
  `;
  return layout({
    preheader: `Cursa ${b.bookingNumber} pleacă la ${formatTime(b.departureDate)}`,
    title: "Cursa ta pleacă în 2 ore",
    body,
  });
}

// ----- Cancellation -----

export function cancellationHtml(b: Booking): string {
  const refundLine =
    b.paymentStatus === "paid"
      ? `Suma de <strong style="color:#0b2653;">${formatPrice(b.price, b.currency)}</strong> va fi rambursată în 5–7 zile lucrătoare pe aceeași metodă de plată.`
      : "Plata urma să se facă la îmbarcare/livrare, deci nu există o sumă de rambursat.";

  const body = `
    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#64748b;margin-bottom:6px;">Anulată</div>
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#0b2653;line-height:1.2;">Bună ${b.firstName}, rezervarea a fost anulată</h1>
    <p style="margin:0 0 22px;font-size:14px;color:#475569;line-height:1.55;">${refundLine}</p>
    ${detailsCard([
      { label: "Cursa", value: `${b.departureCity} → ${b.arrivalCity}` },
      { label: "Plecare", value: formatDate(b.departureDate) },
      { label: "Nr. rezervare", value: b.bookingNumber },
    ])}
    <p style="margin:0;font-size:14px;color:#475569;line-height:1.55;">
      Vrei o nouă rezervare? Sună la
      <a href="tel:+37368065699" style="color:#e11e2b;font-weight:700;text-decoration:none;">+373 68 065 699</a>
      sau scrie pe
      <a href="mailto:info@davo.md" style="color:#e11e2b;font-weight:700;text-decoration:none;">info@davo.md</a>.
    </p>
  `;
  return layout({
    preheader: `Rezervarea ${b.bookingNumber} a fost anulată`,
    title: "Rezervare anulată",
    body,
  });
}

// ----- Admin notification -----

export function adminNotificationHtml(b: ConfirmationData): string {
  const isParcel = b.type === "parcel";
  const rows: DetailRow[] = [
    { label: "Nr. rezervare", value: b.bookingNumber },
    { label: "Tip", value: isParcel ? "Colet" : "Pasager" },
    { label: "Client", value: b.firstName },
    { label: "Cursa", value: `${b.departureCity} → ${b.arrivalCity}` },
    { label: "Plecare", value: `${formatDate(b.departureDate)} · ${formatTime(b.departureDate)}` },
  ];
  if (!isParcel) {
    rows.push({ label: "Pasageri", value: paxLine(b.adults, b.children) });
  }
  rows.push({ label: "Total", value: formatPrice(b.price, b.currency) });
  rows.push({ label: "Plata", value: payLabel(b.payMethod) });

  const body = `
    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#e11e2b;margin-bottom:6px;">🔔 Rezervare nouă</div>
    <h1 style="margin:0 0 22px;font-size:22px;font-weight:800;color:#0b2653;line-height:1.2;">${b.firstName} a făcut o rezervare</h1>
    ${detailsCard(rows)}
    <a href="${appUrl()}/admin/bookings" style="display:inline-block;background:#0b2653;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-size:14px;">
      Vezi în panoul admin
    </a>
  `;
  return layout({
    preheader: `Rezervare nouă ${b.bookingNumber}`,
    title: `Rezervare nouă — ${b.bookingNumber}`,
    body,
  });
}

// ----- Subjects -----

export function subjectForType(type: string, bookingNumber: string): string {
  switch (type) {
    case "confirmation":
      return `Rezervare confirmată — DAVO ${bookingNumber}`;
    case "reminder_24h":
      return "Mâine pleci cu DAVO — confirmă-ne că vii";
    case "reminder_2h":
      return "Cursa ta pleacă în 2 ore";
    case "cancellation":
      return `Rezervare ${bookingNumber} anulată`;
    default:
      return "DAVO Group";
  }
}
