export async function exportSavedItemsAsCsv() {
  const { savedItems = [] } = await chrome.storage.local.get({ savedItems: [] });
  if (!savedItems.length) return { ok: false, message: "No saved items to export." };
  const header = ["type", "text", "context", "grammar", "url", "title", "targetLanguage", "savedAt"];
  const rows = savedItems.map((item) => header.map((key) => csvCell(key === "savedAt" ? formatDate(item[key]) : item[key])));
  const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `grammarlens-export-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  return { ok: true, message: `Exported ${savedItems.length} saved items.` };
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function formatDate(value) {
  return value ? new Date(value).toISOString() : "";
}
