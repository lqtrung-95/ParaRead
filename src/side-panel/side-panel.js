const title = document.querySelector("#title");
const meta = document.querySelector("#meta");
const cards = document.querySelector("#cards");

render();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && Object.keys(changes).some((key) => key.startsWith("analysis:"))) {
    render();
  }
});

async function render() {
  const analysis = await chrome.runtime.sendMessage({ type: "PARAREAD_GET_ANALYSIS" });
  if (!analysis) {
    cards.innerHTML = `<section class="sentence-card">Open ParaRead from the toolbar and analyze an article.</section>`;
    return;
  }
  title.textContent = analysis.title || "ParaRead";
  meta.textContent = `${analysis.targetLanguage || "Target language"} · ${analysis.generatedBy || "local"}`;
  cards.replaceChildren(...analysis.cards.map(createCard));
}

function createCard(card) {
  const section = document.createElement("section");
  section.className = "sentence-card";
  section.append(
    createBlock("source", card.source),
    createBlock("parallel", card.parallel),
    createBlock("grammar", card.grammar),
    createVocabulary(card.vocabulary),
  );
  return section;
}

function createBlock(className, text) {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text || "";
  return element;
}

function createVocabulary(words = []) {
  const wrapper = document.createElement("div");
  wrapper.className = "chips";
  words.forEach((word) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = word;
    wrapper.append(chip);
  });
  return wrapper;
}
