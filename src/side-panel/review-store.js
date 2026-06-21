export async function renderSavedItems(container) {
  const { savedItems = [] } = await chrome.storage.local.get({ savedItems: [] });
  if (!savedItems.length) {
    container.innerHTML = `<section class="empty-state">Saved sentences and words will appear here.</section>`;
    return;
  }
  container.replaceChildren(...savedItems.sort((a, b) => b.savedAt - a.savedAt).map(createSavedItem));
}

export async function saveItem(type, card, analysis, word = "") {
  const { savedItems = [] } = await chrome.storage.local.get({ savedItems: [] });
  const text = type === "vocab" ? word : card.source;
  const item = {
    id: `${type}:${text}:${analysis?.url || ""}`,
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
  };
  await chrome.storage.local.set({
    savedItems: [item, ...savedItems.filter((saved) => saved.id !== item.id)],
  });
  return item;
}

function createSavedItem(item) {
  const section = document.createElement("section");
  section.className = "sentence-card saved-card";
  section.append(
    createBlock("card-topline", item.type === "vocab" ? "Vocabulary" : "Sentence"),
    createBlock("primary-text", item.text),
    createBlock("pronunciation", item.pronunciation || ""),
    createBlock("source-muted", item.context || ""),
    createBlock("grammar-note", item.grammar || ""),
    createSourceLink(item),
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
