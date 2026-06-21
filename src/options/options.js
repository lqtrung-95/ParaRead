const defaults = {
  providerUrl: "https://api.deepseek.com/chat/completions",
  model: "deepseek-v4-flash",
  apiKey: "",
  sourceLanguage: "Auto",
  targetLanguage: "",
  explanationLanguage: "",
};

const fields = {
  providerUrl: document.querySelector("#provider-url"),
  model: document.querySelector("#model"),
  apiKey: document.querySelector("#api-key"),
  sourceLanguage: document.querySelector("#source-language"),
  targetLanguage: document.querySelector("#target-language"),
  explanationLanguage: document.querySelector("#explanation-language"),
};
const statusText = document.querySelector("#status");

loadSettings();

document.querySelector("#save-button").addEventListener("click", async () => {
  await chrome.storage.local.set(readForm());
  statusText.textContent = "Saved.";
});

document.querySelector("#clear-key-button").addEventListener("click", async () => {
  fields.apiKey.value = "";
  await chrome.storage.local.set({ apiKey: "" });
  statusText.textContent = "API key cleared.";
});

async function loadSettings() {
  const settings = await chrome.storage.local.get(defaults);
  Object.entries(fields).forEach(([key, input]) => {
    input.value = settings[key] || "";
  });
}

function readForm() {
  return Object.fromEntries(
    Object.entries(fields).map(([key, input]) => [key, input.value.trim()]),
  );
}
