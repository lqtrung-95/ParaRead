import {
  buildLocalAnalysis,
  createGrammarRepairPrompt,
  createProviderPrompt,
  needsGrammarLanguageRepair,
  parseProviderCards,
} from "../shared/analysis-engine.mjs";
import { splitSentences } from "../shared/article-extractor.mjs";

const DEFAULT_SETTINGS = {
  sourceLanguage: "Auto",
  targetLanguage: "",
  explanationLanguage: "",
  providerUrl: "https://api.deepseek.com/chat/completions",
  model: "deepseek-v4-flash",
  apiKey: "",
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) await openSidePanel(tab.id);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "PARAREAD_ANALYZE_ACTIVE_TAB") {
    respondSafely(sendResponse, () => analyzeActiveTab(message));
    return true;
  }
  if (message?.type === "PARAREAD_GET_ANALYSIS") {
    respondSafely(sendResponse, () => getLatestAnalysis(sender.tab?.id));
    return true;
  }
  if (message?.type === "PARAREAD_HIGHLIGHT_SOURCE") {
    respondSafely(sendResponse, () => highlightSource(message.source, message.active));
    return true;
  }
  return false;
});

async function respondSafely(sendResponse, action) {
  try {
    sendResponse(await action());
  } catch (error) {
    sendResponse({ ok: false, error: getErrorMessage(error) });
  }
}

async function analyzeActiveTab(request) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, error: "No active tab found." };

  const article = await extractFromTab(tab.id);
  if (!article.text || article.text.length < 80) {
    return { ok: false, error: "Could not find enough article text on this page." };
  }

  const settings = { ...DEFAULT_SETTINGS, ...(await chrome.storage.local.get(DEFAULT_SETTINGS)) };
  const sourceLanguage = request.sourceLanguage || settings.sourceLanguage || "Auto";
  const targetLanguage = request.targetLanguage || settings.targetLanguage;
  const explanationLanguage = request.explanationLanguage || settings.explanationLanguage || targetLanguage;
  if (!targetLanguage) {
    return { ok: false, error: "Choose a target language first." };
  }
  if (!explanationLanguage) {
    return { ok: false, error: "Choose a grammar explanation language first." };
  }
  await chrome.storage.local.set({ sourceLanguage, targetLanguage, explanationLanguage });
  const enrichedArticle = { ...article, sentences: splitSentences(article.text) };
  const analysis = settings.apiKey
    ? await analyzeWithProvider(enrichedArticle, settings, sourceLanguage, targetLanguage, explanationLanguage)
    : buildLocalAnalysis(enrichedArticle, targetLanguage, explanationLanguage, sourceLanguage);

  await chrome.storage.session.set({
    latestTabId: tab.id,
    [`analysis:${tab.id}`]: { ...analysis, createdAt: Date.now() },
  });
  await openSidePanel(tab.id);
  return { ok: true, cardCount: analysis.cards.length, generatedBy: analysis.generatedBy };
}

async function extractFromTab(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "PARAREAD_EXTRACT_ARTICLE" });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["src/content/content-script.js"] });
    return chrome.tabs.sendMessage(tabId, { type: "PARAREAD_EXTRACT_ARTICLE" });
  }
}

async function analyzeWithProvider(article, settings, sourceLanguage, targetLanguage, explanationLanguage) {
  const text = await fetchProviderText(settings, createProviderPrompt(article, targetLanguage, explanationLanguage, sourceLanguage));
  if (!text.ok) {
    return { ...buildLocalAnalysis(article, targetLanguage, explanationLanguage, sourceLanguage), providerError: text.error };
  }
  const parsed = parseProviderCards(text.value, article, targetLanguage, explanationLanguage);
  const repaired = needsGrammarLanguageRepair(parsed, targetLanguage, explanationLanguage)
    ? await repairGrammarLanguage(parsed, settings, targetLanguage, explanationLanguage)
    : parsed;
  return {
    ...repaired,
    title: article.title,
    url: article.url,
    sourceLanguage,
    targetLanguage,
    explanationLanguage,
    generatedBy: "provider",
  };
}

async function fetchProviderText(settings, prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
  const response = await fetch(settings.providerUrl, {
    method: "POST",
    signal: controller.signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      max_tokens: 12000,
      messages: [{ role: "user", content: prompt }],
    }),
  }).finally(() => clearTimeout(timeoutId));
  if (!response.ok) {
    return { ok: false, error: `Provider returned ${response.status}.` };
  }
  try {
    const data = await response.json();
    return { ok: true, value: data.choices?.[0]?.message?.content || "" };
  } catch {
    return { ok: false, error: "Provider returned invalid JSON." };
  }
}

async function repairGrammarLanguage(analysis, settings, targetLanguage, explanationLanguage) {
  const text = await fetchProviderText(settings, createGrammarRepairPrompt(analysis, targetLanguage, explanationLanguage));
  if (!text.ok) return analysis;
  return parseProviderCards(text.value, analysis, targetLanguage, explanationLanguage);
}

async function getLatestAnalysis(tabId) {
  const { latestTabId } = await chrome.storage.session.get("latestTabId");
  const key = `analysis:${tabId || latestTabId}`;
  const data = await chrome.storage.session.get(key);
  return data[key] || null;
}

async function highlightSource(source, active) {
  const { latestTabId } = await chrome.storage.session.get("latestTabId");
  if (!latestTabId) return { ok: false };
  await chrome.tabs.sendMessage(latestTabId, { type: "PARAREAD_HIGHLIGHT_SOURCE", source, active });
  return { ok: true };
}

async function openSidePanel(tabId) {
  try {
    await chrome.sidePanel.open({ tabId });
  } catch {
    await chrome.sidePanel.setOptions({ tabId, path: "src/side-panel/side-panel.html", enabled: true });
  }
}

function getErrorMessage(error) {
  if (error?.name === "AbortError") return "Provider request timed out. Check API key/network, or clear the API key to use local mode.";
  return error?.message || "Analysis failed.";
}
