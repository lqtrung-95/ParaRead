import { attachLanguageSelector } from "./language-selector.js";
import { getWordStatusMap, summarizeLearningState } from "./learning-store.js";
import { createReaderCard } from "./reader-card.js";
import { getSavedItemIds, renderSavedItems } from "./review-store.js";

const title = document.querySelector("#title");
const meta = document.querySelector("#meta");
const cards = document.querySelector("#cards");
const readerInsights = document.querySelector("#reader-insights");
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
  if (area === "local" && (changes.savedItems || changes.wordStatuses)) {
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
    title.textContent = "GrammarLens";
    meta.textContent = "Set languages, then analyze the current article.";
    readerInsights.textContent = "Read real articles with sentence-level grammar lenses.";
    if (currentView === "read") cards.innerHTML = `<section class="empty-state">No analysis yet.</section>`;
    return;
  }
  title.textContent = currentAnalysis.title || "GrammarLens";
  meta.textContent = `${currentAnalysis.sourceLanguage || "Auto"} → ${currentAnalysis.targetLanguage || "target"} · grammar in ${currentAnalysis.explanationLanguage || "target"} · ${currentAnalysis.generatedBy || "local"}`;
  await renderInsights();
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
  const wordStatuses = await getWordStatusMap();
  const context = {
    analysis: currentAnalysis,
    highlightSource,
    onWordStatusChange: renderInsights,
    savedIds,
    wordStatuses,
  };
  cards.replaceChildren(...currentAnalysis.cards.map((card, index) => createReaderCard(card, index, context)));
}

async function renderInsights() {
  if (!currentAnalysis) return;
  const stats = summarizeLearningState(currentAnalysis, await getWordStatusMap());
  readerInsights.textContent = `${stats.sentences} sentences · ${stats.terms} focus terms · ${stats.learning} learning · ${stats.known} known`;
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
