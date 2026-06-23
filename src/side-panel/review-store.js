import { createWordStatusId, getWordStatusMap, setWordStatus } from "./learning-store.js";

export async function renderSavedItems(container) {
  const { savedItems = [] } = await chrome.storage.local.get({ savedItems: [] });
  if (!savedItems.length) {
    container.innerHTML = `<section class="empty-state">Saved sentences and words will appear here.</section>`;
    return;
  }
  const wordStatuses = await getWordStatusMap();
  const dueItems = savedItems.filter((item) => (item.dueAt || 0) <= Date.now());
  container.replaceChildren(
    createReviewHeader(dueItems.length),
    ...dueItems.slice(0, 6).map((item) => createReviewCard(item)),
    ...savedItems.sort((a, b) => b.savedAt - a.savedAt).map((item) => createSavedItem(item, wordStatuses)),
  );
}

export async function saveItem(type, card, analysis, word = "") {
  const { savedItems = [] } = await chrome.storage.local.get({ savedItems: [] });
  const text = type === "vocab" ? word : card.source;
  const id = createSavedItemId(type, text, analysis?.url || "");
  const existing = savedItems.find((saved) => saved.id === id);
  if (existing) return { item: existing, alreadySaved: true };
  const item = {
    id,
    type,
    text,
    context: type === "vocab" ? card.source : card.parallel,
    pronunciation: card.pronunciation || "",
    grammar: card.grammar,
    url: analysis?.url || "",
    title: analysis?.title || "",
    targetLanguage: analysis?.targetLanguage || "",
    explanationLanguage: analysis?.explanationLanguage || "",
    savedAt: Date.now(),
    dueAt: Date.now(),
    intervalDays: 0,
  };
  await chrome.storage.local.set({
    savedItems: [item, ...savedItems.filter((saved) => saved.id !== item.id)],
  });
  return { item, alreadySaved: false };
}

function createReviewHeader(count) {
  const section = document.createElement("section");
  section.className = "sentence-card review-header-card";
  section.append(
    createBlock("card-topline", "Review queue"),
    createBlock("primary-text", count ? `${count} items due now` : "Nothing due now"),
    createBlock("source-muted", "Use ratings to schedule the next review."),
  );
  return section;
}

function createReviewCard(item) {
  const section = document.createElement("section");
  section.className = "sentence-card review-card";
  section.append(
    createBlock("card-topline", item.type),
    createBlock("primary-text", item.text),
    createBlock("source-muted", item.context || ""),
    createBlock("grammar-note", item.grammar || ""),
    createRatingRow(item),
  );
  return section;
}

function createRatingRow(item) {
  const row = document.createElement("div");
  row.className = "review-rating-row";
  [
    ["forgot", "Again", 0],
    ["hard", "Hard", 1],
    ["good", "Good", 3],
    ["easy", "Easy", 7],
  ].forEach(([rating, label, days]) => row.append(createActionButton(label, () => rateItem(item.id, rating, days))));
  return row;
}

async function rateItem(id, rating, intervalDays) {
  const { savedItems = [] } = await chrome.storage.local.get({ savedItems: [] });
  await chrome.storage.local.set({
    savedItems: savedItems.map((item) => item.id === id ? {
      ...item,
      lastRating: rating,
      intervalDays,
      dueAt: Date.now() + intervalDays * 86400000,
      reviewedAt: Date.now(),
    } : item),
  });
}

export async function getSavedItemIds() {
  const { savedItems = [] } = await chrome.storage.local.get({ savedItems: [] });
  return new Set(savedItems.map((item) => item.id));
}

export function createSavedItemId(type, text, url = "") {
  return `${type}:${text}:${url}`;
}

function createSavedItem(item, wordStatuses) {
  const section = document.createElement("section");
  section.className = "sentence-card saved-card";
  section.append(
    createBlock("card-topline", item.type === "vocab" ? "Vocabulary" : "Sentence"),
    createBlock("primary-text", item.text),
    createBlock("pronunciation", item.pronunciation || ""),
    createBlock("source-muted", item.context || ""),
    createBlock("grammar-note", item.grammar || ""),
    createSourceLink(item),
    createReviewStatus(item, wordStatuses),
    createBlock("saved-date", formatSavedDate(item.savedAt)),
    createActionButton("Remove", () => removeItem(item.id)),
  );
  return section;
}

async function removeItem(id) {
  const { savedItems = [] } = await chrome.storage.local.get({ savedItems: [] });
  await chrome.storage.local.set({ savedItems: savedItems.filter((item) => item.id !== id) });
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

function createReviewStatus(item, wordStatuses) {
  const wrapper = document.createElement("div");
  wrapper.className = "review-status";
  if (item.type !== "vocab") return wrapper;
  const id = createWordStatusId(item.text, item.targetLanguage);
  wrapper.dataset.status = wordStatuses[id] || "";
  wrapper.append(
    createStatusButton("learning", "Learning", item, wrapper),
    createStatusButton("known", "Known", item, wrapper),
  );
  return wrapper;
}

function createStatusButton(status, label, item, wrapper) {
  const button = createActionButton(label, async () => {
    wrapper.dataset.status = await setWordStatus(item.text, item.targetLanguage, status);
  });
  button.classList.add("review-status-button");
  button.dataset.choice = status;
  return button;
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

function formatSavedDate(savedAt) {
  if (!savedAt) return "";
  return `Saved ${new Date(savedAt).toLocaleDateString()}`;
}
