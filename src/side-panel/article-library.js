export async function renderArticleLibrary(container) {
  const { articleLibrary = [] } = await chrome.storage.local.get({ articleLibrary: [] });
  if (!articleLibrary.length) {
    container.innerHTML = `<section class="empty-state">Analyzed articles will appear here.</section>`;
    return;
  }
  container.replaceChildren(...articleLibrary.map(createArticleItem));
}

function createArticleItem(article) {
  const section = document.createElement("section");
  section.className = "sentence-card library-card";
  section.append(
    createBlock("card-topline", article.status || "reading"),
    createArticleLink(article),
    createBlock("source-muted", `${article.cardCount || 0} lenses · ${article.learningLanguage || article.sourceLanguage || "Auto"} → ${article.explanationLanguage || article.targetLanguage || ""}`),
    createBlock("saved-date", formatDate(article.updatedAt)),
  );
  return section;
}

function createArticleLink(article) {
  if (!article.url) return createBlock("primary-text", article.title);
  const link = document.createElement("a");
  link.className = "primary-text library-link";
  link.href = article.url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = article.title;
  return link;
}

function createBlock(className, text) {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text || "";
  return element;
}

function formatDate(value) {
  return value ? `Updated ${new Date(value).toLocaleDateString()}` : "";
}
