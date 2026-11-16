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
          icon: { width: iconBox.width, height: iconBox.height, complete: icon.complete, naturalWidth: icon.naturalWidth, naturalHeight: icon.naturalHeight },
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

    await page.locator('[data-weapon="machinegun"]').click();
    await page.waitForFunction(() => document.querySelectorAll(".ammo-slot").length === 50);
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
    if (width <= 380) assert.equal(ammo.columns, 6, `Largura ${width}px: grade de munição deve ter seis colunas`);

    assert.deepEqual(errors, [], `Largura ${width}px: erros JavaScript`);
    console.log(`Layout OK: viewport ${width}px, oito armas alinhadas, 50 munições e controles visíveis.`);
    await page.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}
