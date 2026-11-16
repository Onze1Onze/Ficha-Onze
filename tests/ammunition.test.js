import test from "node:test";
import assert from "node:assert/strict";
import { AMMO_SVGS } from "../src/ammunition.js";
import { WEAPONS } from "../src/weapons.js";

test("cada arma possui um layout de carregador exclusivo", () => {
  const layouts = WEAPONS.map((weapon) => weapon.layout);
  assert.equal(layouts.length, 8);
  assert.equal(new Set(layouts).size, 8);
  assert.ok(layouts.every((layout) => typeof layout === "string" && layout.length > 0));
});

test("cada arma utiliza um desenho SVG de munição próprio", () => {
  const ammoTypes = WEAPONS.map((weapon) => weapon.ammo);
  assert.equal(new Set(ammoTypes).size, 8, "As armas não devem compartilhar silhuetas de munição");
  assert.deepEqual(new Set(Object.keys(AMMO_SVGS)), new Set(ammoTypes));
  const designs = Object.values(AMMO_SVGS);
  assert.equal(designs.length, 8);
  assert.equal(new Set(designs).size, 8, "Os oito SVGs devem ser diferentes");
  for (const svg of designs) {
    assert.ok(svg.startsWith("<path "));
    assert.ok(svg.includes("d="));
  }
});

test("capacidades e estilos especiais estão associados às armas corretas", () => {
  const expected = {
    pistol: ["double-stack", 12],
    revolver: ["cylinder", 6],
    machinegun: ["belt", 50],
    "assault-rifle": ["curved-magazine", 30],
    shotgun: ["shell-rack", 6],
    smg: ["compact-magazine", 20],
    sniper: ["single-round", 1],
    "hunting-rifle": ["two-by-two", 4],
  };
  for (const weapon of WEAPONS) {
    assert.deepEqual([weapon.layout, weapon.capacity], expected[weapon.id]);
  }
});
