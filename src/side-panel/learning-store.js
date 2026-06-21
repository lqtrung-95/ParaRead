export async function getWordStatusMap() {
  const { wordStatuses = {} } = await chrome.storage.local.get({ wordStatuses: {} });
  return wordStatuses;
}

export async function setWordStatus(word, targetLanguage, status) {
  const { wordStatuses = {} } = await chrome.storage.local.get({ wordStatuses: {} });
  const id = createWordStatusId(word, targetLanguage);
  const next = { ...wordStatuses };
  if (next[id] === status) delete next[id];
  else next[id] = status;
  await chrome.storage.local.set({ wordStatuses: next });
  return next[id] || "";
}

export function createWordStatusId(word, targetLanguage = "") {
  return `${targetLanguage}:${normalizeWord(word)}`;
}

export function summarizeLearningState(analysis, wordStatuses) {
  const terms = new Set((analysis?.cards || []).flatMap((card) => card.vocabulary || []));
  const known = [...terms].filter((term) => wordStatuses[createWordStatusId(term, analysis?.targetLanguage)] === "known").length;
  const learning = [...terms].filter((term) => wordStatuses[createWordStatusId(term, analysis?.targetLanguage)] === "learning").length;
  return { terms: terms.size, known, learning, sentences: analysis?.cards?.length || 0 };
}

function normalizeWord(word) {
  return String(word || "").trim().toLowerCase();
}
