import {
  WEAPONS,
  applyQueuedOperations,
  canBurst,
  consumeBurst,
  consumeRound,
  createInitialState,
  getWeapon,
  normalizeState,
  remainingAmmo,
  reloadWeapon,
  selectWeapon,
} from "./weapons.js";
import { playBurst, playShot } from "./sound.js";

const METADATA_KEY = "com.onze1.ficha-onze.weapon-ammo";
const LOCAL_STORAGE_KEY = "ficha-onze:weapon-ammo:v1";
const SDK_URL = "https://esm.sh/@owlbear-rodeo/sdk@3.1.0";

const elements = {
  weaponGrid: document.querySelector("#weapon-grid"),
  selectedWeapon: document.querySelector("#selected-weapon"),
  ammoTray: document.querySelector("#ammo-tray"),
  ammoRemaining: document.querySelector("#ammo-remaining"),
  ammoCapacity: document.querySelector("#ammo-capacity"),
  reloadButton: document.querySelector("#reload-button"),
  burstButton: document.querySelector("#burst-button"),
  syncStatus: document.querySelector("#sync-status"),
  syncLabel: document.querySelector("#sync-label"),
  announcement: document.querySelector("#status-announcement"),
};

let state = createInitialState();
let obr;
let storageMode = "local";
let saveQueue = Promise.resolve();
let lastSavedJSON = "";
let isReloadAnimating = false;
let isConnectingOwlbear = false;
let pendingLocalOperations = [];

const AMMO_SVGS = {
  pistol: `<path d="M12 2.5c-3.7 4-5.5 7-5.5 10.2 0 3.3 2.4 5.4 5.5 5.4s5.5-2.1 5.5-5.4C17.5 9.5 15.7 6.5 12 2.5Z"/><path d="M7 15.3h10v4.2H7Z"/>`,
  revolver: `<path d="M12 2.5c-3.1 3.4-4.8 6.3-4.8 9.2 0 3.4 2.1 5.6 4.8 5.6s4.8-2.2 4.8-5.6c0-2.9-1.7-5.8-4.8-9.2Z"/><path d="M7.2 14.6h9.6v4.9H7.2Z"/>`,
  heavy: `<path d="M12 1.5c-2.8 3.8-4.7 7-4.7 10.1 0 3.4 2.1 5.3 4.7 5.3s4.7-1.9 4.7-5.3c0-3.1-1.9-6.3-4.7-10.1Z"/><path d="M7.3 13.9h9.4v6.1H7.3Z"/><path d="M9 18h6"/>`,
  rifle: `<path d="M12 1.5c-3.3 4.2-5 7.3-5 10.3 0 3.4 2.2 5.4 5 5.4s5-2 5-5.4c0-3-1.7-6.1-5-10.3Z"/><path d="M7 14h10v5.5H7Z"/>`,
  shell: `<path d="M7 4h10v12.5c0 2.1-2.2 3.5-5 3.5s-5-1.4-5-3.5Z"/><path d="M7 6h10M8 16h8"/><path d="M8.5 4V2.5h7V4"/>`,
  compact: `<path d="M12 3c-3.2 3.8-4.7 6.6-4.7 9.2 0 3.1 2 5 4.7 5s4.7-1.9 4.7-5C16.7 9.6 15.2 6.8 12 3Z"/><path d="M7.3 14.2h9.4v5H7.3Z"/>`,
  precision: `<path d="M12 1c-2.8 4.4-4.5 8.1-4.5 11.3 0 3.3 1.9 5.3 4.5 5.3s4.5-2 4.5-5.3C16.5 9.1 14.8 5.4 12 1Z"/><path d="M7.5 14h9v6h-9Z"/>`,
  hunting: `<path d="M12 2c-3.1 4-4.8 7-4.8 10 0 3.2 2.1 5.2 4.8 5.2s4.8-2 4.8-5.2c0-3-1.7-6-4.8-10Z"/><path d="M7.2 14h9.6v5.7H7.2Z"/><path d="M9 17.5h6"/>`,
};

function renderWeaponCards() {
  elements.weaponGrid.innerHTML = WEAPONS.map((weapon) => {
    const selected = state.selectedWeapon === weapon.id;
    return `
      <button class="weapon-card${selected ? " is-selected" : ""}" type="button"
        data-weapon="${weapon.id}" aria-pressed="${selected}" aria-label="Selecionar ${weapon.name}">
        <span class="weapon-icon"><img class="weapon-svg" src="./assets/weapons/${weapon.id}.svg" alt="" aria-hidden="true" width="160" height="80" decoding="async"></span>
        <span class="weapon-name">${weapon.name}</span>
      </button>`;
  }).join("");
}

function renderAmmo() {
  const weapon = getWeapon(state.selectedWeapon);
  const spent = state.ammo[weapon.id].spent;
  elements.ammoTray.innerHTML = spent.map((isSpent, index) => `
    <button class="ammo-slot${isSpent ? " is-spent" : ""}" type="button"
      data-ammo-index="${index}" ${isSpent ? "disabled" : ""}
      aria-label="Munição ${index + 1}, ${isSpent ? "disparada" : "disponível"}"
      title="Munição ${index + 1}">
      <svg class="ammo-svg" viewBox="0 0 24 22" aria-hidden="true" focusable="false">
        <g fill="currentColor" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round">${AMMO_SVGS[weapon.ammo]}</g>
      </svg>
      <span class="ammo-index">${String(index + 1).padStart(2, "0")}</span>
    </button>`).join("");

  elements.selectedWeapon.textContent = weapon.name.toLocaleUpperCase("pt-BR");
  elements.ammoRemaining.textContent = String(remainingAmmo(state, weapon.id));
  elements.ammoCapacity.textContent = String(weapon.capacity);
  elements.burstButton.disabled = !canBurst(state, weapon.id);
  elements.reloadButton.disabled = remainingAmmo(state, weapon.id) === weapon.capacity || isReloadAnimating;
}

function render() {
  renderWeaponCards();
  renderAmmo();
}

function announce(message) {
  elements.announcement.textContent = "";
  requestAnimationFrame(() => {
    elements.announcement.textContent = message;
  });
}

function setStorageStatus(mode) {
  storageMode = mode;
  elements.syncLabel.textContent = mode === "obr" ? "OBR • SYNC" : mode === "local" ? "LOCAL" : "OFFLINE";
  elements.syncStatus.classList.toggle("is-connected", mode === "obr");
  elements.syncStatus.classList.toggle("is-offline", mode === "offline");
  elements.syncStatus.title = mode === "obr"
    ? "Munição salva nos metadados do seu jogador no Owlbear Rodeo"
    : mode === "offline"
      ? "A sincronização do Owlbear falhou; salvando localmente neste navegador"
      : "Prévia local: os dados ficam neste navegador";
}

function persistState() {
  const snapshot = normalizeState(state);
  const serialized = JSON.stringify(snapshot);
  lastSavedJSON = serialized;

  if (!obr) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
    } catch (error) {
      console.warn("Não foi possível salvar localmente.", error);
    }
    return Promise.resolve();
  }

  // Keep failed cloud writes retryable: a transient disconnect must not permanently
  // switch this player to local-only mode for the rest of the session.
  saveQueue = saveQueue
    .catch(() => {})
    .then(() => obr.player.setMetadata({ [METADATA_KEY]: snapshot }))
    .then(() => setStorageStatus("obr"))
    .catch((error) => {
      console.error("Falha ao salvar os metadados do jogador no Owlbear Rodeo.", error);
      setStorageStatus("offline");
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
      } catch (localError) {
        console.warn("Também não foi possível salvar localmente.", localError);
      }
    });
  return saveQueue;
}

function updateState(nextState, message, operation = null) {
  state = normalizeState(nextState);
  if (isConnectingOwlbear && operation) pendingLocalOperations.push(operation);
  render();
  persistState();
  if (message) announce(message);
}

function selectWeaponFromButton(weaponId) {
  if (weaponId === state.selectedWeapon) return;
  updateState(selectWeapon(state, weaponId), null, { type: "select", weaponId });
}

function handleAmmoClick(event) {
  const button = event.target.closest("button[data-ammo-index]");
  if (!button || button.disabled) return;
  const weapon = getWeapon(state.selectedWeapon);
  const index = Number(button.dataset.ammoIndex);
  const next = consumeRound(state, weapon.id, index);
  if (remainingAmmo(next, weapon.id) === remainingAmmo(state, weapon.id)) return;

  playShot();
  updateState(next, `Disparo. ${remainingAmmo(next, weapon.id)} munições restantes.`, {
    type: "consume", weaponId: weapon.id, index,
  });
  const firedSlot = elements.ammoTray.querySelector(`[data-ammo-index="${index}"]`);
  firedSlot?.classList.add("just-fired");
}

function handleBurst() {
  const weapon = getWeapon(state.selectedWeapon);
  if (!canBurst(state, weapon.id)) return;

  const next = consumeBurst(state, weapon.id);
  playBurst();
  updateState(next, `Disparada: 10 munições consumidas. ${remainingAmmo(next, weapon.id)} restantes.`, {
    type: "burst", weaponId: weapon.id,
  });
  elements.ammoTray.classList.remove("is-bursting");
  void elements.ammoTray.offsetWidth;
  elements.ammoTray.classList.add("is-bursting");
  window.setTimeout(() => elements.ammoTray.classList.remove("is-bursting"), 520);
}

function handleReload() {
  const weapon = getWeapon(state.selectedWeapon);
  if (remainingAmmo(state, weapon.id) === weapon.capacity || isReloadAnimating) return;

  isReloadAnimating = true;
  const next = reloadWeapon(state, weapon.id);
  updateState(next, `${weapon.name} recarregada.`, { type: "reload", weaponId: weapon.id });
  elements.ammoTray.classList.remove("is-reloading");
  void elements.ammoTray.offsetWidth;
  elements.ammoTray.classList.add("is-reloading");
  elements.reloadButton.disabled = true;
  window.setTimeout(() => {
    isReloadAnimating = false;
    elements.ammoTray.classList.remove("is-reloading");
    renderAmmo();
  }, 620);
}

function bindEvents() {
  elements.weaponGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-weapon]");
    if (button) selectWeaponFromButton(button.dataset.weapon);
  });
  elements.ammoTray.addEventListener("click", handleAmmoClick);
  elements.reloadButton.addEventListener("click", handleReload);
  elements.burstButton.addEventListener("click", handleBurst);
}

function restoreLocalState() {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) state = normalizeState(JSON.parse(stored));
  } catch (error) {
    console.warn("O estado local estava inválido; um carregador novo foi criado.", error);
    state = createInitialState();
  }
  setStorageStatus("local");
}

async function connectOwlbear() {
  const localStateAtConnectStart = normalizeState(state);
  isConnectingOwlbear = true;
  pendingLocalOperations = [];
  try {
    const sdk = await import(SDK_URL);
    const candidate = sdk.default ?? sdk;
    if (!candidate?.isAvailable) {
      isConnectingOwlbear = false;
      pendingLocalOperations = [];
      return false;
    }

    await new Promise((resolve) => candidate.onReady(resolve));
    const playerId = candidate.player.id || await candidate.player.getId();
    const metadata = await candidate.player.getMetadata();
    const storedState = metadata?.[METADATA_KEY];
    const queuedOperations = [...pendingLocalOperations];

    obr = candidate;
    // Start from the player's cloud state, then replay only the clicks made while
    // that state was loading. This preserves other weapons' remote ammunition too.
    state = storedState ? normalizeState(storedState) : localStateAtConnectStart;
    state = applyQueuedOperations(state, queuedOperations);
    lastSavedJSON = JSON.stringify(state);
    setStorageStatus("obr");

    // Player metadata belongs to the current Owlbear player, not to shared room state.
    // Each participant therefore writes only their own namespaced metadata entry.
    candidate.player.onChange((player) => {
      const incoming = player.metadata?.[METADATA_KEY];
      if (!incoming) return;
      const normalized = normalizeState(incoming);
      const serialized = JSON.stringify(normalized);
      if (serialized === lastSavedJSON) return;
      state = normalized;
      lastSavedJSON = serialized;
      render();
    });

    isConnectingOwlbear = false;
    pendingLocalOperations = [];
    // Seed new metadata or persist any queued actions, serialized with future clicks.
    if (!storedState || queuedOperations.length > 0) await persistState();

    console.info(`Arsenal conectado ao Owlbear Rodeo para o jogador ${playerId}.`);
    return true;
  } catch (error) {
    isConnectingOwlbear = false;
    pendingLocalOperations = [];
    console.warn("SDK do Owlbear indisponível; usando armazenamento local.", error);
    return false;
  }
}

async function start() {
  restoreLocalState();
  render();
  bindEvents();

  const connected = await connectOwlbear();
  if (connected) render();
}

start();