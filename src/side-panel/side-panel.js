import { attachLanguageSelector } from "./language-selector.js";
import { renderArticleLibrary } from "./article-library.js";
import { analyzeSelectionAction, exportSavedItemsAction, insertInlineLensAction } from "./side-panel-actions.js";
import { getWordStatusMap, summarizeLearningState } from "./learning-store.js";
import { createReaderCard } from "./reader-card.js";
import { getSavedItemIds, renderSavedItems } from "./review-store.js";

const title = document.querySelector("#title");
const meta = document.querySelector("#meta");
const cards = document.querySelector("#cards");
const readerInsights = document.querySelector("#reader-insights");
const readTab = document.querySelector("#read-tab");
const reviewTab = document.querySelector("#review-tab");
const libraryTab = document.querySelector("#library-tab");
const analyzeButton = document.querySelector("#analyze-button");
const selectionButton = document.querySelector("#selection-button");
const inlineButton = document.querySelector("#inline-button");
const exportButton = document.querySelector("#export-button");
const providerSettingsButton = document.querySelector("#provider-settings-button");
const statusText = document.querySelector("#status");
const sourceLanguage = document.querySelector("#source-language");
const explanationLanguage = document.querySelector("#explanation-language");

let currentAnalysis = null;
let currentView = "read";
let hasProvider = false;

init();

async function init() {
  attachLanguageSelector(sourceLanguage, { allowAuto: true });
  [targetLanguage, explanationLanguage].forEach((input) => attachLanguageSelector(input));
  await loadSettings();
  await render();
}

readTab.addEventListener("click", () => switchView("read"));
reviewTab.addEventListener("click", () => switchView("review"));
libraryTab.addEventListener("click", () => switchView("library"));
analyzeButton.addEventListener("click", analyzeArticle);
selectionButton.addEventListener("click", () => analyzeSelectionAction({
  getLanguages,
  renderLoading,
  setBusy,
  showError: (message) => cards.innerHTML = `<section class="empty-state">${message}</section>`,
}));
inlineButton.addEventListener("click", () => insertInlineLensAction(currentAnalysis, setStatus));
exportButton.addEventListener("click", () => exportSavedItemsAction(setStatus));
providerSettingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());

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
  explanationLanguage.value = settings.explanationLanguage === "Auto" ? "" : settings.explanationLanguage || settings.targetLanguage || "";
  hasProvider = Boolean(settings.apiKey);
  renderProviderStatus();
}

async function analyzeArticle() {
  const source = sourceLanguage.value.trim() || "Auto";
  const explanation = explanationLanguage.value.trim();
  if (!explanation || explanation === "Auto") {
    statusText.textContent = "Choose an explanation language.";
    return;
  }
  setBusy(true);
  renderLoading();
  const result = await chrome.runtime.sendMessage({
    type: "PARAREAD_ANALYZE_ACTIVE_TAB",
    sourceLanguage: source,
    targetLanguage: explanation,
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
  meta.textContent = `${getLearningLanguage(currentAnalysis)} → ${currentAnalysis.explanationLanguage || currentAnalysis.targetLanguage || "target"} · ${currentAnalysis.generatedBy || "local"}`;
  await renderInsights();
  if (currentView === "review") await renderSavedItems(cards);
  else await renderCards();
}

async function switchView(view) {
  currentView = view;
  readTab.classList.toggle("active", view === "read");
  reviewTab.classList.toggle("active", view === "review");
  libraryTab.classList.toggle("active", view === "library");
  if (view === "review") await renderSavedItems(cards);
  else if (view === "library") await renderArticleLibrary(cards);
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
  libraryTab.classList.remove("active");
  title.textContent = "Analyzing article...";
  meta.textContent = `${sourceLanguage.value || "Auto"} → ${explanationLanguage.value}`;
  cards.replaceChildren(...Array.from({ length: 4 }, () => createBlock("sentence-card loading-card", "")));
}

function getLanguages() {
  const sourceLanguageValue = sourceLanguage.value.trim() || "Auto";
  const explanationLanguageValue = explanationLanguage.value.trim();
  const explanation = explanationLanguageValue === "Auto" ? "" : explanationLanguageValue;
  if (!explanation) {
    statusText.textContent = "Choose an explanation language.";
    return null;
  }
  return { sourceLanguage: sourceLanguageValue, targetLanguage: explanation, explanationLanguage: explanation };
}

function setBusy(isBusy) {
  analyzeButton.disabled = isBusy;
  statusText.textContent = isBusy ? "Extracting article and building reading cards..." : "";
  if (!isBusy) renderProviderStatus();
}

function renderProviderStatus() {
  statusText.textContent = hasProvider
    ? "AI provider ready."
    : "Local preview only. Add an API key for full translation.";
}

function setStatus(message) {
  statusText.textContent = message;
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

function getLearningLanguage(analysis) {
  return analysis.learningLanguage || analysis.sourceLanguage || "Auto";
}
