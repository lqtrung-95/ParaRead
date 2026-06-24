export function createReviewHeader(count) {
  const section = document.createElement("section");
  section.className = "sentence-card review-header-card";
  section.append(
    createBlock("card-topline", "Review queue"),
    createBlock("primary-text", count ? `${count} items due now` : "Nothing due now"),
    createBlock("source-muted", "Use ratings to schedule the next review."),
  );
  return section;
}

export function createReviewCard(item) {
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
  ].forEach(([rating, label, days]) => row.append(createButton(label, () => rateItem(item.id, rating, days))));
  return row;
}

async function rateItem(id, rating, intervalDays) {
  const { savedItems = [] } = await chrome.storage.local.get({ savedItems: [] });
  const dueAt = Date.now() + intervalDays * 86400000;
  await chrome.storage.local.set({
    savedItems: savedItems.map((item) => item.id === id ? { ...item, lastRating: rating, intervalDays, dueAt, reviewedAt: Date.now() } : item),
  });
}

function createButton(label, onClick) {
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
