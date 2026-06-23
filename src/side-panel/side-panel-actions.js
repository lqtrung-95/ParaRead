import { exportSavedItemsAsCsv } from "./export-service.js";

export async function analyzeSelectionAction(context) {
  const languages = context.getLanguages();
  if (!languages) return;
  context.setBusy(true);
  context.renderLoading();
  const result = await chrome.runtime.sendMessage({ type: "PARAREAD_ANALYZE_SELECTION", ...languages });
  if (!result?.ok) context.showError(result?.error || "Selection analysis failed.");
  context.setBusy(false);
}

export async function insertInlineLensAction(currentAnalysis, setStatus) {
  const card = currentAnalysis?.cards?.[0];
  if (!card) {
    setStatus("Analyze a sentence first.");
    return;
  }
  const result = await chrome.runtime.sendMessage({ type: "PARAREAD_INSERT_INLINE_LENS", card });
  setStatus(result?.ok ? "Inserted lens into the page." : result?.error || "Could not insert lens.");
}

export async function exportSavedItemsAction(setStatus) {
  const result = await exportSavedItemsAsCsv();
  setStatus(result.message);
}
