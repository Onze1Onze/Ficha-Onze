export const WEAPONS = Object.freeze([
  { id: "pistol", name: "Pistola", capacity: 12, icon: "pistol", ammo: "pistol" },
  { id: "revolver", name: "Revólver", capacity: 6, icon: "revolver", ammo: "revolver" },
  { id: "machinegun", name: "Metralhadora", capacity: 50, icon: "machinegun", ammo: "heavy" },
  { id: "assault-rifle", name: "Fuzil de Assalto", capacity: 30, icon: "assault", ammo: "rifle" },
  { id: "shotgun", name: "Escopeta", capacity: 6, icon: "shotgun", ammo: "shell" },
  { id: "smg", name: "Submetralhadora", capacity: 20, icon: "smg", ammo: "compact" },
  { id: "sniper", name: "Fuzil de Precisão", capacity: 1, icon: "sniper", ammo: "precision" },
  { id: "hunting-rifle", name: "Fuzil de Caça", capacity: 4, icon: "hunting", ammo: "hunting" },
]);

const WEAPON_IDS = new Set(WEAPONS.map((weapon) => weapon.id));
const WEAPON_BY_ID = new Map(WEAPONS.map((weapon) => [weapon.id, weapon]));

export function getWeapon(weaponId) {
  return WEAPON_BY_ID.get(weaponId) ?? WEAPONS[0];
}

export function createInitialState() {
  return {
    version: 1,
    selectedWeapon: WEAPONS[0].id,
    ammo: Object.fromEntries(WEAPONS.map(({ id }) => [id, { spent: [] }])),
  };
}

/** Rebuilds persisted input into a bounded, versioned state object. */
export function normalizeState(input) {
  const initial = createInitialState();
  if (!input || typeof input !== "object") return initial;

  const selectedWeapon = WEAPON_IDS.has(input.selectedWeapon)
    ? input.selectedWeapon
    : initial.selectedWeapon;

  const ammo = {};
  for (const weapon of WEAPONS) {
    const rawSpent = input.ammo?.[weapon.id]?.spent;
    ammo[weapon.id] = {
      spent: Array.from({ length: weapon.capacity }, (_, index) => rawSpent?.[index] === true),
    };
  }

  return { version: 1, selectedWeapon, ammo };
}

export function remainingAmmo(state, weaponId = state.selectedWeapon) {
  const weapon = getWeapon(weaponId);
  const spent = normalizeState(state).ammo[weapon.id].spent;
  return weapon.capacity - spent.filter(Boolean).length;
}

export function selectWeapon(state, weaponId) {
  if (!WEAPON_IDS.has(weaponId)) return normalizeState(state);
  return { ...normalizeState(state), selectedWeapon: weaponId };
}

export function consumeRound(state, weaponId, index) {
  const next = normalizeState(state);
  const weapon = getWeapon(weaponId);
  if (!Number.isInteger(index) || index < 0 || index >= weapon.capacity) return next;
  if (next.ammo[weapon.id].spent[index]) return next;

  next.ammo[weapon.id].spent[index] = true;
  return next;
}

export function canBurst(state, weaponId = state.selectedWeapon) {
  return remainingAmmo(state, weaponId) >= 10;
}

/** Consumes ten available rounds atomically, or leaves the state untouched. */
export function consumeBurst(state, weaponId = state.selectedWeapon) {
  const next = normalizeState(state);
  const weapon = getWeapon(weaponId);
  if (!canBurst(next, weapon.id)) return next;

  let consumed = 0;
  for (let index = 0; index < weapon.capacity && consumed < 10; index += 1) {
    if (!next.ammo[weapon.id].spent[index]) {
      next.ammo[weapon.id].spent[index] = true;
      consumed += 1;
    }
  }
  return consumed === 10 ? next : normalizeState(state);
}

export function reloadWeapon(state, weaponId = state.selectedWeapon) {
  const next = normalizeState(state);
  const weapon = getWeapon(weaponId);
  next.ammo[weapon.id].spent = Array(weapon.capacity).fill(false);
  return next;
}