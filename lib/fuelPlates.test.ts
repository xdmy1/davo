// Numerele rezervorului. Rulează cu: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePlate } from "./fuelPlates";

test("numărul scris oricum ajunge în forma din listă", () => {
  assert.equal(normalizePlate("daw077"), "DAW 077");
  assert.equal(normalizePlate(" DAW-077 "), "DAW 077");
  assert.equal(normalizePlate("qqs  979"), "QQS 979");
  assert.equal(normalizePlate("B 123 ABC"), "B 123 ABC");
});

test("ce nu e număr e refuzat", () => {
  assert.equal(normalizePlate(""), null);
  assert.equal(normalizePlate("autobuz"), null);
  assert.equal(normalizePlate("<script>"), null);
  assert.equal(normalizePlate(42), null);
});
