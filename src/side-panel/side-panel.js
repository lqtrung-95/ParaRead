import { attachLanguageSelector } from "./language-selector.js";
import { createSaveButton } from "./save-feedback.js";
import { createSavedItemId, getSavedItemIds, renderSavedItems, saveItem } from "./review-store.js";

const title = document.querySelector("#title");
const meta = document.querySelector("#meta");
const cards = document.querySelector("#cards");
const readTab = document.querySelector("#read-tab");
const reviewTab = document.querySelector("#review-tab");
const analyzeButton = document.querySelector("#analyze-button");
const statusText = document.querySelector("#status");
const sourceLanguage = document.querySelector("#source-language");
const targetLanguage = document.querySelector("#target-language");
const explanationLanguage = document.querySelector("#explanation-language");

let currentAnalysis = null;
let currentView = "read";

init();

async function init() {
  attachLanguageSelector(sourceLanguage, { allowAuto: true });
  [targetLanguage, explanationLanguage].forEach((input) => attachLanguageSelector(input));
  await loadSettings();
  await render();
}

readTab.addEventListener("click", () => switchView("read"));
reviewTab.addEventListener("click", () => switchView("review"));
analyzeButton.addEventListener("click", analyzeArticle);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && Object.keys(changes).some((key) => key.startsWith("analysis:"))) render();
  if (area === "local" && changes.savedItems) {
    if (currentView === "review") renderSavedItems(cards);
    else renderCards();
  }
});

async function loadSettings() {
  const settings = await chrome.storage.local.get({
    sourceLanguage: "Auto",
    targetLanguage: "",
    explanationLanguage: "",
    apiKey: "",
  });
  sourceLanguage.value = settings.sourceLanguage || "Auto";
  targetLanguage.value = settings.targetLanguage === "Auto" ? "" : settings.targetLanguage || "";
  explanationLanguage.value = settings.explanationLanguage === "Auto" ? "" : settings.explanationLanguage || settings.targetLanguage || "";
  statusText.textContent = settings.apiKey ? "Provider ready" : "Local mode: add API key in Settings for full translation.";
}

async function analyzeArticle() {
  const source = sourceLanguage.value.trim() || "Auto";
  const target = targetLanguage.value.trim();
  const explanation = explanationLanguage.value.trim();
  if (!target || !explanation || target === "Auto" || explanation === "Auto") {
    statusText.textContent = "Choose translate and explanation languages.";
    return;
  }
  setBusy(true);
  renderLoading();
  const result = await chrome.runtime.sendMessage({
    type: "PARAREAD_ANALYZE_ACTIVE_TAB",
    sourceLanguage: source,
    targetLanguage: target,
    explanationLanguage: explanation,
  });
  if (!result?.ok) {
    statusText.textContent = result?.error || "Analysis failed.";
    cards.innerHTML = `<section class="empty-state">${statusText.textContent}</section>`;
  }
  setBusy(false);
}

async function render() {
  currentAnalysis = await chrome.runtime.sendMessage({ type: "PARAREAD_GET_ANALYSIS" });
  if (!currentAnalysis) {
    title.textContent = "ParaRead";
    meta.textContent = "Set languages, then analyze the current article.";
    if (currentView === "read") cards.innerHTML = `<section class="empty-state">No analysis yet.</section>`;
    return;
  }
  title.textContent = currentAnalysis.title || "ParaRead";
  meta.textContent = `${currentAnalysis.sourceLanguage || "Auto"} → ${currentAnalysis.targetLanguage || "target"} · grammar in ${currentAnalysis.explanationLanguage || "target"} · ${currentAnalysis.generatedBy || "local"}`;
  if (currentView === "review") await renderSavedItems(cards);
  else await renderCards();
}

async function switchView(view) {
  currentView = view;
  readTab.classList.toggle("active", view === "read");
  reviewTab.classList.toggle("active", view === "review");
  if (view === "review") await renderSavedItems(cards);
  else await renderCards();
}

async function renderCards() {
  if (!currentAnalysis) return;
  const savedIds = await getSavedItemIds();
  cards.replaceChildren(...currentAnalysis.cards.map((card, index) => createCard(card, index, savedIds)));
}

function createCard(card, index, savedIds) {
  const section = document.createElement("section");
  section.className = "sentence-card reader-card";
  section.addEventListener("mouseenter", () => highlightSource(card.source, true));
  section.addEventListener("mouseleave", () => highlightSource(card.source, false));
  section.append(
    createBlock("card-topline", `Sentence ${index + 1}`),
    createBlock("parallel primary-text", card.parallel),
    createPronunciation(card.pronunciation),
    createBlock("source source-muted", card.source),
    createBlock("grammar grammar-note", card.grammar),
    createVocabulary(card, savedIds),
    createSaveRow(card, savedIds),
  );
  return section;
}

function createPronunciation(pronunciation) {
  const element = createBlock("pronunciation", pronunciation);
  element.hidden = !pronunciation;
  return element;
}

function createVocabulary(card, savedIds) {
  const wrapper = document.createElement("div");
  wrapper.className = "chips";
  (card.vocabulary || []).forEach((word) => {
    const saved = savedIds.has(createSavedItemId("vocab", word, currentAnalysis?.url || ""));
    wrapper.append(createSaveButton(`+ ${word}`, () => saveItem("vocab", card, currentAnalysis, word), {
      className: "chip chip-button",
      saved,
      savedLabel: `Saved ${word}`,
    }));
  });
  return wrapper;
}

function createSaveRow(card, savedIds) {
  const row = document.createElement("div");
  row.className = "save-row";
  const saved = savedIds.has(createSavedItemId("sentence", card.source, currentAnalysis?.url || ""));
  row.append(createSaveButton("Save sentence", () => saveItem("sentence", card, currentAnalysis), { saved }));
  return row;
}

function renderLoading() {
  currentView = "read";
  readTab.classList.add("active");
  reviewTab.classList.remove("active");
  title.textContent = "Analyzing article...";
  meta.textContent = `${sourceLanguage.value || "Auto"} → ${targetLanguage.value} · grammar in ${explanationLanguage.value}`;
  cards.replaceChildren(...Array.from({ length: 4 }, () => createBlock("sentence-card loading-card", "")));
}

function setBusy(isBusy) {
  analyzeButton.disabled = isBusy;
  statusText.textContent = isBusy ? "Extracting article and building reading cards..." : "";
}

function createBlock(className, text) {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text || "";
  return element;
}

function highlightSource(source, active) {
  chrome.runtime.sendMessage({ type: "PARAREAD_HIGHLIGHT_SOURCE", source, active }).catch(() => {});
}
