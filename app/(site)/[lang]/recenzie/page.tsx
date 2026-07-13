"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Star } from "lucide-react";

// Pagina de recenzie: clientul vine din emailul trimis la 2 zile după cursă,
// cu link tokenizat → numele și cursa sunt deja completate; el doar alege
// stelele și (opțional) scrie un comentariu.

export default function RecenziePage() {
  return (
    <Suspense fallback={<div className="container-page py-20">Se încarcă…</div>}>
      <RecenzieContent />
    </Suspense>
  );
}

function RecenzieContent() {
  const params = useSearchParams();
  const nr = (params.get("nr") || "").toUpperCase();
  const t = params.get("t") || "";

  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [name, setName] = useState("");
  const [tripLabel, setTripLabel] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!nr || !t) { setInvalid(true); setLoading(false); return; }
    fetch(`/api/reviews?nr=${encodeURIComponent(nr)}&t=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d?.success) { setInvalid(true); return; }
        setName(d.name);
        setTripLabel(d.tripLabel);
        if (d.existing) {
          setRating(d.existing.rating);
          setComment(d.existing.comment ?? "");
        }
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [nr, t]);

  const submit = async () => {
    if (rating < 1) { setError("Alege câte stele dai (1–5)."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nr, t, rating, comment }),
      });
      const d = await res.json();
      if (!d?.success) { setError(d?.error || "Nu s-a putut salva"); return; }
      setDone(true);
    } catch {
      setError("Eroare de rețea — încearcă din nou.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="relative bg-[color:var(--ink-50)] py-14 md:py-20">
      <div className="container-page">
        <div className="mx-auto max-w-lg rounded-2xl border border-[color:var(--ink-200)] bg-white p-6 shadow-sm md:p-8">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[color:var(--ink-500)]">
              <Loader2 className="h-5 w-5 animate-spin" /> Se încarcă…
            </div>
          ) : invalid ? (
            <div className="py-6 text-center">
              <h1 className="text-xl font-extrabold text-[color:var(--navy-900)]">Link invalid sau expirat</h1>
              <p className="mt-2 text-sm text-[color:var(--ink-500)]">
                Folosește linkul primit pe email după călătorie. Dacă nu-l găsești, scrie-ne la{" "}
                <a href="mailto:info@davo.md" className="font-semibold text-[color:var(--red-500)]">info@davo.md</a>.
              </p>
            </div>
          ) : done ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">✓</div>
              <h1 className="mt-3 text-xl font-extrabold text-[color:var(--navy-900)]">Mulțumim, {name.split(" ")[0]}!</h1>
              <p className="mt-2 text-sm text-[color:var(--ink-500)]">
                Recenzia ta a fost salvată. Ne vedem la următoarea călătorie! 🚌
              </p>
            </div>
          ) : (
            <>
              <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[color:var(--red-500)]">
                Recenzie
              </span>
              <h1 className="mt-1 text-2xl font-extrabold text-[color:var(--navy-900)]">Cum a fost călătoria?</h1>
              <div className="mt-3 rounded-xl bg-[color:var(--ink-50)] px-4 py-3">
                <div className="text-sm font-bold text-[color:var(--navy-900)]">{name}</div>
                <div className="text-xs font-semibold text-[color:var(--ink-500)]">{tripLabel}</div>
              </div>

              <div className="mt-5 flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    aria-label={`${n} stele`}
                    className="p-1 transition-transform active:scale-90"
                  >
                    <Star
                      className={`h-9 w-9 ${
                        n <= (hover || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-[color:var(--ink-300)]"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Scrie câteva cuvinte despre călătorie (opțional)…"
                rows={4}
                className="mt-4 w-full rounded-xl border border-[color:var(--ink-300)] px-4 py-3 text-sm text-[color:var(--navy-900)] focus:border-[color:var(--navy-500)] focus:outline-none"
              />

              {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div>}

              <button
                onClick={submit}
                disabled={saving}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--red-500)] px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white hover:bg-[color:var(--red-600)] disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Trimite recenzia
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
