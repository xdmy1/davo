import { destinations, moldovanCities } from "./data";

export interface PriceInput {
  departureCity: string;
  arrivalCity: string;
  type: "passenger" | "parcel";
  tripType?: "one-way" | "round-trip";
  adults?: number;
  children?: number;
  parcelWeight?: number | null;
}

export interface PriceResult {
  price: number;
  currency: string;
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function findCity(cityName: string) {
  const name = normalize(cityName);
  if (moldovanCities.some((c) => normalize(c.name) === name)) {
    return { fromMoldova: true as const, country: null };
  }
  const country = destinations.find((d) =>
    d.cities.some((c) => normalize(c.name) === name)
  );
  return { fromMoldova: false as const, country: country ?? null };
}

const DEFAULT_BASE_PRICE = 100;
const ROUND_TRIP_MULTIPLIER = 1.8;
const CHILD_DISCOUNT = 0.5;
const PARCEL_BASE = 30;
const PARCEL_PER_KG_FRACTION = 0.3;

export function calculatePrice(input: PriceInput): PriceResult {
  const from = findCity(input.departureCity);
  const to = findCity(input.arrivalCity);

  const foreign = !from.fromMoldova ? from.country : to.country;

  const basePrice = parseFloat(foreign?.price || "") || DEFAULT_BASE_PRICE;
  const currency = foreign?.currency === "£" ? "GBP" : "EUR";

  if (input.type === "parcel") {
    const weight = input.parcelWeight && input.parcelWeight > 0 ? input.parcelWeight : 1;
    const parcelPrice = Math.max(PARCEL_BASE, basePrice * PARCEL_PER_KG_FRACTION * weight);
    return { price: Math.round(parcelPrice * 100) / 100, currency };
  }

  const adults = Math.max(1, input.adults ?? 1);
  const children = Math.max(0, input.children ?? 0);
  let total = basePrice * adults + basePrice * CHILD_DISCOUNT * children;
  if (input.tripType === "round-trip") total *= ROUND_TRIP_MULTIPLIER;

  return { price: Math.round(total * 100) / 100, currency };
}

export function calculatePriceFromRoute(input: {
  basePrice: number;
  currency: string;
  seats: number;
  roundTrip: boolean;
}): PriceResult {
  const seats = Math.max(1, input.seats);
  let total = input.basePrice * seats;
  if (input.roundTrip) total *= ROUND_TRIP_MULTIPLIER;
  return { price: Math.round(total * 100) / 100, currency: input.currency };
}
