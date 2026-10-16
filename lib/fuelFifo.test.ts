// Teste pentru evaluarea FIFO a motorinei. Rulează cu: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { replayFifo, previewOutflow, FifoError, type FuelLedgerEntry } from "./fuelFifo";

let t0 = Date.UTC(2026, 9, 1);
const at = () => new Date((t0 += 60_000));
const refill = (id: string, liters: number, price: number | null): FuelLedgerEntry => ({ id, kind: "refill", liters, pricePerLiter: price, createdAt: at() });
const dispense = (id: string, liters: number): FuelLedgerEntry => ({ id, kind: "dispense", liters, pricePerLiter: null, createdAt: at() });
const loss = (id: string, liters: number): FuelLedgerEntry => ({ id, kind: "loss", liters, pricePerLiter: null, createdAt: at() });

test("litrii vechi rămași se decontează la prețul vechi, apoi la cel nou", () => {
  const ledger = [
    refill("r1", 1000, 20),
    refill("r2", 5000, 22),
    dispense("d1", 600),
    dispense("d2", 600),
    dispense("d3", 4800),
  ];
  const r = replayFifo(ledger);
  assert.equal(r.byId.get("d1")!.pricePerLiter, 20); // 600 × 20 = 12.000
  const d2 = r.byId.get("d2")!;
  assert.deepEqual(d2.slices!.map((s) => [s.liters, s.pricePerLiter]), [[400, 20], [200, 22]]);
  assert.ok(Math.abs(600 * d2.pricePerLiter! - 12400) < 0.01); // 400 × 20 + 200 × 22
  assert.equal(r.byId.get("d3")!.pricePerLiter, 22);
  assert.equal(r.balance, 0);
  assert.equal(r.lots.length, 0);
});

test("NU ia prețul ultimei reumpleri pentru motorina veche (bug-ul vechi)", () => {
  const r = replayFifo([refill("r1", 5100, 24.3), dispense("d1", 3748), refill("r2", 3800, 30), dispense("d2", 500)]);
  assert.equal(r.byId.get("d2")!.pricePerLiter, 24.3);
  assert.deepEqual(r.lots.map((l) => [l.liters, l.pricePerLiter]), [[852, 24.3], [3800, 30]]);
});

test("pierderea se evaluează la fel, din lotul cel mai vechi", () => {
  const r = replayFifo([refill("r1", 100, 20), refill("r2", 100, 30), loss("l1", 150)]);
  assert.ok(Math.abs(150 * r.byId.get("l1")!.pricePerLiter! - (100 * 20 + 50 * 30)) < 0.01);
  assert.equal(r.balance, 50);
});

test("ștergerea unei reumpleri deja consumate e refuzată (stocul ar ieși negativ)", () => {
  const ledger = [refill("r1", 1000, 20), refill("r2", 1000, 22), dispense("d1", 1500)];
  assert.throws(() => replayFifo(ledger.filter((e) => e.id !== "r2")), FifoError);
});

test("ștergerea unei alimentări vechi reface soldurile și costurile de după", () => {
  const ledger = [refill("r1", 1000, 20), refill("r2", 1000, 22), dispense("d1", 800), dispense("d2", 400)];
  const before = replayFifo(ledger).byId.get("d2")!;
  assert.ok(before.pricePerLiter! > 20); // 200 × 20 + 200 × 22
  const after = replayFifo(ledger.filter((e) => e.id !== "d1")).byId.get("d2")!;
  assert.equal(after.pricePerLiter, 20);
  assert.equal(after.balanceAfter, 1600);
});

test("zecimalele nu lasă resturi (calcul în centilitri)", () => {
  const r = replayFifo([refill("r1", 100.3, 24.3), dispense("a", 33.1), dispense("b", 33.1), dispense("c", 34.1)]);
  assert.equal(r.balance, 0);
  assert.equal(r.lots.length, 0);
  assert.equal(r.byId.get("c")!.balanceAfter, 0);
});

test("un lot fără preț dă cost necunoscut, nu un cost greșit", () => {
  const r = replayFifo([refill("r1", 100, null), refill("r2", 100, 30), dispense("d1", 150), dispense("d2", 50)]);
  assert.equal(r.byId.get("d1")!.pricePerLiter, null);
  assert.equal(r.byId.get("d2")!.pricePerLiter, 30);
});

test("ordinea e cronologică, indiferent de ordinea din listă", () => {
  const ledger = [refill("r1", 100, 20), refill("r2", 100, 30), dispense("d1", 50)];
  const r = replayFifo([...ledger].reverse());
  assert.equal(r.byId.get("d1")!.pricePerLiter, 20);
});

test("previzualizarea nu modifică loturile și refuză mai mult decât stocul", () => {
  const { lots } = replayFifo([refill("r1", 1000, 20), refill("r2", 5000, 22)]);
  const snapshot = JSON.stringify(lots);
  const out = previewOutflow(lots, 1200)!;
  assert.equal(out.cost, 1000 * 20 + 200 * 22);
  assert.equal(JSON.stringify(lots), snapshot);
  assert.equal(previewOutflow(lots, 6000.01), null);
  assert.equal(previewOutflow(lots, 0), null);
});
