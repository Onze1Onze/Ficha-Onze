(() => {
  "use strict";

  const STORAGE_KEY = "ficha-onze.google-sheets.v1";
  const setupView = document.getElementById("setupView");
  const viewerView = document.getElementById("viewerView");
  const form = document.getElementById("sheetForm");
  const urlInput = document.getElementById("sheetUrl");
  const formError = document.getElementById("formError");
  const frame = document.getElementById("sheetFrame");
  const frameLoading = document.getElementById("frameLoading");
  const openExternalLink = document.getElementById("openExternalLink");

  let currentSheet = null;
  let loadingFallback = null;

  function extractCandidate(rawValue) {
    const value = String(rawValue || "").trim();
    const iframeSrc = value.match(/src\s*=\s*["']([^"']+)["']/i);
    return (iframeSrc ? iframeSrc[1] : value).trim();
  }

  function normalizeGoogleSheet(rawValue) {
    const candidate = extractCandidate(rawValue);
    let source;

    try {
      source = new URL(candidate);
    } catch (_) {
      throw new Error("Cole um link válido do Google Sheets.");
    }

    if (source.protocol !== "https:" || source.hostname !== "docs.google.com" || !source.pathname.includes("/spreadsheets/")) {
      throw new Error("O endereço precisa ser um link do Google Sheets (docs.google.com/spreadsheets).");
    }

    const match = source.pathname.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/(?:e\/)?([^/]+)/);
    if (!match || !match[1]) {
      throw new Error("Não consegui encontrar o identificador da planilha nesse link.");
    }

    const sheetId = match[1];
    const gidFromHash = source.hash.match(/(?:^#|&)gid=([^&]+)/);
    const gid = source.searchParams.get("gid") || (gidFromHash ? gidFromHash[1] : null);
    const isPublished = /\/pubhtml(?:\/|$)/i.test(source.pathname) || /\/pub(?:\/|$)/i.test(source.pathname);

    let embedUrl;
    if (isPublished) {
      embedUrl = new URL(source.href);
      embedUrl.hash = "";
      embedUrl.searchParams.set("widget", "true");
      embedUrl.searchParams.set("headers", "false");
    } else {
      embedUrl = new URL("https://docs.google.com/spreadsheets/d/" + encodeURIComponent(sheetId) + "/pubhtml");
      embedUrl.searchParams.set("widget", "true");
      embedUrl.searchParams.set("headers", "false");
      if (gid) embedUrl.searchParams.set("gid", gid);
    }

    return {
      sourceUrl: source.href,
      embedUrl: embedUrl.href,
      sheetId,
      isPublished
    };
  }

  function readSavedSheet() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved.sourceUrl !== "string" || typeof saved.embedUrl !== "string") return null;
      return saved;
    } catch (_) {
      return null;
    }
  }

  function saveSheet(sheet) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sheet));
    } catch (_) {
      // A planilha continua disponível durante esta abertura mesmo se o armazenamento estiver bloqueado.
    }
  }

  function showSetup(prefill = "") {
    clearTimeout(loadingFallback);
    currentSheet = null;
    frame.removeAttribute("src");
    openExternalLink.href = "#";
    frameLoading.classList.remove("is-hidden");
    frameLoading.hidden = false;
    urlInput.value = prefill;
    formError.textContent = "";
    viewerView.hidden = true;
    setupView.hidden = false;
    urlInput.focus();
  }

  function showViewer(sheet) {
    currentSheet = sheet;
    setupView.hidden = true;
    viewerView.hidden = false;
    formError.textContent = "";
    frameLoading.classList.remove("is-hidden");
    frameLoading.hidden = false;
    openExternalLink.href = sheet.sourceUrl;

    frame.onload = () => {
      clearTimeout(loadingFallback);
      frameLoading.classList.add("is-hidden");
      loadingFallback = setTimeout(() => {
        frameLoading.hidden = true;
      }, 260);
    };

    frame.src = sheet.embedUrl;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    formError.textContent = "";

    try {
      const sheet = normalizeGoogleSheet(urlInput.value);
      saveSheet(sheet);
      showViewer(sheet);
    } catch (error) {
      formError.textContent = error.message || "Não foi possível abrir esse endereço.";
    }
  });

  document.getElementById("changeLinkButton").addEventListener("click", () => {
    showSetup(currentSheet ? currentSheet.sourceUrl : "");
  });

  document.getElementById("editUrlButton").addEventListener("click", () => {
    showSetup(currentSheet ? currentSheet.sourceUrl : "");
  });

  openExternalLink.addEventListener("click", (event) => {
    if (!currentSheet) event.preventDefault();
  });

  const savedSheet = readSavedSheet();
  if (savedSheet) {
    showViewer(savedSheet);
  } else {
    showSetup();
  }
})();
