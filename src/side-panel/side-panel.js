const title = document.querySelector("#title");
const meta = document.querySelector("#meta");
const cards = document.querySelector("#cards");
const readTab = document.querySelector("#read-tab");
const reviewTab = document.querySelector("#review-tab");

let currentAnalysis = null;
let currentView = "read";

render();

readTab.addEventListener("click", () => switchView("read"));
reviewTab.addEventListener("click", () => switchView("review"));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && Object.keys(changes).some((key) => key.startsWith("analysis:"))) render();
  if (area === "local" && changes.savedItems && currentView === "review") renderSavedItems();
});

async function render() {
  currentAnalysis = await chrome.runtime.sendMessage({ type: "PARAREAD_GET_ANALYSIS" });
  if (!currentAnalysis) {
    cards.innerHTML = `<section class="empty-state">Open ParaRead from the toolbar and analyze an article.</section>`;
    return;
  }
  title.textContent = currentAnalysis.title || "ParaRead";
  meta.textContent = `${currentAnalysis.targetLanguage || "Target language"} · grammar in ${currentAnalysis.explanationLanguage || currentAnalysis.targetLanguage || "target language"} · ${currentAnalysis.generatedBy || "local"}`;
  if (currentView === "review") {
    await renderSavedItems();
    return;
  }
  renderCards();
}

function switchView(view) {
  currentView = view;
  readTab.classList.toggle("active", view === "read");
  reviewTab.classList.toggle("active", view === "review");
  if (view === "review") renderSavedItems();
  else renderCards();
}

function renderCards() {
  if (!currentAnalysis) return;
  cards.replaceChildren(...currentAnalysis.cards.map(createCard));
}

function createCard(card, index) {
  const section = document.createElement("section");
  section.className = "sentence-card reader-card";
  section.addEventListener("mouseenter", () => highlightSource(card.source, true));
  section.addEventListener("mouseleave", () => highlightSource(card.source, false));
  section.append(
    createCardHeader(index),
    createBlock("parallel primary-text", card.parallel),
    createBlock("source source-muted", card.source),
    createBlock("grammar grammar-note", card.grammar),
    createVocabulary(card),
    createSaveRow(card),
  );
  return section;
}

function createCardHeader(index) {
  const row = document.createElement("div");
  row.className = "card-topline";
  row.textContent = `Sentence ${index + 1}`;
  return row;
}

function createSaveRow(card) {
  const row = document.createElement("div");
  row.className = "save-row";
  row.append(createActionButton("Save sentence", () => saveItem("sentence", card)));
  return row;
}

function createVocabulary(card) {
  const wrapper = document.createElement("div");
  wrapper.className = "chips";
  (card.vocabulary || []).forEach((word) => {
    const chip = document.createElement("button");
    chip.className = "chip chip-button";
    chip.type = "button";
    chip.textContent = `+ ${word}`;
    chip.title = "Save vocabulary";
    chip.addEventListener("click", () => saveItem("vocab", card, word));
    wrapper.append(chip);
  });
  return wrapper;
}

async function renderSavedItems() {
  const { savedItems = [] } = await chrome.storage.local.get({ savedItems: [] });
  if (!savedItems.length) {
    cards.innerHTML = `<section class="empty-state">Saved sentences and words will appear here.</section>`;
    return;
  }
  cards.replaceChildren(...savedItems.sort((a, b) => b.savedAt - a.savedAt).map(createSavedItem));
}

function createSavedItem(item) {
  const section = document.createElement("section");
  section.className = "sentence-card saved-card";
  section.append(
    createBlock("card-topline", item.type === "vocab" ? "Vocabulary" : "Sentence"),
    createBlock("primary-text", item.text),
    createBlock("source-muted", item.context || ""),
    createBlock("grammar-note", item.grammar || ""),
    createSourceLink(item),
    createBlock("saved-date", formatSavedDate(item.savedAt)),
    createActionButton("Remove", () => removeItem(item.id)),
  );
  return section;
}

async function saveItem(type, card, word = "") {
  const { savedItems = [] } = await chrome.storage.local.get({ savedItems: [] });
  const text = type === "vocab" ? word : card.source;
  const item = {
    id: `${type}:${text}:${currentAnalysis?.url || ""}`,
    type,
    text,
    context: type === "vocab" ? card.source : card.parallel,
    grammar: card.grammar,
    url: currentAnalysis?.url || "",
    title: currentAnalysis?.title || "",
    targetLanguage: currentAnalysis?.targetLanguage || "",
    explanationLanguage: currentAnalysis?.explanationLanguage || "",
    savedAt: Date.now(),
  };
  await chrome.storage.local.set({
    savedItems: [item, ...savedItems.filter((saved) => saved.id !== item.id)],
  });
}

async function removeItem(id) {
  const { savedItems = [] } = await chrome.storage.local.get({ savedItems: [] });
  await chrome.storage.local.set({ savedItems: savedItems.filter((item) => item.id !== id) });
}

function createActionButton(label, onClick) {
  const button = document.createElement("button");
  button.className = "secondary-button";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function createBlock(className, text) {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text || "";
  return element;
}

function createSourceLink(item) {
  const wrapper = document.createElement("div");
  wrapper.className = "source-link";
  if (!item.url) {
    wrapper.textContent = item.title || "";
    return wrapper;
  }
  const link = document.createElement("a");
  link.href = item.url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = item.title ? `From: ${item.title}` : "Open article";
  wrapper.append(link);
  return wrapper;
}

function formatSavedDate(savedAt) {
  if (!savedAt) return "";
  return `Saved ${new Date(savedAt).toLocaleDateString()}`;
}

function highlightSource(source, active) {
  chrome.runtime.sendMessage({ type: "PARAREAD_HIGHLIGHT_SOURCE", source, active }).catch(() => {});
}
