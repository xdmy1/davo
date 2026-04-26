"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  CreditCard,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
  Users,
  User,
  Mail,
  Phone,
  Search,
  Info,
} from "lucide-react";
import { destinations, moldovanCities, contactInfo } from "@/lib/data";
import { cn } from "@/lib/utils";
import { CountryFlag, destinationSlugToCode } from "@/components/ui/CountryFlag";
import RouteHero from "@/components/booking/RouteHero";
import { StepBar } from "@/components/booking/StepBar";
import { TripPicker, type PublicTrip } from "@/components/booking/TripPicker";
import SuccessCard from "@/components/ui/SuccessCard";

type Mode = "bilet" | "colet";

type BookingResult = {
  bookingNumber: string;
  price: number;
  currency: string;
  ticketUrl: string;
};

type CityLookup = { id: string; name: string };

const coletSteps = ["Direcție", "Expeditor", "Destinatar", "Detalii colet", "Plată"];

const dateFmtRo = new Intl.DateTimeFormat("ro-RO", {
  weekday: "short",
  day: "numeric",
  month: "long",
});

function formatRoDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateFmtRo.format(d);
}

export default function RezervarePage() {
  return (
    <Suspense fallback={<div className="container-page py-20">Se încarcă...</div>}>
      <RezervareContent />
    </Suspense>
  );
}

function RezervareContent() {
  const params = useSearchParams();
  const initialMode = (params.get("mode") as Mode) === "colet" ? "colet" : "bilet";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState(0);
  const [from, setFrom] = useState(params.get("from") || "Chișinău");
  const [to, setTo] = useState(params.get("to") || "London");
  const [trip, setTrip] = useState<"one" | "return">("one");

  // Noi: selecții de Trip + scaune din DB
  const [cityIndex, setCityIndex] = useState<Record<string, CityLookup> | null>(null);
  const [outboundTripId, setOutboundTripId] = useState<string | null>(null);
  const [outboundSeats, setOutboundSeats] = useState<number[]>([]);
  const [outboundTripInfo, setOutboundTripInfo] = useState<PublicTrip | null>(null);
  const [returnTripId, setReturnTripId] = useState<string | null>(null);
  const [returnSeats, setReturnSeats] = useState<number[]>([]);
  const [returnTripInfo, setReturnTripInfo] = useState<PublicTrip | null>(null);

  // Datele pentru sumar/booking se derivă din cursele alese — nu mai sunt input.
  const date = outboundTripInfo?.departureAt ?? "";
  const returnDate = returnTripInfo?.departureAt ?? "";
  const [result, setResult] = useState<BookingResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [payMethod, setPayMethod] = useState<"card" | "cash">("card");

  const [person, setPerson] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    passport: "",
    note: "",
  });

  const [sender, setSender] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    address: "",
  });
  const [recipient, setRecipient] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    address: "",
  });
  const [parcel, setParcel] = useState({
    weight: "",
    length: "",
    width: "",
    height: "",
    contents: "",
    insurance: "",
  });

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Fetch city name → id map la mount pentru rezolvare la pas Direcție
  useEffect(() => {
    fetch("/api/public/cities")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.success) return;
        const map: Record<string, CityLookup> = {};
        const norm = (s: string) => s.trim().toLowerCase();
        const add = (c: { id: string; name: string }) => {
          map[norm(c.name)] = { id: c.id, name: c.name };
        };
        (d.origins ?? []).forEach(add);
        (d.destinations ?? []).forEach(add);
        setCityIndex(map);
      })
      .catch(() => setCityIndex({}));
  }, []);

  const steps = mode === "bilet"
    ? (trip === "return"
        ? ["Direcție", "Cursa dus", "Cursa retur", "Pasageri", "Plată"]
        : ["Direcție", "Cursa dus", "Pasageri", "Plată"])
    : coletSteps;

  const destinationCities = useMemo(
    () =>
      destinations.flatMap((d) =>
        d.cities.map((c) => ({ name: c.name, country: d.name, slug: d.slug }))
      ),
    []
  );

  const matchedCountry = useMemo(() => {
    const hit = destinationCities.find((c) => to.toLowerCase().startsWith(c.name.toLowerCase()));
    return hit ? destinations.find((d) => d.slug === hit.slug) : null;
  }, [to, destinationCities]);

  const flagCode = matchedCountry ? destinationSlugToCode[matchedCountry.slug] : undefined;

  const basePrice = useMemo(() => {
    if (outboundTripInfo) return outboundTripInfo.pricePerSeat;
    if (!matchedCountry) return 100;
    const n = parseFloat(matchedCountry.price || "100");
    return isNaN(n) ? 100 : n;
  }, [matchedCountry, outboundTripInfo]);

  const currency = useMemo(() => {
    if (outboundTripInfo) return outboundTripInfo.currency === "GBP" ? "£" : "€";
    return matchedCountry?.currency || "€";
  }, [outboundTripInfo, matchedCountry]);

  // Rezolvare nume oraș → City ID din DB
  const toCityName = to.split(",")[0].trim();
  const originCityId = useMemo(() => {
    if (!cityIndex) return null;
    return cityIndex[from.trim().toLowerCase()]?.id ?? null;
  }, [cityIndex, from]);
  const destCityId = useMemo(() => {
    if (!cityIndex) return null;
    return cityIndex[toCityName.toLowerCase()]?.id ?? null;
  }, [cityIndex, toCityName]);

  const total = useMemo(() => {
    if (mode === "colet") {
      const w = parseFloat(parcel.weight) || 0;
      return Math.max(25, Math.round(w * 6));
    }
    const pax = Math.max(1, outboundSeats.length || 1);
    const multi = trip === "return" ? 1.8 : 1;
    return Math.round(basePrice * pax * multi);
  }, [mode, basePrice, outboundSeats.length, trip, parcel.weight]);

  if (result) {
    return <SuccessCard bookingNumber={result.bookingNumber} ticketUrl={result.ticketUrl} mode={mode} />;
  }

  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const canContinue = (() => {
    if (mode !== "bilet") return true;
    if (step === 0) {
      return !!from.trim() && !!to.trim();
    }
    if (step === 1) {
      return !!outboundTripId && outboundSeats.length >= 1;
    }
    if (step === 2 && trip === "return") {
      return !!returnTripId && returnSeats.length === outboundSeats.length;
    }
    return true;
  })();

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const pax = Math.max(1, outboundSeats.length || 1);
      const body =
        mode === "bilet"
          ? {
              type: "passenger",
              tripType: trip === "return" ? "round-trip" : "one-way",
              departureCity: from,
              arrivalCity: toCityName,
              departureDate: date,
              returnDate: trip === "return" ? returnDate : undefined,
              firstName: person.firstName,
              lastName: person.lastName,
              email: person.email,
              phone: person.phone,
              adults: pax,
              children: 0,
              tripId: outboundTripId || undefined,
              seatNumbers: outboundSeats,
              returnTripId: trip === "return" ? returnTripId || undefined : undefined,
              returnSeatNumbers: trip === "return" ? returnSeats : undefined,
              payMethod,
            }
          : {
              type: "parcel",
              departureCity: sender.city || from,
              arrivalCity: recipient.city || toCityName,
              departureDate: date || new Date().toISOString().slice(0, 10),
              firstName: sender.name.split(" ")[0] || sender.name,
              lastName: sender.name.split(" ").slice(1).join(" ") || "—",
              email: sender.email,
              phone: sender.phone,
              adults: 0,
              children: 0,
              parcelDetails: `Greutate: ${parcel.weight}kg · ${parcel.length}×${parcel.width}×${parcel.height} · ${parcel.contents}`,
              payMethod,
            };
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) setResult(data.booking);
      else setSubmitError(data.error || "Eroare la procesarea rezervării");
    } catch {
      setSubmitError("Eroare de rețea. Încearcă din nou.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <RouteHero mode={mode} from={from} to={to.split(",")[0]} />

      <section className="relative pt-8 pb-20 bg-[color:var(--ink-50)]">
        <div className="container-page">
          <StepBar steps={steps} current={step} onStepClick={(i) => i < step && setStep(i)} />

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,340px]">
            <div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${mode}-${step}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  {mode === "bilet" ? (
                    <>
                      {step === 0 && (
                        <DirectionStep
                          from={from}
                          to={to}
                          trip={trip}
                          onFrom={setFrom}
                          onTo={setTo}
                          onTrip={setTrip}
                          fromOptions={moldovanCities.map((c) => c.name)}
                          toOptions={destinationCities.map((c) => `${c.name}, ${c.country}`)}
                        />
                      )}

                      {/* Pasul 1: Cursa dus + scaun */}
                      {step === 1 && (
                        <TripPicker
                          title="Pasul 2"
                          subtitle="Alege cursa și scaunul — dus"
                          originCityId={originCityId}
                          destCityId={destCityId}
                          maxSeats={4}
                          selectedTripId={outboundTripId}
                          selectedSeats={outboundSeats}
                          onSelect={(tripId, seats, tripInfo) => {
                            setOutboundTripId(tripId);
                            setOutboundSeats(seats);
                            if (tripInfo !== undefined) setOutboundTripInfo(tripInfo ?? null);
                          }}
                        />
                      )}

                      {/* Pasul 2 (doar round-trip): Cursa retur + scaun (filtrat după dus) */}
                      {step === 2 && trip === "return" && (
                        <TripPicker
                          title="Pasul 3"
                          subtitle="Alege cursa și scaunul — retur"
                          originCityId={destCityId}
                          destCityId={originCityId}
                          fromDate={outboundTripInfo?.arrivalAt ?? null}
                          maxSeats={Math.max(1, outboundSeats.length)}
                          selectedTripId={returnTripId}
                          selectedSeats={returnSeats}
                          onSelect={(tripId, seats, tripInfo) => {
                            setReturnTripId(tripId);
                            setReturnSeats(seats);
                            if (tripInfo !== undefined) setReturnTripInfo(tripInfo ?? null);
                          }}
                        />
                      )}

                      {/* Pasul Pasageri */}
                      {((step === 2 && trip === "one") || (step === 3 && trip === "return")) && (
                        <PersonalForm person={person} onChange={setPerson} />
                      )}

                      {/* Pasul Plată */}
                      {((step === 3 && trip === "one") || (step === 4 && trip === "return")) && (
                        <PaymentStep
                          mode={mode}
                          payMethod={payMethod}
                          onPayMethod={setPayMethod}
                          lines={[
                            { label: `${from} → ${toCityName}`, value: `${basePrice}${currency}` },
                            { label: `Locuri: ${outboundSeats.length || 1}`, value: `×${outboundSeats.length || 1}` },
                            {
                              label: trip === "return" ? "Tur-retur" : "O direcție",
                              value: trip === "return" ? "+80%" : "—",
                            },
                          ]}
                          total={`${total}${currency}`}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {step === 0 && (
                        <DirectionStep
                          from={from}
                          to={to}
                          trip={trip}
                          onFrom={setFrom}
                          onTo={setTo}
                          onTrip={setTrip}
                          fromOptions={moldovanCities.map((c) => c.name)}
                          toOptions={destinationCities.map((c) => `${c.name}, ${c.country}`)}
                          hideTrip
                        />
                      )}
                      {step === 1 && <PartyForm role="Expeditor" data={sender} onChange={setSender} />}
                      {step === 2 && <PartyForm role="Destinatar" data={recipient} onChange={setRecipient} />}
                      {step === 3 && <ParcelForm parcel={parcel} onChange={setParcel} />}
                      {step === 4 && (
                        <PaymentStep
                          mode={mode}
                          payMethod={payMethod}
                          onPayMethod={setPayMethod}
                          lines={[
                            { label: "Livrare colet", value: "standard" },
                            { label: `Greutate: ${parcel.weight || 0} kg`, value: `×${parcel.weight || 0}` },
                            { label: "Asigurare", value: parcel.insurance || "de bază" },
                          ]}
                          total={`${total}${currency}`}
                        />
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {submitError && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <Info className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>{submitError}</div>
                </div>
              )}

              {step === steps.length - 1 && (
                <label className="mt-4 flex items-start gap-3 cursor-pointer rounded-xl border border-[color:var(--ink-200)] bg-white p-4 hover:border-[color:var(--navy-500)] transition-colors">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[color:var(--red-500)] cursor-pointer shrink-0"
                  />
                  <span className="text-sm text-[color:var(--ink-700)] leading-relaxed">
                    Am citit și accept{" "}
                    <a
                      href={mode === "bilet" ? "/termeni-pasageri" : "/termeni-colete"}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[color:var(--navy-900)] underline decoration-[color:var(--red-500)] underline-offset-2 hover:text-[color:var(--red-500)]"
                    >
                      Termenii și Condițiile {mode === "bilet" ? "de călătorie pasager" : "de transport colete"}
                    </a>
                    {" "}DAVO Group.
                  </span>
                </label>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={back}
                  disabled={step === 0}
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--ink-200)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--navy-900)] hover:border-[color:var(--navy-700)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Înapoi
                </button>

                {step < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={next}
                    disabled={!canContinue}
                    className="inline-flex items-center gap-2 rounded-full bg-[color:var(--red-500)] px-6 py-3 text-sm font-semibold text-white hover:bg-[color:var(--red-600)] transition-colors shadow-[0_12px_30px_-10px_rgba(225,30,43,0.55)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continuă
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting || !consent}
                    className="inline-flex items-center gap-2 rounded-full bg-[color:var(--success)] px-6 py-3 text-sm font-semibold text-white hover:brightness-110 transition-all shadow-[0_12px_30px_-10px_rgba(16,196,155,0.55)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Se procesează..." : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Achită & confirmă
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <SummaryCard
              mode={mode}
              from={from}
              to={to}
              date={date}
              returnDate={trip === "return" ? returnDate : undefined}
              flagCode={flagCode}
              country={matchedCountry?.name}
              seats={outboundSeats.map(String)}
              time={outboundTripInfo
                ? new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" }).format(new Date(outboundTripInfo.departureAt))
                : null}
              weight={parcel.weight}
              total={`${total}${currency}`}
            />
          </div>

          {/* Benefits strip */}
          <BenefitsStrip />
        </div>
      </section>

      {/* Colet la cheie band */}
      <ColetPromoBand />
    </>
  );
}

/* ---------- Steps ---------- */

function DirectionStep({
  from,
  to,
  trip,
  onFrom,
  onTo,
  onTrip,
  fromOptions,
  toOptions,
  hideTrip = false,
}: {
  from: string;
  to: string;
  trip: "one" | "return";
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onTrip: (v: "one" | "return") => void;
  fromOptions: string[];
  toOptions: string[];
  hideTrip?: boolean;
}) {
  return (
    <div className="card-elevated p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[color:var(--red-500)]">
          Pasul 1
        </span>
        <h2 className="display-hero text-2xl md:text-3xl text-[color:var(--navy-900)]">Direcția deplasării</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <FancyField label="Plecare din" icon={<MapPin className="h-4 w-4" />}>
          <FieldInput value={from} onChange={onFrom} options={fromOptions} placeholder="Alege oraș plecare" />
        </FancyField>
        <FancyField label="Destinația" icon={<MapPin className="h-4 w-4" />}>
          <FieldInput value={to} onChange={onTo} options={toOptions} placeholder="Alege oraș destinație" />
        </FancyField>
        <div className="md:col-span-2 -mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-[color:var(--navy-50)] border border-[color:var(--navy-200,rgba(20,58,122,0.18))] px-4 py-2.5 text-xs text-[color:var(--ink-700)]">
          <Info className="h-3.5 w-3.5 text-[color:var(--red-500)] shrink-0" />
          <span>
            Nu găsești orașul în listă? Aranjăm transport personalizat —
          </span>
          <a
            href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-1 font-semibold text-[color:var(--navy-900)] hover:text-[color:var(--red-500)]"
          >
            <Phone className="h-3 w-3" />
            sună la {contactInfo.phone}
          </a>
        </div>
      </div>

      {!hideTrip && (
        <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-[color:var(--ink-50)] p-1">
          <TripTypeTab active={trip === "one"} onClick={() => onTrip("one")}>
            O direcție
          </TripTypeTab>
          <TripTypeTab active={trip === "return"} onClick={() => onTrip("return")}>
            Tur-retur
          </TripTypeTab>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-[color:var(--navy-200,rgba(20,58,122,0.18))] bg-[color:var(--navy-50)] p-4 text-sm text-[color:var(--navy-900)] flex items-start gap-3">
        <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-[color:var(--navy-700)]" />
        <span>
          La pasul următor vezi toate cursele disponibile pe această rută — alegi
          ziua și ora care îți convine.
        </span>
      </div>

      {/* Mini map — Google Maps de la sediu DAVO */}
      <div className="mt-6 rounded-2xl overflow-hidden border border-[color:var(--ink-200)] bg-[color:var(--ink-50)] relative min-h-[220px]">
        <iframe
          src="https://www.google.com/maps?q=Calea+Ie%C8%99ilor+11%2F3+Chi%C8%99in%C4%83u&output=embed"
          className="h-[260px] w-full"
          loading="lazy"
          title="Sediu DAVO Group — Calea Ieșilor 11/3, Chișinău"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}

function PersonalForm({
  person,
  onChange,
}: {
  person: { firstName: string; lastName: string; email: string; phone: string; passport: string; note: string };
  onChange: (p: typeof person) => void;
}) {
  const setField = (k: keyof typeof person, v: string) => onChange({ ...person, [k]: v });
  return (
    <div className="card-elevated p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[color:var(--red-500)]">
          Informații personale
        </span>
        <h2 className="display-hero text-2xl md:text-3xl text-[color:var(--navy-900)]">Datele pasagerului</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <SimpleField label="Nume *" icon={<User className="h-4 w-4" />}>
          <input
            required
            value={person.firstName}
            onChange={(e) => setField("firstName", e.target.value)}
            placeholder="Ion"
            className="simple-input"
          />
        </SimpleField>
        <SimpleField label="Prenume *" icon={<User className="h-4 w-4" />}>
          <input
            required
            value={person.lastName}
            onChange={(e) => setField("lastName", e.target.value)}
            placeholder="Popescu"
            className="simple-input"
          />
        </SimpleField>
        <SimpleField label="Email *" icon={<Mail className="h-4 w-4" />}>
          <input
            required
            type="email"
            value={person.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="ion@email.com"
            className="simple-input"
          />
        </SimpleField>
        <SimpleField label="Telefon *" icon={<Phone className="h-4 w-4" />}>
          <input
            required
            type="tel"
            value={person.phone}
            onChange={(e) => setField("phone", e.target.value)}
            placeholder="+373 68 065 699"
            className="simple-input"
          />
        </SimpleField>
        <SimpleField label="Serie pașaport" icon={<Info className="h-4 w-4" />}>
          <input
            value={person.passport}
            onChange={(e) => setField("passport", e.target.value)}
            placeholder="AB0000000"
            className="simple-input"
          />
        </SimpleField>
      </div>
      <div className="mt-4">
        <SimpleField label="Observații">
          <textarea
            rows={3}
            value={person.note}
            onChange={(e) => setField("note", e.target.value)}
            placeholder="Adaugă o observație (opțional)"
            className="simple-input resize-y min-h-[80px]"
          />
        </SimpleField>
      </div>
      <InputStyles />
    </div>
  );
}

function PartyForm({
  role,
  data,
  onChange,
}: {
  role: "Expeditor" | "Destinatar";
  data: { name: string; phone: string; email: string; city: string; address: string };
  onChange: (d: typeof data) => void;
}) {
  const setField = (k: keyof typeof data, v: string) => onChange({ ...data, [k]: v });
  return (
    <div className="card-elevated p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[color:var(--red-500)]">
          {role}
        </span>
        <h2 className="display-hero text-2xl md:text-3xl text-[color:var(--navy-900)]">
          Datele {role === "Expeditor" ? "expeditorului" : "destinatarului"}
        </h2>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <SimpleField label="Nume complet *" icon={<User className="h-4 w-4" />}>
          <input
            required
            value={data.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Ion Popescu"
            className="simple-input"
          />
        </SimpleField>
        <SimpleField label="Telefon *" icon={<Phone className="h-4 w-4" />}>
          <input
            required
            type="tel"
            value={data.phone}
            onChange={(e) => setField("phone", e.target.value)}
            className="simple-input"
          />
        </SimpleField>
        <SimpleField label="Email" icon={<Mail className="h-4 w-4" />}>
          <input
            type="email"
            value={data.email}
            onChange={(e) => setField("email", e.target.value)}
            className="simple-input"
          />
        </SimpleField>
        <SimpleField label="Oraș *" icon={<MapPin className="h-4 w-4" />}>
          <input
            required
            value={data.city}
            onChange={(e) => setField("city", e.target.value)}
            className="simple-input"
          />
        </SimpleField>
      </div>
      <div className="mt-4">
        <SimpleField label="Adresă completă *" icon={<MapPin className="h-4 w-4" />}>
          <input
            required
            value={data.address}
            onChange={(e) => setField("address", e.target.value)}
            placeholder="Strada, număr, apartament"
            className="simple-input"
          />
        </SimpleField>
      </div>
      <InputStyles />
    </div>
  );
}

function ParcelForm({
  parcel,
  onChange,
}: {
  parcel: {
    weight: string;
    length: string;
    width: string;
    height: string;
    contents: string;
    insurance: string;
  };
  onChange: (p: typeof parcel) => void;
}) {
  const setField = (k: keyof typeof parcel, v: string) => onChange({ ...parcel, [k]: v });
  return (
    <div className="card-elevated p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[color:var(--red-500)]">
          Colet
        </span>
        <h2 className="display-hero text-2xl md:text-3xl text-[color:var(--navy-900)]">Detaliile coletului</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SimpleField label="Greutate (kg) *" icon={<Package className="h-4 w-4" />}>
          <input
            required
            type="number"
            min="0.1"
            step="0.1"
            value={parcel.weight}
            onChange={(e) => setField("weight", e.target.value)}
            placeholder="5"
            className="simple-input"
          />
        </SimpleField>
        <SimpleField label="Lungime (cm)">
          <input
            type="number"
            value={parcel.length}
            onChange={(e) => setField("length", e.target.value)}
            className="simple-input"
          />
        </SimpleField>
        <SimpleField label="Lățime (cm)">
          <input
            type="number"
            value={parcel.width}
            onChange={(e) => setField("width", e.target.value)}
            className="simple-input"
          />
        </SimpleField>
        <SimpleField label="Înălțime (cm)">
          <input
            type="number"
            value={parcel.height}
            onChange={(e) => setField("height", e.target.value)}
            className="simple-input"
          />
        </SimpleField>
      </div>
      <div className="mt-4">
        <SimpleField label="Conținut *">
          <input
            required
            value={parcel.contents}
            onChange={(e) => setField("contents", e.target.value)}
            placeholder="Haine, documente, cadouri…"
            className="simple-input"
          />
        </SimpleField>
      </div>
      <div className="mt-4">
        <SimpleField label="Asigurare">
          <select
            value={parcel.insurance}
            onChange={(e) => setField("insurance", e.target.value)}
            className="simple-input"
          >
            <option value="de bază">De bază (inclus)</option>
            <option value="extinsă">Extinsă (+3€)</option>
            <option value="premium">Premium (+8€)</option>
          </select>
        </SimpleField>
      </div>
      <InputStyles />
    </div>
  );
}

function PaymentStep({
  mode,
  lines,
  total,
  payMethod,
  onPayMethod,
}: {
  mode: Mode;
  lines: { label: string; value: string }[];
  total: string;
  payMethod: "card" | "cash";
  onPayMethod: (m: "card" | "cash") => void;
}) {
  const moment = mode === "bilet" ? "îmbarcare" : "livrare";
  return (
    <div className="card-elevated p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[color:var(--red-500)]">
          Plată & confirmare
        </span>
        <h2 className="display-hero text-2xl md:text-3xl text-[color:var(--navy-900)]">
          Aproape gata — confirmă rezervarea
        </h2>
      </div>

      <div className="rounded-2xl bg-[color:var(--ink-50)] border border-[color:var(--ink-200)] p-5">
        <div className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--ink-500)]">
          Sumar
        </div>
        <div className="mt-3 divide-y divide-[color:var(--ink-200)]">
          {lines.map((l) => (
            <div key={l.label} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-[color:var(--ink-700)]">{l.label}</span>
              <span className="font-semibold text-[color:var(--navy-900)]">{l.value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-[color:var(--ink-200)]">
          <span className="text-sm font-semibold text-[color:var(--ink-700)]">Total de plată</span>
          <span className="font-[family-name:var(--font-montserrat)] text-3xl font-extrabold text-[color:var(--navy-900)]">
            {total}
          </span>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-[color:var(--navy-200,rgba(20,58,122,0.18))] bg-[color:var(--navy-50)] p-4 text-sm text-[color:var(--navy-900)] flex items-start gap-3">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-[color:var(--navy-700)]" />
        <span>
          Pe site nu se achită cu cardul. Plata se face direct la {moment} —
          alege metoda dorită mai jos. Confirmarea îți ajunge pe email imediat.
        </span>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-3">
        <label
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl p-4 transition-colors",
            payMethod === "card"
              ? "border-2 border-[color:var(--red-500)] bg-[color:var(--red-50)]"
              : "border border-[color:var(--ink-200)] bg-white hover:border-[color:var(--navy-500)]"
          )}
        >
          <input
            type="radio"
            name="pay"
            checked={payMethod === "card"}
            onChange={() => onPayMethod("card")}
            className="accent-[color:var(--red-500)]"
          />
          <CreditCard className="h-5 w-5 text-[color:var(--red-500)]" />
          <div>
            <div className="font-semibold text-[color:var(--navy-900)]">Card la {moment}</div>
            <div className="text-xs text-[color:var(--ink-500)]">
              Visa, MasterCard, Maestro — la {mode === "bilet" ? "șofer" : "livrare"}
            </div>
          </div>
        </label>
        <label
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl p-4 transition-colors",
            payMethod === "cash"
              ? "border-2 border-[color:var(--red-500)] bg-[color:var(--red-50)]"
              : "border border-[color:var(--ink-200)] bg-white hover:border-[color:var(--navy-500)]"
          )}
        >
          <input
            type="radio"
            name="pay"
            checked={payMethod === "cash"}
            onChange={() => onPayMethod("cash")}
            className="accent-[color:var(--red-500)]"
          />
          <Clock className="h-5 w-5 text-[color:var(--navy-900)]" />
          <div>
            <div className="font-semibold text-[color:var(--navy-900)]">Cash la {moment}</div>
            <div className="text-xs text-[color:var(--ink-500)]">
              Numerar — în Lei, Euro sau GBP
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}

/* ---------- Side summary ---------- */

function SummaryCard({
  mode,
  from,
  to,
  date,
  returnDate,
  flagCode,
  country,
  seats,
  time,
  weight,
  total,
}: {
  mode: "bilet" | "colet";
  from: string;
  to: string;
  date: string;
  returnDate?: string;
  flagCode?: (typeof destinationSlugToCode)[string];
  country?: string;
  seats: string[];
  time: string | null;
  weight: string;
  total: string;
}) {
  return (
    <aside className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-[color:var(--navy-900)] bg-hero-navy text-white p-5">
        <div className="bg-noise absolute inset-0 opacity-30" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[color:var(--red-400)]">
                {mode === "bilet" ? "Biletul tău" : "Coletul tău"}
              </div>
              <div className="mt-2 font-[family-name:var(--font-montserrat)] text-2xl font-extrabold leading-tight">
                {from} <span className="text-[color:var(--red-400)]">→</span> {to.split(",")[0]}
              </div>
              {country && <div className="text-xs text-white/55 mt-0.5">{country}</div>}
            </div>
            {flagCode && <CountryFlag code={flagCode} className="h-9 w-12" />}
          </div>

          <div className="mt-5 space-y-2 text-sm">
            <Row icon={<Calendar className="h-3.5 w-3.5" />} label="Plecare">
              {formatRoDate(date) || "—"}
            </Row>
            {returnDate && (
              <Row icon={<Calendar className="h-3.5 w-3.5" />} label="Întoarcere">
                {formatRoDate(returnDate)}
              </Row>
            )}
            {time && (
              <Row icon={<Clock className="h-3.5 w-3.5" />} label="Ora">
                {time}
              </Row>
            )}
            {mode === "bilet" && (
              <Row icon={<Users className="h-3.5 w-3.5" />} label="Locuri">
                {seats.length > 0 ? seats.join(", ") : "—"}
              </Row>
            )}
            {mode === "colet" && (
              <Row icon={<Package className="h-3.5 w-3.5" />} label="Greutate">
                {weight ? `${weight} kg` : "—"}
              </Row>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-xs text-white/55 uppercase tracking-widest font-bold">Total</span>
            <span className="font-[family-name:var(--font-montserrat)] text-2xl font-extrabold">{total}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-[color:var(--ink-200)] p-5 space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--ink-500)]">
          Ajutor rapid
        </div>
        <a
          href={`tel:${contactInfo.phone.replace(/\s/g, "")}`}
          className="flex items-center gap-3 text-sm text-[color:var(--navy-900)] font-semibold hover:text-[color:var(--red-500)]"
        >
          <Phone className="h-4 w-4 text-[color:var(--red-500)]" />
          {contactInfo.phone}
        </a>
        <a
          href={`mailto:${contactInfo.email}`}
          className="flex items-center gap-3 text-sm text-[color:var(--navy-900)] font-semibold hover:text-[color:var(--red-500)]"
        >
          <Mail className="h-4 w-4 text-[color:var(--red-500)]" />
          {contactInfo.email}
        </a>
      </div>
    </aside>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/80">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest font-bold text-white/50">{label}</div>
        <div className="text-sm font-semibold truncate">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Small shared ---------- */

function FancyField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="group flex flex-col gap-1.5 rounded-xl border border-[color:var(--ink-200)] bg-white px-4 py-3 transition-colors hover:border-[color:var(--navy-500)] focus-within:border-[color:var(--navy-700)]">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-[color:var(--ink-500)]">
        <span className="text-[color:var(--red-500)]">{icon}</span>
        {label}
      </span>
      <div>{children}</div>
    </label>
  );
}

function SimpleField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-[color:var(--ink-500)] mb-1.5">
        {icon && <span className="text-[color:var(--red-500)]">{icon}</span>}
        {label}
      </span>
      {children}
    </label>
  );
}

function FieldInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const id = "inp-" + Math.random().toString(36).slice(2, 8);
  return (
    <>
      <input
        list={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[0.95rem] font-semibold text-[color:var(--navy-900)] outline-none"
        placeholder={placeholder}
      />
      <datalist id={id}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}

function TripTypeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
        active ? "bg-[color:var(--navy-900)] text-white" : "text-[color:var(--ink-500)]"
      )}
    >
      {children}
    </button>
  );
}

function InputStyles() {
  return (
    <style jsx global>{`
      .simple-input {
        width: 100%;
        border-radius: 12px;
        border: 1px solid var(--ink-200);
        background: #fff;
        padding: 0.8rem 1rem;
        font-size: 0.95rem;
        color: var(--navy-900);
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
        outline: none;
      }
      .simple-input:focus {
        border-color: var(--navy-700);
        box-shadow: 0 0 0 3px rgb(20 58 122 / 0.12);
      }
      .simple-input::placeholder {
        color: var(--ink-400);
      }
    `}</style>
  );
}

function BenefitsStrip() {
  const items = [
    { icon: ShieldCheck, label: "Siguranță 100%" },
    { icon: Truck, label: "Curse zilnice" },
    { icon: Users, label: "Însoțitor la bord" },
    { icon: Search, label: "Urmărire rezervare" },
  ];
  return (
    <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((b) => (
        <div
          key={b.label}
          className="flex items-center gap-3 rounded-xl border border-[color:var(--ink-200)] bg-white p-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--navy-50)] text-[color:var(--navy-800)]">
            <b.icon className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold text-[color:var(--navy-900)]">{b.label}</div>
        </div>
      ))}
    </div>
  );
}

function ColetPromoBand() {
  return (
    <section className="py-16">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-[color:var(--navy-900)] bg-hero-navy text-white">
          <div className="bg-noise absolute inset-0 opacity-30" />
          <div className="relative px-8 md:px-12 py-12 md:py-14 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-[color:var(--red-400)]">
              Serviciu premium
            </div>
            <h3 className="mt-3 display-hero text-3xl md:text-4xl">
              Colet la cheie din Moldova
            </h3>
            <p className="mt-3 text-white/65 max-w-xl mx-auto">
              Ambalare, documente, livrare la destinație — noi ne ocupăm de tot, tu doar trimiți.
            </p>
            <div className="mt-7">
              <a
                href="/rezervare?mode=colet"
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--red-500)] px-6 py-3.5 font-semibold text-white hover:bg-[color:var(--red-600)] transition-colors shadow-[0_18px_40px_-12px_rgba(225,30,43,0.45)]"
              >
                Solicită oferta
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
