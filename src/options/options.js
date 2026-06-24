const defaults = {
  providerUrl: "https://api.deepseek.com/chat/completions",
  model: "deepseek-v4-flash",
  apiKey: "",
  sourceLanguage: "Auto",
  explanationLanguage: "",
};

const presets = {
  deepseek: ["https://api.deepseek.com/chat/completions", "deepseek-v4-flash"],
  openrouter: ["https://openrouter.ai/api/v1/chat/completions", "deepseek/deepseek-chat-v3-0324:free"],
  openai: ["https://api.openai.com/v1/chat/completions", "gpt-4.1-mini"],
  gemini: ["https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", "gemini-2.0-flash"],
};

const fields = {
  providerUrl: document.querySelector("#provider-url"),
  model: document.querySelector("#model"),
  apiKey: document.querySelector("#api-key"),
  sourceLanguage: document.querySelector("#source-language"),
  explanationLanguage: document.querySelector("#explanation-language"),
};
const providerPreset = document.querySelector("#provider-preset");
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

providerPreset.addEventListener("change", () => {
  const preset = presets[providerPreset.value];
  if (!preset) return;
  fields.providerUrl.value = preset[0];
  fields.model.value = preset[1];
});

async function loadSettings() {
  const settings = await chrome.storage.local.get(defaults);
  Object.entries(fields).forEach(([key, input]) => {
    input.value = settings[key] || "";
  });
}

function readForm() {
  const values = Object.fromEntries(
    Object.entries(fields).map(([key, input]) => [key, input.value.trim()]),
  );
  return { ...values, targetLanguage: values.explanationLanguage };
}
