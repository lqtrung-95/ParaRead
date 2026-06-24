const explanationLanguage = document.querySelector("#explanation-language");
const analyzeButton = document.querySelector("#analyze-button");
const optionsButton = document.querySelector("#options-button");
const statusText = document.querySelector("#status");

init();

async function init() {
  const settings = await chrome.storage.local.get({ targetLanguage: "", explanationLanguage: "" });
  explanationLanguage.value = settings.explanationLanguage || settings.targetLanguage;
}

explanationLanguage.addEventListener("change", async () => {
  await chrome.storage.local.set({
    explanationLanguage: explanationLanguage.value,
    targetLanguage: explanationLanguage.value,
  });
});

optionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

analyzeButton.addEventListener("click", async () => {
  if (!explanationLanguage.value.trim()) {
    statusText.textContent = "Choose an explanation language.";
    explanationLanguage.focus();
    return;
  }
  await chrome.storage.local.set({
    targetLanguage: explanationLanguage.value.trim(),
    explanationLanguage: explanationLanguage.value.trim(),
  });
  setBusy(true, "Extracting and analyzing article...");
  try {
    await openSidePanel();
    const result = await chrome.runtime.sendMessage({
      type: "PARAREAD_ANALYZE_ACTIVE_TAB",
      targetLanguage: explanationLanguage.value.trim(),
      explanationLanguage: explanationLanguage.value.trim(),
    });
    if (result?.ok) {
      setBusy(false, `${result.cardCount} reading cards ready.`);
      window.close();
      return;
    }
    setBusy(false, result?.error || "Analysis failed.");
  } catch (error) {
    setBusy(false, error?.message || "Analysis failed.");
  }
});

function setBusy(isBusy, message) {
  analyzeButton.disabled = isBusy;
  statusText.textContent = message;
}

async function openSidePanel() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.sidePanel.open({ tabId: tab.id });
  } catch {
    // Non-blocking: service worker still stores results, and unsupported pages return a visible error.
  }
}
