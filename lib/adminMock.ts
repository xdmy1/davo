// Tipurile folosite de UI-ul admin. Datele reale vin din DB prin /api/admin/*.
// Numele cu prefixul `Mock` sunt păstrate pentru a minimiza churn-ul în imports —
// semantica acum este "tipul pe care îl returnează API-ul".

// Elemente non-scaun pentru schemele realiste de autocar:
// - stairs: scară între etaje (sau spre nivelul de bagaje)
// - table: măsuță VIP (între locuri orientate față-în-față)
// - cafe: zonă de café/bar (auxiliar pe etajul VIP)
// - crew: scaun rezervat pentru însoțitorul de bord (nu se vinde)
export type SeatKind =
  | "seat"
  | "aisle"
  | "wc"
  | "driver"
  | "empty"
  | "stairs"
  | "table"
  | "cafe"
  | "crew";

export type SeatLayout = {
  rows: number;
  cols: number;
  cells: SeatKind[];
  // Direcția de numerotare în interiorul fiecărui rând:
  //  - "ltr" (default): primul scaun stânga-sus = 1, apoi spre dreapta.
  //  - "rtl": primul scaun dreapta-sus = 1 (convenția europeană uzuală
  //    pentru autocarele cu ușa de îmbarcare pe partea dreaptă).
  direction?: "ltr" | "rtl";
};

export type MockRoute = {
  id: string;
  origin: string;
  destination: string;
  country: string;
  basePrice: number;
  currency: string;
  active: boolean;
  description: string;
  weeklyDepartures: number;
  originCityId?: string;
  destinationCityId?: string;
};

export type MockBus = {
  id: string;
  plate: string;
  label: string;
  model: string;
  year: number;
  totalSeats: number;
  active: boolean;
  layout: SeatLayout;
};

export type TripStatus =
  | "scheduled"
  | "boarding"
  | "en_route"
  | "completed"
  | "cancelled";

export type MockTrip = {
  id: string;
  routeId: string;
  routeLabel: string;
  busId: string;
  busLabel: string;
  departureAt: string;
  arrivalAt: string;
  status: TripStatus;
  capacity: number;
  booked: number;
  revenue: number;
};

export type MockClient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bookings: number;
  totalSpent: number;
  lastTripAt: string | null;
  vip: boolean;
  notes?: string | null;
  routes?: string[];
};

export type EmailStatus = "sent" | "failed" | "queued" | "scheduled";
export type EmailType =
  | "confirmation"
  | "reminder_24h"
  | "cancellation";

export type MockEmail = {
  id: string;
  type: EmailType;
  to: string;
  subject: string;
  status: EmailStatus;
  sendAt: string;
  sentAt?: string | null;
  bookingNumber: string;
  error?: string | null;
};

export type CityOption = { id: string; name: string; slug: string; countryName: string };
