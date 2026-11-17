import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const file = resolve(root, relative);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const info = await stat(file);
    const target = info.isDirectory() ? resolve(file, "index.html") : file;
    const content = await readFile(target);
    response.writeHead(200, { "content-type": mime[extname(target)] ?? "application/octet-stream" });
    response.end(content);
  } catch {
    response.writeHead(404).end("Not Found");
  }
});

await new Promise((resolveListen) => server.listen(4179, "127.0.0.1", resolveListen));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const width of [280, 320, 360, 440]) {
    const page = await browser.newPage({
      viewport: { width, height: 820 },
      deviceScaleFactor: 2,
      isMobile: width <= 380,
      hasTouch: width <= 380,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://esm.sh/**", (route) => route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: "export default { isAvailable: false };",
    }));
    // Simulate browsers where Web Audio is unavailable: a shot must still consume ammunition.
    await page.addInitScript(() => {
      Object.defineProperty(window, "AudioContext", {
        configurable: true,
        value: class { constructor() { throw new Error("Audio disabled for regression test"); } },
      });
      window.__playedWeaponSounds = [];
      HTMLMediaElement.prototype.load = function () {};
      HTMLMediaElement.prototype.play = function () {
        const source = this.currentSrc || this.src;
        window.__playedWeaponSounds.push(new URL(source).pathname.split("/").pop());
        return Promise.resolve();
      };
    });
    await page.goto("http://127.0.0.1:4179/", { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelectorAll(".weapon-card").length === 8);

    const initial = await page.evaluate(() => {
      const grid = document.querySelector("#weapon-grid");
      const app = document.querySelector("#app");
      const cards = [...document.querySelectorAll(".weapon-card")].map((element) => {
        const box = element.getBoundingClientRect();
        const icon = element.querySelector("img");
        const iconBox = icon.getBoundingClientRect();
        return {
          x: box.x, y: box.y, width: box.width, height: box.height,
          right: box.right, bottom: box.bottom,
          icon: { x: iconBox.x, y: iconBox.y, right: iconBox.right, bottom: iconBox.bottom, width: iconBox.width, height: iconBox.height, complete: icon.complete, naturalWidth: icon.naturalWidth, naturalHeight: icon.naturalHeight },
          name: (() => { const nameBox = element.querySelector(".weapon-name").getBoundingClientRect(); return { x: nameBox.x, y: nameBox.y, right: nameBox.right, bottom: nameBox.bottom, width: nameBox.width, height: nameBox.height }; })(),
        };
      });
      const gridBox = grid.getBoundingClientRect();
      const actionButtons = [...document.querySelectorAll(".action-button")].map((button) => {
        const box = button.getBoundingClientRect();
        return { x: box.x, right: box.right, width: box.width, height: box.height };
      });
      return {
        cards,
        grid: { x: gridBox.x, right: gridBox.right, width: gridBox.width },
        app: { clientWidth: app.clientWidth, scrollWidth: app.scrollWidth },
        columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
        actionButtons,
      };
    });

    assert.equal(initial.cards.length, 8, `Largura ${width}px: quantidade de cartões`);
    assert.ok(initial.app.scrollWidth <= initial.app.clientWidth + 1, `Largura ${width}px: overflow horizontal no painel`);
    const widths = initial.cards.map((card) => card.width);
    const heights = initial.cards.map((card) => card.height);
    assert.ok(Math.max(...widths) - Math.min(...widths) <= 1, `Largura ${width}px: cartões com larguras desalinhadas`);
    assert.ok(Math.max(...heights) - Math.min(...heights) <= 1, `Largura ${width}px: cartões com alturas desalinhadas`);
    for (const card of initial.cards) {
      assert.ok(card.x >= initial.grid.x - 1 && card.right <= initial.grid.right + 1, `Largura ${width}px: cartão fora da bandeja`);
      assert.ok(card.icon.complete && card.icon.naturalWidth === 160 && card.icon.naturalHeight === 80, `Largura ${width}px: ícone não carregou em tamanho padronizado`);
      assert.ok(card.icon.width > 0 && card.icon.height > 0, `Largura ${width}px: ícone sem dimensões renderizadas`);
      assert.ok(card.icon.x >= card.x && card.icon.right <= card.right, `Largura ${width}px: ícone fora do cartão`);
      assert.ok(card.name.x >= card.x && card.name.right <= card.right, `Largura ${width}px: nome fora do cartão`);
      assert.ok(card.icon.bottom <= card.name.y + 1 || card.icon.right <= card.name.x + 1,
        `Largura ${width}px: ícone e nome sobrepostos`);
    }
    if (width <= 380) {
      const columns = new Set(initial.cards.map((card) => Math.round(card.x)));
      assert.equal(initial.columns, 2, `Largura ${width}px: a grade mobile deve ter duas colunas`);
      assert.equal(columns.size, 2, `Largura ${width}px: cartões não alinharam em duas colunas`);
    }
    for (const button of initial.actionButtons) {
      assert.ok(button.width >= 100, `Largura ${width}px: botão de ação pequeno demais`);
      assert.ok(button.height >= 40, `Largura ${width}px: botão de ação baixo demais`);
    }

    // Local preview must start with a complete magazine, even when the Owlbear SDK is absent.
    assert.equal(await page.locator(".ammo-slot").count(), 12, `Largura ${width}px: carregador inicial vazio`);
    await page.locator('[data-ammo-index="3"]').click();
    await page.waitForFunction(() => document.querySelector("#ammo-remaining").textContent === "11");
    assert.equal(await page.locator('[data-ammo-index="3"]').isDisabled(), true,
      `Largura ${width}px: disparo individual não apagou a munição`);
    assert.equal(await page.evaluate(() => window.__playedWeaponSounds.at(-1)), "assault-rifle-fire.ogg",
      `Largura ${width}px: o disparo da pistola precisa tocar o arquivo próprio`);

    // A sound playback failure must not prevent the ammunition action or local state update.
    await page.locator("#reload-button").click();
    assert.equal(await page.evaluate(() => window.__playedWeaponSounds.at(-1)), "pistol-reload.ogg",
      `Largura ${width}px: a recarga da pistola precisa tocar o arquivo próprio`);
    await page.waitForFunction(() =>
      document.querySelector("#ammo-remaining").textContent === "12" &&
      !document.querySelector("#ammo-tray").classList.contains("is-reloading")
    );

    await page.locator('[data-weapon="revolver"]').click();
    assert.equal(await page.locator(".ammo-slot").count(), 6, `Largura ${width}px: capacidade do revólver`);
    await page.waitForTimeout(220);
    const cylinder = await page.evaluate(() => {
      const tray = document.querySelector("#ammo-tray");
      const trayBox = tray.getBoundingClientRect();
      const centerX = trayBox.left + trayBox.width / 2;
      const centerY = trayBox.top + trayBox.height / 2;
      const slots = [...tray.querySelectorAll(".ammo-slot")].map((slot) => {
        const box = slot.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        return {
          distance: Math.hypot(x - centerX, y - centerY),
          angle: (Math.atan2(y - centerY, x - centerX) * 180 / Math.PI + 360) % 360,
          inside: box.left >= trayBox.left && box.right <= trayBox.right &&
            box.top >= trayBox.top && box.bottom <= trayBox.bottom,
        };
      });
      return {
        isCylinder: tray.classList.contains("is-revolver"),
        tray: { x: trayBox.x, y: trayBox.y, width: trayBox.width, height: trayBox.height },
        slots,
      };
    });
    assert.equal(cylinder.isCylinder, true, `Largura ${width}px: revólver sem layout de tambor`);
    assert.equal(cylinder.slots.length, 6);
    assert.ok(cylinder.slots.every((slot) => slot.inside),
      `Largura ${width}px: câmara fora do tambor; geometria=${JSON.stringify(cylinder)}`);
    const radii = cylinder.slots.map((slot) => slot.distance);
    assert.ok(Math.max(...radii) - Math.min(...radii) <= 2, `Largura ${width}px: câmaras não formam um círculo`);
    const angles = cylinder.slots.map((slot) => slot.angle).sort((a, b) => a - b);
    for (let i = 1; i < angles.length; i += 1) {
      assert.ok(Math.abs((angles[i] - angles[i - 1]) - 60) <= 5,
        `Largura ${width}px: câmaras fora do intervalo de 60 graus`);
    }
    assert.ok(Math.abs((angles[0] + 360 - angles.at(-1)) - 60) <= 5,
      `Largura ${width}px: intervalo de fechamento do tambor incorreto`);

    const weaponLayouts = [
      ["pistol", 12, "pistol"],
      ["revolver", 6, "revolver"],
      ["machinegun", 50, "machinegun"],
      ["assault-rifle", 30, "assault-rifle"],
      ["shotgun", 6, "shotgun"],
      ["smg", 20, "smg"],
      ["sniper", 1, "sniper"],
      ["hunting-rifle", 4, "hunting-rifle"],
    ];
    for (const [weaponId, capacity, styleId] of weaponLayouts) {
      await page.locator(`[data-weapon="${weaponId}"]`).click();
      const trayState = await page.evaluate(() => {
        const tray = document.querySelector("#ammo-tray");
        const box = tray.getBoundingClientRect();
        const action = document.querySelector(".action-bar").getBoundingClientRect();
        const slots = [...tray.querySelectorAll(".ammo-slot")];
        return {
          styles: [...tray.classList],
          dataWeapon: tray.dataset.weapon,
          dataAmmoType: tray.dataset.ammoType,
          count: slots.length,
          iconKinds: [...new Set(slots.map((slot) => slot.dataset.ammoKind))],
          trayBottom: box.bottom,
          actionTop: action.top,
          trayHeight: box.height,
          scrollHeight: tray.scrollHeight,
          clientHeight: tray.clientHeight,
          borderRadius: getComputedStyle(tray).borderRadius,
          firstSlot: slots[0]?.getBoundingClientRect().toJSON(),
        };
      });
      assert.ok(trayState.styles.includes(`is-${styleId}`), `${weaponId}: layout temático não aplicado`);
      assert.equal(trayState.dataWeapon, weaponId);
      assert.equal(trayState.count, capacity, `${weaponId}: quantidade de munições incorreta`);
      assert.equal(trayState.iconKinds.length, 1);
      assert.ok(trayState.trayBottom <= trayState.actionTop + 1,
        `Largura ${width}px: ${weaponId} sobrepõe os botões de ação`);
      assert.ok(trayState.trayHeight > 0);
      assert.ok(trayState.firstSlot.width > 0 && trayState.firstSlot.height > 0);
      if (weaponId === "machinegun" || weaponId === "assault-rifle") {
        assert.ok(trayState.scrollHeight >= trayState.clientHeight,
          `${weaponId}: carregador precisa permanecer contido na bandeja escrolável`);
      }
    }

    await page.locator('[data-weapon="revolver"]').click();
    await page.locator('[data-ammo-index="2"]').click();
    await page.waitForFunction(() => document.querySelector("#ammo-remaining").textContent === "5");
    await page.locator('[data-weapon="pistol"]').click();
    assert.equal(await page.locator("#ammo-remaining").textContent(), "12",
      `Largura ${width}px: munição da pistola não foi preservada`);
    await page.locator('[data-weapon="revolver"]').click();
    assert.equal(await page.locator("#ammo-remaining").textContent(), "5",
      `Largura ${width}px: munição do revólver não foi preservada`);

    await page.locator('[data-weapon="machinegun"]').click();
    await page.waitForFunction(() => document.querySelectorAll(".ammo-slot").length === 50);
    for (const expected of ["40", "30", "20", "10", "0"]) {
      await page.locator("#burst-button").click();
      assert.equal(
        await page.evaluate(() => window.__playedWeaponSounds.at(-1)),
        "machinegun-fire.ogg",
        "Disparada deve usar o som real da arma selecionada"
      );
      await page.waitForFunction((value) => document.querySelector("#ammo-remaining").textContent === value, expected);
    }
    assert.equal(await page.locator("#burst-button").isDisabled(), true,
      `Largura ${width}px: Disparada continua ativa com menos de dez balas`);
    await page.locator("#burst-button").evaluate((button) => button.click());
    assert.equal(await page.locator("#ammo-remaining").textContent(), "0",
      `Largura ${width}px: Disparada consumiu munição mesmo desabilitada`);
    await page.locator("#reload-button").click();
    await page.waitForFunction(() =>
      document.querySelector("#ammo-remaining").textContent === "50" &&
      !document.querySelector("#ammo-tray").classList.contains("is-reloading")
    );
    const ammo = await page.evaluate(() => {
      const tray = document.querySelector("#ammo-tray");
      const slots = [...tray.querySelectorAll(".ammo-slot")].map((el) => {
        const box = el.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      });
      return {
        columns: getComputedStyle(tray).gridTemplateColumns.split(" ").length,
        scrollHeight: tray.scrollHeight,
        clientHeight: tray.clientHeight,
        widths: slots.map((slot) => slot.width),
        heights: slots.map((slot) => slot.height),
        trayWidth: tray.clientWidth,
      };
    });
    assert.equal(ammo.widths.length, 50);
    assert.ok(Math.max(...ammo.widths) - Math.min(...ammo.widths) <= 1, `Largura ${width}px: munições com larguras desalinhadas`);
    assert.ok(Math.max(...ammo.heights) - Math.min(...ammo.heights) <= 1, `Largura ${width}px: munições com alturas desalinhadas`);
    assert.ok(ammo.scrollHeight > ammo.clientHeight, `Largura ${width}px: carregador de 50 balas não ativa rolagem`);
    if (width <= 380) assert.equal(ammo.columns, 10, `Largura ${width}px: cinta da metralhadora deve ter dez colunas`);

    if (width === 360) {
      const audioPairs = [
        ["pistol", "assault-rifle-fire.ogg", "pistol-reload.ogg"],
        ["revolver", "machinegun-fire.ogg", "revolver-reload.wav"],
        ["machinegun", "machinegun-fire.ogg", "machinegun-reload.ogg"],
        ["assault-rifle", "assault-rifle-fire.ogg", "assault-rifle-reload.ogg"],
        ["shotgun", "shotgun-fire.ogg", "shotgun-reload.ogg"],
        ["smg", "machinegun-fire.ogg", "smg-reload.ogg"],
        ["sniper", "sniper-fire.ogg", "sniper-reload.ogg"],
        ["hunting-rifle", "assault-rifle-fire.ogg", "hunting-rifle-reload.ogg"],
      ];
      for (const [weaponId, expectedFire, expectedReload] of audioPairs) {
        await page.locator(`[data-weapon="${weaponId}"]`).click();
        await page.locator('[data-ammo-index="0"]').click();
        assert.equal(await page.evaluate(() => window.__playedWeaponSounds.at(-1)), expectedFire,
          `${weaponId}: clique na munição precisa tocar seu disparo correspondente`);
        await page.locator("#reload-button").click();
        assert.equal(await page.evaluate(() => window.__playedWeaponSounds.at(-1)), expectedReload,
          `${weaponId}: recarga precisa tocar seu arquivo correspondente`);
        await page.waitForFunction(() =>
          !document.querySelector("#ammo-tray").classList.contains("is-reloading")
        );
      }
      console.log("Audio mapping OK: disparo e recarga corretos para as oito armas.");
    }

    assert.deepEqual(errors, [], `Largura ${width}px: erros JavaScript`);
    console.log(`Layout OK: viewport ${width}px, oito armas alinhadas, 50 munições e controles visíveis.`);
    await page.close();
  }

  // Web Audio may exist before its file buffers finish decoding. In that window,
  // the app must still play the mapped local file instead of a synthesized substitute.
  const pendingDecodePage = await browser.newPage({ viewport: { width: 360, height: 820 } });
  await pendingDecodePage.route("https://esm.sh/**", (route) => route.fulfill({
    status: 200,
    contentType: "text/javascript",
    body: "export default { isAvailable: false };",
  }));
  await pendingDecodePage.addInitScript(() => {
    class DelayedAudioContext {
      constructor() {
        this.state = "running";
        this.currentTime = 0;
        this.sampleRate = 44100;
        this.destination = {};
      }
      decodeAudioData() {
        return new Promise((resolve) => setTimeout(() => resolve({ duration: 0.2 }), 5000));
      }
    }
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: DelayedAudioContext,
    });
    window.__playedPendingDecodeSounds = [];
    HTMLMediaElement.prototype.load = function () {};
    HTMLMediaElement.prototype.play = function () {
      const source = this.currentSrc || this.src;
      window.__playedPendingDecodeSounds.push(new URL(source).pathname.split("/").pop());
      return Promise.resolve();
    };
  });
  await pendingDecodePage.goto("http://127.0.0.1:4179/", { waitUntil: "networkidle" });
  await pendingDecodePage.waitForFunction(() => document.querySelectorAll(".weapon-card").length === 8);
  const pendingDecodeMappings = [
    ["pistol", "assault-rifle-fire.ogg"],
    ["revolver", "machinegun-fire.ogg"],
    ["hunting-rifle", "assault-rifle-fire.ogg"],
    ["smg", "machinegun-fire.ogg"],
  ];
  for (const [weaponId, expectedFile] of pendingDecodeMappings) {
    await pendingDecodePage.locator(`.weapon-card[data-weapon="${weaponId}"]`).click();
    await pendingDecodePage.locator('[data-ammo-index="0"]').click();
    assert.equal(
      await pendingDecodePage.evaluate(() => window.__playedPendingDecodeSounds.at(-1)),
      expectedFile,
      `${weaponId}: o som mapeado precisa tocar mesmo antes do decode Web Audio terminar`
    );
  }
  await pendingDecodePage.close();
  console.log("Audio preload race OK: o arquivo mapeado toca mesmo com Web Audio ainda decodificando.");

  // Simulate the Owlbear metadata arriving after the user has already clicked.
  const syncPage = await browser.newPage({ viewport: { width: 360, height: 820 }, deviceScaleFactor: 2 });
  await syncPage.route("https://esm.sh/**", (route) => route.fulfill({
    status: 200,
    contentType: "text/javascript",
    body: `
      const makeAmmo = (capacity) => ({ spent: Array(capacity).fill(false) });
      const remote = {
        version: 1,
        selectedWeapon: "pistol",
        ammo: {
          pistol: makeAmmo(12),
          revolver: makeAmmo(6),
          machinegun: makeAmmo(50),
          "assault-rifle": makeAmmo(30),
          shotgun: makeAmmo(6),
          smg: makeAmmo(20),
          sniper: makeAmmo(1),
          "hunting-rifle": makeAmmo(4)
        }
      };
      remote.ammo.revolver.spent[2] = true;
      let onPlayerChange;
      const player = {
        id: "sync-regression-player",
        metadata: {},
        async getMetadata() {
          await new Promise((resolve) => setTimeout(resolve, 900));
          return { "com.onze1.ficha-onze.weapon-ammo": remote };
        },
        async setMetadata(update) {
          player.metadata = { ...player.metadata, ...update };
          window.__savedArsenal = update["com.onze1.ficha-onze.weapon-ammo"];
          onPlayerChange?.(player);
        },
        onChange(callback) {
          onPlayerChange = callback;
          return () => {};
        }
      };
      export default {
        isAvailable: true,
        onReady(callback) { setTimeout(callback, 0); },
        player
      };
    `,
  }));
  await syncPage.goto("http://127.0.0.1:4179/", { waitUntil: "networkidle" });
  await syncPage.waitForFunction(() => document.querySelectorAll(".weapon-card").length === 8);
  await syncPage.locator('[data-ammo-index="0"]').click();
  await syncPage.waitForFunction(() => document.querySelector("#ammo-remaining").textContent === "11");
  await syncPage.waitForFunction(() => window.__savedArsenal !== undefined, { timeout: 5000 });
  const synced = await syncPage.evaluate(() => ({
    label: document.querySelector("#sync-label").textContent,
    pistolSpent: window.__savedArsenal.ammo.pistol.spent,
    revolverSpent: window.__savedArsenal.ammo.revolver.spent,
  }));
  assert.equal(synced.label, "OBR • SYNC");
  assert.equal(synced.pistolSpent[0], true, "O clique anterior à conexão precisa ser reaplicado");
  assert.equal(synced.revolverSpent[2], true, "A munição remota de outra arma precisa ser preservada");
  await syncPage.close();
  console.log("Sync race OK: clique local reaplicado sem apagar munição remota de outras armas.");

  // Decode every local sound with Chromium's actual media decoder (without autoplay).
  const decoderPage = await browser.newPage({ viewport: { width: 360, height: 820 } });
  await decoderPage.route("https://esm.sh/**", (route) => route.fulfill({
    status: 200,
    contentType: "text/javascript",
    body: "export default { isAvailable: false };",
  }));
  await decoderPage.goto("http://127.0.0.1:4179/", { waitUntil: "networkidle" });
  const decodedSounds = await decoderPage.evaluate(async () => {
    const filenames = [
      "pistol-fire.wav", "pistol-reload.ogg",
      "revolver-fire.mp3", "revolver-reload.wav",
      "machinegun-fire.ogg", "machinegun-reload.ogg",
      "assault-rifle-fire.ogg", "assault-rifle-reload.ogg",
      "shotgun-fire.ogg", "shotgun-reload.ogg",
      "smg-fire.ogg", "smg-reload.ogg",
      "sniper-fire.ogg", "sniper-reload.ogg",
      "hunting-rifle-fire.ogg", "hunting-rifle-reload.ogg",
    ];
    const context = new AudioContext();
    const decoded = [];
    try {
      for (const filename of filenames) {
        const response = await fetch(`./assets/audio/weapons/${filename}`);
        if (!response.ok) throw new Error(`${filename}: HTTP ${response.status}`);
        const bytes = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(bytes.slice(0));
        decoded.push({
          filename,
          duration: buffer.duration,
          channels: buffer.numberOfChannels,
          sampleRate: buffer.sampleRate,
        });
      }
    } finally {
      await context.close();
    }
    return decoded;
  });
  assert.equal(decodedSounds.length, 16);
  for (const sound of decodedSounds) {
    assert.ok(sound.duration > 0.02, `${sound.filename}: áudio decodificado sem duração`);
    assert.ok(sound.channels >= 1, `${sound.filename}: nenhum canal de áudio`);
  }
  await decoderPage.close();
  console.log("Audio codec OK: Chromium decodificou os 16 efeitos locais.");
 } finally {
  if (browser) await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
