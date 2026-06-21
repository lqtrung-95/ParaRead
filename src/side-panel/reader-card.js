import { createWordStatusId, setWordStatus } from "./learning-store.js";
import { createSaveButton } from "./save-feedback.js";
import { createSavedItemId, saveItem } from "./review-store.js";

export function createReaderCard(card, index, context) {
  const section = document.createElement("section");
  section.className = "sentence-card reader-card";
  section.addEventListener("mouseenter", () => context.highlightSource(card.source, true));
  section.addEventListener("mouseleave", () => context.highlightSource(card.source, false));
  section.append(
    createBlock("card-topline", `Lens ${index + 1}`),
    createBlock("parallel primary-text", card.parallel),
    createPronunciation(card.pronunciation),
    createBlock("source source-muted", card.source),
    createLensDetails(card),
    createVocabulary(card, context),
    createSaveRow(card, context),
  );
  return section;
}

function createLensDetails(card) {
  const details = document.createElement("div");
  details.className = "lens-details";
  details.append(
    createBlock("grammar-pattern", card.pattern || "Grammar focus"),
    createBlock("grammar grammar-note", card.grammar),
    createBlock("literal-note", card.literal),
    createExamples(card.examples),
  );
  return details;
}

function createExamples(examples = []) {
  const wrapper = document.createElement("div");
  wrapper.className = "example-list";
  examples.slice(0, 2).forEach((example) => wrapper.append(createBlock("example-line", example)));
  return wrapper;
}

function createPronunciation(pronunciation) {
  const element = createBlock("pronunciation", pronunciation);
  element.hidden = !pronunciation;
  return element;
}

function createVocabulary(card, context) {
  const wrapper = document.createElement("div");
  wrapper.className = "term-grid";
  (card.vocabulary || []).forEach((word) => wrapper.append(createTerm(word, card, context)));
  return wrapper;
}

function createTerm(word, card, context) {
  const term = document.createElement("div");
  term.className = "term-pill";
  const wordId = createWordStatusId(word, context.analysis?.targetLanguage);
  const saved = context.savedIds.has(createSavedItemId("vocab", word, context.analysis?.url || ""));
  term.dataset.status = context.wordStatuses[wordId] || "";
  term.append(
    createSaveButton(`+ ${word}`, () => saveItem("vocab", card, context.analysis, word), {
      className: "chip chip-button term-save",
      saved,
      savedLabel: `Saved ${word}`,
    }),
    createStatusButton("learning", "Learn", word, term, context),
    createStatusButton("known", "Known", word, term, context),
  );
  return term;
}

function createStatusButton(status, label, word, term, context) {
  const button = document.createElement("button");
  button.className = "term-status-button";
  button.dataset.choice = status;
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", async () => {
    term.dataset.status = await setWordStatus(word, context.analysis?.targetLanguage, status);
    context.onWordStatusChange();
  });
  return button;
}

function createSaveRow(card, context) {
  const row = document.createElement("div");
  row.className = "save-row";
  const saved = context.savedIds.has(createSavedItemId("sentence", card.source, context.analysis?.url || ""));
  row.append(createSaveButton("Save sentence", () => saveItem("sentence", card, context.analysis), { saved }));
  return row;
}

function createBlock(className, text) {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text || "";
  return element;
}
