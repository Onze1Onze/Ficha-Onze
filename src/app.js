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
} from "./weapons.js?v=audiofix-20261116-3";
import { AMMO_SVGS } from "./ammunition.js?v=audiofix-20261116-3";
import { playBurst, playWeaponReload, playWeaponShot, preloadWeaponAudio } from "./sound.js?v=audiofix-20261116-3";

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



function renderWeaponCards() {
  elements.weaponGrid.innerHTML = WEAPONS.map((weapon) => {
    const selected = state.selectedWeapon === weapon.id;
    return `
      <button class="weapon-card${selected ? " is-selected" : ""}" type="button"
        data-weapon="${weapon.id}" aria-pressed="${selected}" aria-label="Selecionar ${weapon.name}">
        <span class="weapon-icon"><img class="weapon-svg" src="./assets/weapons/${weapon.id}.svg?v=weapon-icons-20261116-1" alt="" aria-hidden="true" width="160" height="80" decoding="async"></span>
        <span class="weapon-name">${weapon.name}</span>
      </button>`;
  }).join("");
}

function renderAmmo() {
  const weapon = getWeapon(state.selectedWeapon);
  const spent = state.ammo[weapon.id].spent;
  const isRevolver = weapon.id === "revolver";

  for (const item of WEAPONS) {
    elements.ammoTray.classList.toggle(`is-${item.id}`, item.id === weapon.id);
  }
  elements.ammoTray.dataset.weapon = weapon.id;
  elements.ammoTray.dataset.ammoType = weapon.ammo;
  elements.ammoTray.setAttribute("aria-label", `Carregador de ${weapon.name}`);

  elements.ammoTray.innerHTML = spent.map((isSpent, index) => {
    const angle = (index * 60 - 90) * Math.PI / 180;
    const ringX = 50 + Math.cos(angle) * 33.5;
    const ringY = 50 + Math.sin(angle) * 33.5;
    const positionStyle = isRevolver
      ? `--slot-x: ${ringX.toFixed(3)}%; --slot-y: ${ringY.toFixed(3)}%;`
      : "";
    return `
    <button class="ammo-slot${isSpent ? " is-spent" : ""}" type="button"
      data-ammo-index="${index}" data-ammo-kind="${weapon.ammo}"
      ${isSpent ? "disabled" : ""}
      style="--ammo-order: ${index}; ${positionStyle}"
      aria-label="${isRevolver ? "Câmara" : "Munição"} ${index + 1}, ${isSpent ? "disparada" : "disponível"}"
      title="${isRevolver ? "Câmara" : "Munição"} ${index + 1}">
      <svg class="ammo-svg" viewBox="0 0 24 30" aria-hidden="true" focusable="false">
        <g fill="currentColor" stroke="currentColor" stroke-width="0.65" stroke-linejoin="round" stroke-linecap="round">${AMMO_SVGS[weapon.ammo]}</g>
      </svg>
      <span class="ammo-index">${String(index + 1).padStart(2, "0")}</span>
    </button>`;
  }).join("");

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

  playWeaponShot(weapon.id);
  elements.ammoTray.classList.remove("is-firing");
  void elements.ammoTray.offsetWidth;
  elements.ammoTray.classList.add("is-firing");
  window.setTimeout(() => elements.ammoTray.classList.remove("is-firing"), 280);
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
  playBurst(weapon.id);
  elements.burstButton.classList.remove("is-animating");
  void elements.burstButton.offsetWidth;
  elements.burstButton.classList.add("is-animating");
  window.setTimeout(() => elements.burstButton.classList.remove("is-animating"), 540);
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
  playWeaponReload(weapon.id);
  elements.reloadButton.classList.remove("is-animating");
  void elements.reloadButton.offsetWidth;
  elements.reloadButton.classList.add("is-animating");
  const next = reloadWeapon(state, weapon.id);
  updateState(next, `${weapon.name} recarregada.`, { type: "reload", weaponId: weapon.id });
  elements.ammoTray.classList.remove("is-reloading");
  void elements.ammoTray.offsetWidth;
  elements.ammoTray.classList.add("is-reloading");
  elements.reloadButton.disabled = true;
  window.setTimeout(() => {
    isReloadAnimating = false;
    elements.ammoTray.classList.remove("is-reloading");
    elements.reloadButton.classList.remove("is-animating");
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
  preloadWeaponAudio();
  restoreLocalState();
  render();
  bindEvents();

  const connected = await connectOwlbear();
  if (connected) render();
}

start();