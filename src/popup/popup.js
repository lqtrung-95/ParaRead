const targetLanguage = document.querySelector("#target-language");
const analyzeButton = document.querySelector("#analyze-button");
const optionsButton = document.querySelector("#options-button");
const statusText = document.querySelector("#status");

init();

async function init() {
  const settings = await chrome.storage.local.get({ targetLanguage: "" });
  targetLanguage.value = settings.targetLanguage;
}

targetLanguage.addEventListener("change", async () => {
  await chrome.storage.local.set({ targetLanguage: targetLanguage.value });
});

optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

analyzeButton.addEventListener("click", async () => {
  if (!targetLanguage.value.trim()) {
    statusText.textContent = "Choose a target language first.";
    targetLanguage.focus();
    return;
  }
  setBusy(true, "Extracting article...");
  const result = await chrome.runtime.sendMessage({
    type: "PARAREAD_ANALYZE_ACTIVE_TAB",
    targetLanguage: targetLanguage.value.trim(),
  });
  if (result?.ok) {
    setBusy(false, `${result.cardCount} reading cards ready.`);
    window.close();
    return;
  }
  setBusy(false, result?.error || "Analysis failed.");
});

function setBusy(isBusy, message) {
  analyzeButton.disabled = isBusy;
  statusText.textContent = message;
}
