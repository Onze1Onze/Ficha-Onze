import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { WEAPONS } from "../src/weapons.js";

test("cada arma possui um SVG local, seguro e com viewport padronizado", async () => {
  assert.equal(WEAPONS.length, 8);

  for (const weapon of WEAPONS) {
    const path = resolve(process.cwd(), "assets", "weapons", `${weapon.id}.svg`);
    const svg = await readFile(path, "utf8");
    const root = svg.match(/<svg\b([^>]*)>/i)?.[1] ?? "";

    assert.match(root, /width="160"/, `${weapon.id}: largura intrínseca deve ser 160`);
    assert.match(root, /height="80"/, `${weapon.id}: altura intrínseca deve ser 80`);
    const viewBox = root.match(/viewBox="([^"]+)"/i)?.[1];
    assert.ok(viewBox, `${weapon.id}: viewBox ausente`);
    const coordinates = viewBox.trim().split(/\s+/).map(Number);
    assert.equal(coordinates.length, 4, `${weapon.id}: viewBox precisa ter quatro coordenadas`);
    assert.ok(coordinates.every(Number.isFinite), `${weapon.id}: viewBox contém coordenadas inválidas`);
    assert.ok(coordinates[2] > 0 && coordinates[3] > 0, `${weapon.id}: viewBox sem área visível`);

    assert.match(svg, /<(path|rect|circle|ellipse|polygon)\b/i, `${weapon.id}: SVG sem geometria`);
    assert.doesNotMatch(svg, /<script\b|<foreignObject\b|<image\b|(?:href|src)="https?:/i,
      `${weapon.id}: SVG contém conteúdo executável ou dependência externa`);
  }

});

test("todos os SVGs de arma usam a mesma cor de base para consistência visual", async () => {
  const files = await Promise.all(WEAPONS.map(({ id }) =>
    readFile(resolve(process.cwd(), "assets", "weapons", `${id}.svg`), "utf8")
  ));
  for (const svg of files) assert.match(svg, /#9AAA93/i);
});
