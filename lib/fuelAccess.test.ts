// Drepturile în rezervor. Rulează cu: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { canAccessAPI, canAccessUI, fuelAccessOf, homePathForRole } from "./permissions";

test("doar alimentare: intră pe rezervor, nimic altceva", () => {
  assert.equal(canAccessUI("admin2", "/admin/fuel", ["fuel_take"]), true);
  assert.equal(canAccessAPI("admin2", "/api/admin/fuel", ["fuel_take"], "POST"), true);
  assert.equal(canAccessUI("admin2", "/admin/bookings", ["fuel_take"]), false);
  assert.equal(homePathForRole("admin2", ["fuel_take"]), "/admin/fuel");
  assert.equal(fuelAccessOf("admin2", ["fuel_take"]), "take");
});

test("adminul și contul de rezervor complet au tot", () => {
  assert.equal(fuelAccessOf("admin", []), "full");
  assert.equal(fuelAccessOf("admin2", ["fuel"]), "full");
  assert.equal(fuelAccessOf("admin2", ["bookings"]), null);
});
