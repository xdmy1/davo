import type { Booking } from "@prisma/client";

const dateFmt = new Intl.DateTimeFormat("ro-RO", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("ro-RO", {
  hour: "2-digit",
  minute: "2-digit",
});

// Buton V/X — același pattern ca în emailul de confirmare.
function responseButtons(opts?: {
  confirmUrl?: string;
  cancelUrl?: string;
  intro?: string;
}): string {
  if (!opts?.confirmUrl || !opts?.cancelUrl) return "";
  const intro =
    opts.intro ??
    "Confirmă-ne din timp dacă mai vii sau dacă anulezi — eliberăm locul pentru altcineva.";
  return `
  <div style="background:#f5f7fb;border-radius:12px;padding:22px;margin:24px 0;text-align:center;border:1px solid #e2e8f0;">
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#e11e2b;margin-bottom:10px;">
      Mai vii la cursă?
    </div>
    <p style="margin:0 0 16px;color:#475569;font-size:13px;">${intro}</p>
    <table cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
      <tr>
        <td style="padding:0 5px;">
          <a href="${opts.confirmUrl}" style="display:inline-block;background:#10c49b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;font-size:13px;">
            ✓ Confirm că vin
          </a>
        </td>
        <td style="padding:0 5px;">
          <a href="${opts.cancelUrl}" style="display:inline-block;background:#fff;color:#b91c1c;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;font-size:13px;border:2px solid #fecaca;">
            ✗ Anulez
          </a>
        </td>
      </tr>
    </table>
  </div>`;
}

function layout(
  title: string,
  headline: string,
  body: string,
  cta?: { label: string; href: string }
) {
  const ctaBlock = cta
    ? `<div style="text-align:center;margin:30px 0;">
        <a href="${cta.href}" style="display:inline-block;background:#e11e2b;color:white;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:700;letter-spacing:0.02em;box-shadow:0 12px 30px -10px rgba(225,30,43,0.5);">${cta.label}</a>
      </div>`
    : "";
  return `<!DOCTYPE html>
<html lang="ro"><head><meta charset="UTF-8"><title>${title}</title></head>
<body style="font-family:Segoe UI,Tahoma,sans-serif;background:#f5f7fb;margin:0;padding:20px;color:#0b2653;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 30px 60px -30px rgba(11,38,83,0.25);">
    <div style="background:linear-gradient(135deg,#0b2653,#143a7a);padding:30px 20px;text-align:center;">
      <div style="color:#ff7a85;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;">DAVO Group</div>
      <h1 style="color:white;margin:0;font-size:24px;font-weight:800;">${headline}</h1>
    </div>
    <div style="padding:30px;color:#475569;line-height:1.6;font-size:15px;">
      ${body}
      ${ctaBlock}
    </div>
    <div style="background:#0b2653;color:white;padding:20px;text-align:center;font-size:12px;">
      © ${new Date().getFullYear()} DAVO Group · <a href="tel:+37368065699" style="color:#ff7a85;text-decoration:none;font-weight:600;">+373 68 065 699</a> · <a href="mailto:info@davo.md" style="color:#ff7a85;text-decoration:none;">info@davo.md</a>
    </div>
  </div>
</body></html>`;
}

export type ResponseUrls = { confirmUrl?: string; cancelUrl?: string };

export function reminder24hHtml(b: Booking, urls?: ResponseUrls): string {
  const date = dateFmt.format(b.departureDate);
  const time = timeFmt.format(b.departureDate);
  return layout(
    "Mâine pleci cu DAVO",
    "Mâine pleci în călătorie",
    `
    <p>Bună <strong style="color:#0b2653;">${b.firstName}</strong>,</p>
    <p>Îți reamintim că <strong style="color:#0b2653;">mâine, ${date}, la ora ${time}</strong>, pleacă cursa ta
    <strong style="color:#0b2653;">${b.departureCity} → ${b.arrivalCity}</strong>.</p>

    ${responseButtons({
      ...urls,
      intro:
        "Mâine e ziua mare. Confirmă-ne că vii sau anulează acum dacă nu mai poți.",
    })}

    <div style="background:#f5f7fb;border-left:4px solid #e11e2b;padding:15px 18px;margin:20px 0;border-radius:6px;">
      <strong style="color:#0b2653;">Pregătește pentru drum:</strong>
      <ul style="margin:8px 0 0 0;padding-left:20px;">
        <li>Buletin / pașaport valabil</li>
        <li>Bagaj de mână + bagaj de cală (max. 35 kg)</li>
        <li>Rezervarea tipărită sau pe telefon</li>
      </ul>
    </div>
    <p>Sosește la punctul de îmbarcare cu minim <strong>30 de minute înainte</strong> de plecare.</p>
    <p style="color:#64748b;font-size:13px;">Număr rezervare: <strong style="color:#0b2653;font-family:'Courier New',monospace;">${b.bookingNumber}</strong></p>
  `,
    b.ticketUrl ? { label: "Vezi biletul electronic", href: b.ticketUrl } : undefined
  );
}

export function reminder2hHtml(b: Booking, urls?: ResponseUrls): string {
  const time = timeFmt.format(b.departureDate);
  return layout(
    "Cursa pleacă în 2 ore",
    "Cursa ta pleacă în 2 ore",
    `
    <p><strong style="color:#0b2653;">${b.firstName}</strong>, cursa ta <strong style="color:#0b2653;">${b.departureCity} → ${b.arrivalCity}</strong>
    pleacă la ora <strong style="color:#e11e2b;font-size:18px;">${time}</strong>.</p>
    <p>Ajungi la timp dacă pleci acum spre punctul de îmbarcare. Drum bun!</p>

    ${responseButtons({
      ...urls,
      intro:
        "Dacă s-a schimbat ceva, anunță-ne acum cu un click. Altfel, te așteptăm la îmbarcare.",
    })}

    <p style="color:#64748b;font-size:13px;">Număr rezervare: <strong style="color:#0b2653;font-family:'Courier New',monospace;">${b.bookingNumber}</strong>
    · Dispecerat 24/7: <a href="tel:+37368065699" style="color:#e11e2b;font-weight:600;text-decoration:none;">+373 68 065 699</a></p>
  `,
    b.ticketUrl ? { label: "Vezi biletul electronic", href: b.ticketUrl } : undefined
  );
}

export function cancellationHtml(b: Booking): string {
  return layout(
    "Rezervare anulată",
    "Rezervarea ta a fost anulată",
    `
    <p>Bună <strong style="color:#0b2653;">${b.firstName}</strong>,</p>
    <p>Am înregistrat anularea rezervării <strong style="color:#0b2653;font-family:'Courier New',monospace;">#${b.bookingNumber}</strong> pentru cursa
    <strong style="color:#0b2653;">${b.departureCity} → ${b.arrivalCity}</strong> din data
    <strong style="color:#0b2653;">${dateFmt.format(b.departureDate)}</strong>.</p>
    ${
      b.paymentStatus === "paid"
        ? `<p>Suma de <strong style="color:#0b2653;">${b.price} ${b.currency}</strong> va fi rambursată în 5-7 zile
        lucrătoare pe aceeași metodă de plată.</p>`
        : `<p>Plata urma să se facă la îmbarcare/livrare, deci nu există o sumă de rambursat.</p>`
    }
    <p>Pentru detalii sau o nouă rezervare ne poți contacta la <a href="tel:+37368065699" style="color:#e11e2b;font-weight:600;">+373 68 065 699</a>
    sau <a href="mailto:info@davo.md" style="color:#e11e2b;font-weight:600;">info@davo.md</a>.</p>
  `
  );
}

export function subjectForType(type: string, bookingNumber: string): string {
  switch (type) {
    case "confirmation":
      return `Confirmare Rezervare DAVO - ${bookingNumber}`;
    case "reminder_24h":
      return "Mâine pleci în călătorie cu DAVO";
    case "reminder_2h":
      return "Cursa ta pleacă în 2 ore";
    case "cancellation":
      return `Rezervarea ta #${bookingNumber} a fost anulată`;
    default:
      return "DAVO Group";
  }
}
