import { Resend } from 'resend'
import { qrPngUrl } from './qr'

let _resend: Resend | null = null
export function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

export interface BookingConfirmationData {
  bookingNumber: string
  type: 'passenger' | 'parcel'
  tripType?: 'one-way' | 'round-trip'
  firstName: string
  lastName: string
  email: string
  phone: string
  departureCity: string
  arrivalCity: string
  departureDate: Date
  returnDate?: Date | null
  adults: number
  children: number
  parcelDetails?: string | null
  price: number
  currency: string
  ticketUrl: string
  confirmUrl?: string
  cancelUrl?: string
  trackUrl?: string
  payMethod?: string | null
}

export function generateBookingEmailHtml(data: BookingConfirmationData): string {
  const isRoundTrip = data.tripType === 'round-trip'
  const departureDate = new Date(data.departureDate).toLocaleDateString('ro-RO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const returnDate = data.returnDate
    ? new Date(data.returnDate).toLocaleDateString('ro-RO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null

  const tripTypeLabel = data.type === 'passenger' ? 'Călătorie' : 'Transport colet'
  const ticketButtonText = data.type === 'passenger' ? 'Vezi biletul electronic' : 'Vezi confirmarea'

  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmare Rezervare - DAVO Group</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #0b2653;
      background-color: #f5f7fb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #0b2653 0%, #143a7a 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .header p {
      color: rgba(255,255,255,0.9);
      margin: 10px 0 0 0;
    }
    .content {
      padding: 40px 30px;
    }
    .booking-number {
      background: #0b2653;
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      text-align: center;
      margin-bottom: 30px;
      border: 1px solid rgba(225,30,43,0.3);
    }
    .booking-number .label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #ff7a85;
      font-weight: 700;
    }
    .booking-number .number {
      font-size: 24px;
      font-weight: bold;
      margin-top: 5px;
      letter-spacing: 0.1em;
      font-family: 'Courier New', monospace;
    }
    .info-section {
      background: #f5f7fb;
      border-radius: 10px;
      padding: 25px;
      margin-bottom: 20px;
      border: 1px solid #e2e8f0;
    }
    .info-section h3 {
      color: #e11e2b;
      margin: 0 0 15px 0;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 800;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #475569;
      font-weight: 500;
    }
    .info-value {
      color: #0b2653;
      font-weight: 600;
      text-align: right;
    }
    .price {
      background: #f5f7fb;
      border: 2px solid #0b2653;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      margin: 25px 0;
    }
    .price .amount {
      font-size: 32px;
      font-weight: 800;
      color: #0b2653;
    }
    .price .label {
      color: #64748b;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
    }
    .cta-button {
      display: inline-block;
      background: #e11e2b;
      color: white;
      padding: 15px 40px;
      text-decoration: none;
      border-radius: 50px;
      font-weight: bold;
      margin: 20px 0;
      text-align: center;
      box-shadow: 0 12px 30px -10px rgba(225,30,43,0.5);
    }
    .footer {
      background: #0b2653;
      color: white;
      padding: 30px;
      text-align: center;
    }
    .footer .contact {
      margin-bottom: 15px;
    }
    .footer .contact-item {
      display: inline-block;
      margin: 5px 15px;
    }
    .social-links {
      margin-top: 20px;
    }
    .social-links a {
      display: inline-block;
      margin: 0 10px;
      color: #ff7a85;
      text-decoration: none;
    }
    .important {
      background: #f5f7fb;
      border-left: 4px solid #e11e2b;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .status {
      display: inline-block;
      background: #10c49b;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DAVO Group</h1>
      <p>Confirmare Rezervare</p>
    </div>

    <div class="content">
      <div style="text-align: center; margin-bottom: 30px;">
        <span class="status">✓ Rezervare Confirmată</span>
      </div>

      <div class="booking-number">
        <div class="label">Număr Rezervare</div>
        <div class="number">${data.bookingNumber}</div>
      </div>

      <p style="text-align: center; color: #666; margin-bottom: 30px;">
        Bună ${data.firstName},<br>
        Îți mulțumim pentru rezervare! Detaliile călătoriei tale sunt mai jos.
      </p>

      <div class="info-section">
        <h3>📍 Detalii Călătorie</h3>
        <div class="info-row">
          <span class="info-label">Tip:</span>
          <span class="info-value">${tripTypeLabel}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Plecare din:</span>
          <span class="info-value">${data.departureCity}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Destinație:</span>
          <span class="info-value">${data.arrivalCity}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Data plecare:</span>
          <span class="info-value">${departureDate}</span>
        </div>
        ${isRoundTrip && returnDate ? `
        <div class="info-row">
          <span class="info-label">Data întoarcere:</span>
          <span class="info-value">${returnDate}</span>
        </div>
        ` : ''}
        ${data.type === 'passenger' ? `
        <div class="info-row">
          <span class="info-label">Adulți:</span>
          <span class="info-value">${data.adults}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Copii:</span>
          <span class="info-value">${data.children}</span>
        </div>
        ` : data.parcelDetails ? `
        <div class="info-row">
          <span class="info-label">Detalii colet:</span>
          <span class="info-value">${data.parcelDetails}</span>
        </div>
        ` : ''}
      </div>

      <div class="info-section">
        <h3>👤 Date Pasager</h3>
        <div class="info-row">
          <span class="info-label">Nume:</span>
          <span class="info-value">${data.firstName} ${data.lastName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${data.email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Telefon:</span>
          <span class="info-value">${data.phone}</span>
        </div>
      </div>

      <div class="price">
        <div class="label">Preț Total</div>
        <div class="amount">${data.price} ${data.currency}</div>
      </div>

      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/bilet/${data.bookingNumber}" class="cta-button">
          ${ticketButtonText}
        </a>
      </div>

      ${data.confirmUrl && data.cancelUrl ? `
      <div style="background: #f5f7fb; border-radius: 12px; padding: 24px; margin: 30px 0; text-align: center; border: 1px solid #e2e8f0;">
        <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #e11e2b; margin-bottom: 12px;">
          Confirmă ${data.type === 'passenger' ? 'că vii la cursă' : 'expedierea coletului'}
        </div>
        <p style="margin: 0 0 18px; color: #555; font-size: 14px;">
          Te rugăm să ne confirmi prezența cu un singur click. Dacă nu mai poți, anulează — eliberăm locul pentru altcineva.
        </p>
        <table cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
          <tr>
            <td style="padding: 0 6px;">
              <a href="${data.confirmUrl}" style="display: inline-block; background: #10c49b; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-weight: 700; font-size: 14px;">
                ✓ Confirm că vin
              </a>
            </td>
            <td style="padding: 0 6px;">
              <a href="${data.cancelUrl}" style="display: inline-block; background: #fff; color: #b91c1c; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-weight: 700; font-size: 14px; border: 2px solid #fecaca;">
                ✗ Anulez rezervarea
              </a>
            </td>
          </tr>
        </table>
        <p style="margin: 14px 0 0; font-size: 12px; color: #888;">
          Răspunsul tău se înregistrează automat. Linkul rămâne valabil 60 de zile.
        </p>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #666; font-size: 13px; margin-bottom: 10px;">
          Scanează codul QR la îmbarcare
        </p>
        <img src="${qrPngUrl(data.bookingNumber)}" alt="Cod QR bilet" width="200" height="200" style="border: 1px solid #eee; border-radius: 12px; padding: 10px; background: white;" />
      </div>

      ${data.payMethod ? `
      <div style="background: #eef2f8; border-radius: 10px; padding: 16px 20px; margin: 20px 0; font-size: 14px; color: #0b2653;">
        <strong>💳 Plata:</strong>
        ${data.payMethod === 'cash_on_pickup'
          ? `Cash la ${data.type === 'passenger' ? 'îmbarcare (la șofer)' : 'livrare'} — ${data.price} ${data.currency}.`
          : `Card la ${data.type === 'passenger' ? 'îmbarcare (POS la șofer)' : 'livrare'} — ${data.price} ${data.currency}. Acceptăm Visa, MasterCard, Maestro.`}
      </div>
      ` : ''}

      ${data.trackUrl ? `
      <div style="text-align: center; margin: 20px 0;">
        <a href="${data.trackUrl}" style="display: inline-block; color: #0b2653; text-decoration: underline; font-weight: 600; font-size: 14px;">
          🔍 Urmărește statusul rezervării
        </a>
      </div>
      ` : ''}

      <div class="important">
        <strong>📋 Informații importante:</strong><br>
        • Te rugăm să ajungi la punctul de îmbarcare cu 30 de minute înainte.<br>
        • Ai nevoie de act de identitate / pașaport valabil.<br>
        • Pentru modificări sau anulări, contactează-ne la +373 68 065 699.<br>
        • Bagajul gratuit inclus: 35 kg per pasager.<br>
        • La bord: Internet Starlink nelimitat, prânz, ceai/cafea naturală, însoțitoare 24/24.
      </div>

      <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
        <p>Dacă ai întrebări, nu ezita să ne contactezi:</p>
        <p style="margin-top: 10px;">
          <a href="tel:+37368065699" style="color: #e11e2b; text-decoration: none; font-weight: 600;">+373 68 065 699</a> |
          <a href="tel:+32484476446" style="color: #e11e2b; text-decoration: none; font-weight: 600;">+32 484 47 64 46</a>
        </p>
      </div>
    </div>

    <div class="footer">
      <div class="contact">
        <div class="contact-item">📞 +373 68 065 699</div>
        <div class="contact-item">📧 info@davo.md</div>
      </div>
      <p style="font-size: 12px; opacity: 0.8;">
        © ${new Date().getFullYear()} DAVO Group. Toate drepturile rezervate.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

export async function sendBookingConfirmation(
  booking: BookingConfirmationData
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const html = generateBookingEmailHtml(booking)

    const { data, error } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || 'DAVO Group <info@davo.md>',
      to: booking.email,
      subject: `Confirmare Rezervare DAVO - ${booking.bookingNumber}`,
      html,
    })

    if (error) {
      console.error('Email send error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

export async function sendAdminNotification(
  booking: BookingConfirmationData
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminHtml = `
      <h2>Nouă Rezervare - DAVO Group</h2>
      <p><strong>Număr rezervare:</strong> ${booking.bookingNumber}</p>
      <p><strong>Tip:</strong> ${booking.type}</p>
      <p><strong>Nume:</strong> ${booking.firstName} ${booking.lastName}</p>
      <p><strong>Email:</strong> ${booking.email}</p>
      <p><strong>Telefon:</strong> ${booking.phone}</p>
      <p><strong>Rută:</strong> ${booking.departureCity} → ${booking.arrivalCity}</p>
      <p><strong>Data:</strong> ${new Date(booking.departureDate).toLocaleDateString('ro-RO')}</p>
      <p><strong>Preț:</strong> ${booking.price} ${booking.currency}</p>
      <hr>
      <p>Vezi în panoul admin: <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin">Panou Administrare</a></p>
    `

    await getResend().emails.send({
      from: process.env.EMAIL_FROM || 'DAVO Group <info@davo.md>',
      to: process.env.ADMIN_EMAIL || 'admin@davo.md',
      subject: `🔔 Nouă Rezervare - ${booking.bookingNumber}`,
      html: adminHtml,
    })

    return { success: true }
  } catch (error) {
    console.error('Admin notification error:', error)
    return { success: false, error: 'Failed to send admin notification' }
  }
}

export function generateTicketHtml(booking: BookingConfirmationData): string {
  const departureDate = new Date(booking.departureDate).toLocaleDateString('ro-RO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bilet Electronic - ${booking.bookingNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .ticket {
      background: white;
      width: 100%;
      max-width: 500px;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }
    .ticket-header {
      background: linear-gradient(135deg, #0b2653 0%, #143a7a 100%);
      padding: 30px;
      color: white;
      text-align: center;
      position: relative;
    }
    .ticket-header::after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 0;
      right: 0;
      height: 20px;
      background: white;
      border-radius: 50% 50% 0 0;
    }
    .ticket-header h1 {
      font-size: 28px;
      margin-bottom: 5px;
    }
    .ticket-header p {
      opacity: 0.9;
    }
    .ticket-body {
      padding: 30px;
    }
    .ticket-number {
      text-align: center;
      margin-bottom: 20px;
    }
    .ticket-number .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .ticket-number .code {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      font-family: 'Courier New', monospace;
    }
    .route {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 20px 0;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 15px;
    }
    .location {
      text-align: center;
      flex: 1;
    }
    .location .city {
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }
    .location .date {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .arrow {
      margin: 0 15px;
      color: #e11e2b;
      font-weight: bold;
    }
    .passenger {
      margin-top: 20px;
      padding: 20px;
      background: #f0f9ff;
      border-radius: 10px;
    }
    .passenger h3 {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .passenger .name {
      font-size: 20px;
      font-weight: bold;
      color: #333;
    }
    .passenger .details {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .price {
      text-align: center;
      margin-top: 20px;
      padding: 20px;
      background: #f5f7fb;
      border: 2px solid #0b2653;
      border-radius: 10px;
    }
    .price .label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
    }
    .price .amount {
      font-size: 32px;
      font-weight: 800;
      color: #0b2653;
    }
    .qr-section {
      text-align: center;
      margin-top: 20px;
    }
    .qr-placeholder {
      width: 200px;
      height: 200px;
      margin: 0 auto;
      background: #f5f5f5;
      border: 2px dashed #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      font-size: 12px;
    }
    .footer {
      background: #1f2937;
      color: white;
      padding: 20px;
      text-align: center;
      font-size: 12px;
    }
    .footer p {
      opacity: 0.8;
    }
    .status-badge {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 5px 20px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 15px;
    }
    @media print {
      body { background: white; }
      .ticket { box-shadow: none; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <h1>DAVO Group</h1>
      <p>Bilet Electronic</p>
    </div>
    <div class="ticket-body">
      <div style="text-align: center;">
        <span class="status-badge">✓ CONFIRMAT</span>
      </div>
      <div class="ticket-number">
        <div class="label">Număr Rezervare</div>
        <div class="code">${booking.bookingNumber}</div>
      </div>

      <div class="route">
        <div class="location">
          <div class="city">${booking.departureCity}</div>
          <div class="date">${departureDate}</div>
        </div>
        <div class="arrow">→</div>
        <div class="location">
          <div class="city">${booking.arrivalCity}</div>
        </div>
      </div>

      <div class="passenger">
        <h3>Pasager</h3>
        <div class="name">${booking.firstName} ${booking.lastName}</div>
        <div class="details">
          ${booking.adults} adult${booking.adults > 1 ? 'i' : ''}${booking.children > 0 ? `, ${booking.children} copil${booking.children > 1 ? 'i' : ''}` : ''}
        </div>
      </div>

      <div class="price">
        <div class="label">Preț Total</div>
        <div class="amount">${booking.price} ${booking.currency}</div>
      </div>

      <div class="qr-section">
        <img src="${qrPngUrl(booking.bookingNumber)}" alt="Cod QR bilet" width="200" height="200" style="border: 1px solid #eee; border-radius: 12px; padding: 10px;" />
        <p style="font-size: 11px; color: #666; margin-top: 8px;">Scanează pentru verificare</p>
      </div>
    </div>
    <div class="footer">
      <p>Calea Ieșilor 11/3, Chișinău, Moldova</p>
      <p style="margin-top: 5px;">📞 +373 68 065 699 | 📧 info@davo.md</p>
    </div>
  </div>

  <script>
    window.print();
  </script>
</body>
</html>
  `
}
