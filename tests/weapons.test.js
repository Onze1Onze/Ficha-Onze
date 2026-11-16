import test from "node:test";
import assert from "node:assert/strict";
import {
  WEAPONS,
  applyQueuedOperations,
  canBurst,
  consumeBurst,
  consumeRound,
  createInitialState,
  normalizeState,
  remainingAmmo,
  reloadWeapon,
  selectWeapon,
} from "../src/weapons.js";

test("todas as armas possuem a capacidade solicitada", () => {
  assert.deepEqual(WEAPONS.map(({ name, capacity }) => [name, capacity]), [
    ["Pistola", 12],
    ["Revólver", 6],
    ["Metralhadora", 50],
    ["Fuzil de Assalto", 30],
    ["Escopeta", 6],
    ["Submetralhadora", 20],
    ["Fuzil de Precisão", 1],
    ["Fuzil de Caça", 4],
  ]);
});

test("cada arma conserva o próprio carregador ao alternar a seleção", () => {
  let state = createInitialState();
  state = consumeRound(state, "pistol", 0);
  state = consumeRound(state, "pistol", 1);
  state = selectWeapon(state, "revolver");
  state = consumeRound(state, "revolver", 0);
  state = selectWeapon(state, "pistol");

  assert.equal(remainingAmmo(state, "pistol"), 10);
  assert.equal(remainingAmmo(state, "revolver"), 5);
  assert.equal(remainingAmmo(state, "machinegun"), 50);
});

test("um disparo individual consome somente o ícone escolhido", () => {
  const initial = createInitialState();
  const next = consumeRound(initial, "pistol", 7);

  assert.equal(remainingAmmo(next, "pistol"), 11);
  assert.equal(next.ammo.pistol.spent[7], true);
  assert.equal(next.ammo.pistol.spent[6], false);
  assert.equal(remainingAmmo(initial, "pistol"), 12);
});

test("não permite consumir duas vezes o mesmo ícone", () => {
  let state = consumeRound(createInitialState(), "pistol", 2);
  const onceSpent = state;
  state = consumeRound(state, "pistol", 2);
  assert.deepEqual(state, onceSpent);
  assert.equal(remainingAmmo(state, "pistol"), 11);
});

test("Disparada consome exatamente dez munições e só habilita com dez disponíveis", () => {
  let state = createInitialState();
  assert.equal(canBurst(state, "pistol"), true);
  state = consumeBurst(state, "pistol");
  assert.equal(remainingAmmo(state, "pistol"), 2);
  assert.equal(state.ammo.pistol.spent.filter(Boolean).length, 10);
  assert.equal(canBurst(state, "pistol"), false);
  const unchanged = consumeBurst(state, "pistol");
  assert.deepEqual(unchanged, state);
});

test("Disparada nunca consome parcialmente se houver menos de dez balas", () => {
  let state = createInitialState();
  for (let index = 0; index < 3; index += 1) state = consumeRound(state, "pistol", index);
  assert.equal(remainingAmmo(state, "pistol"), 9);
  assert.equal(canBurst(state, "pistol"), false);
  assert.deepEqual(consumeBurst(state, "pistol"), state);
});

test("Disparada seleciona dez munições ainda disponíveis mesmo com espaços já gastos", () => {
  let state = createInitialState();
  for (const index of [1, 4, 7]) state = consumeRound(state, "machinegun", index);
  state = consumeBurst(state, "machinegun");
  assert.equal(remainingAmmo(state, "machinegun"), 37);
  assert.equal(state.ammo.machinegun.spent.filter(Boolean).length, 13);
  assert.equal(state.ammo.machinegun.spent[1], true);
  assert.equal(state.ammo.machinegun.spent[4], true);
  assert.equal(state.ammo.machinegun.spent[7], true);
});

test("recarga restaura apenas a arma selecionada", () => {
  let state = createInitialState();
  state = consumeRound(state, "pistol", 0);
  state = consumeRound(state, "revolver", 0);
  state = reloadWeapon(state, "pistol");

  assert.equal(remainingAmmo(state, "pistol"), 12);
  assert.equal(remainingAmmo(state, "revolver"), 5);
});

test("fuzil de precisão não pode executar Disparada", () => {
  const state = selectWeapon(createInitialState(), "sniper");
  assert.equal(remainingAmmo(state), 1);
  assert.equal(canBurst(state), false);
  assert.deepEqual(consumeBurst(state), state);
});

test("normalização limita os dados recebidos à capacidade real de cada carregador", () => {
  const state = normalizeState({
    selectedWeapon: "arma-inexistente",
    ammo: {
      pistol: { spent: [true, false, true, true, true, true, true, true, true, true, true, true, true] },
      revolver: { spent: "corrompido" },
    },
  });
  assert.equal(state.selectedWeapon, "pistol");
  assert.equal(state.ammo.pistol.spent.length, 12);
  assert.equal(remainingAmmo(state, "pistol"), 1);
  assert.equal(state.ammo.revolver.spent.length, 6);
  assert.equal(remainingAmmo(state, "revolver"), 6);
});

test("identificadores de arma inválidos nunca alteram o carregador da pistola", () => {
  const initial = createInitialState();
  const invalidRound = consumeRound(initial, "unknown-weapon", 0);
  const invalidBurst = consumeBurst(initial, "unknown-weapon");
  const invalidReload = reloadWeapon(initial, "unknown-weapon");

  assert.deepEqual(invalidRound, initial);
  assert.deepEqual(invalidBurst, initial);
  assert.deepEqual(invalidReload, initial);
  assert.equal(remainingAmmo(initial, "unknown-weapon"), 0);
  assert.equal(canBurst(initial, "unknown-weapon"), false);
});

test("consultas seguras com estado ausente não lançam exceções", () => {
  assert.equal(remainingAmmo(null), 0);
  assert.equal(canBurst(null), false);
  assert.deepEqual(consumeBurst(null), createInitialState());
});


test("o estado inicial já contém todos os ícones de munição, inclusive sem Owlbear conectado", () => {
  const state = createInitialState();
  for (const weapon of WEAPONS) {
    assert.equal(state.ammo[weapon.id].spent.length, weapon.capacity);
    assert.equal(state.ammo[weapon.id].spent.every((round) => round === false), true);
    assert.equal(remainingAmmo(state, weapon.id), weapon.capacity);
  }
});


test("ações feitas durante a conexão preservam dados remotos de outras armas", () => {
  let remote = createInitialState();
  remote = consumeRound(remote, "pistol", 5);
  remote = consumeRound(remote, "revolver", 2);

  const queued = applyQueuedOperations(remote, [
    { type: "consume", weaponId: "pistol", index: 0 },
    { type: "select", weaponId: "revolver" },
  ]);

  assert.equal(remainingAmmo(queued, "pistol"), 10);
  assert.equal(remainingAmmo(queued, "revolver"), 5);
  assert.equal(queued.selectedWeapon, "revolver");
});

test("uma recarga ocorrida enquanto sincroniza limpa todo o carregador remoto", () => {
  let remote = createInitialState();
  remote = consumeRound(remote, "pistol", 0);
  remote = consumeRound(remote, "pistol", 7);

  const merged = applyQueuedOperations(remote, [
    { type: "reload", weaponId: "pistol" },
  ]);

  assert.equal(remainingAmmo(merged, "pistol"), 12);
  assert.equal(merged.ammo.pistol.spent.some(Boolean), false);
  assert.equal(remainingAmmo(merged, "revolver"), 6);
});
