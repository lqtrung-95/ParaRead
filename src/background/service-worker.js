import { buildLocalAnalysis } from "../shared/analysis-engine.mjs";
import { splitSentences } from "../shared/article-extractor.mjs";
import { analyzeWithProvider } from "./provider-service.js";
import { rememberArticle } from "./storage-service.js";

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
  if (message?.type === "PARAREAD_ANALYZE_SELECTION") {
    respondSafely(sendResponse, () => analyzeSelection(message));
    return true;
  }
  if (message?.type === "PARAREAD_INSERT_INLINE_LENS") {
    respondSafely(sendResponse, () => insertInlineLens(message.card));
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
  await rememberArticle(analysis);
  await openSidePanel(tab.id);
  return { ok: true, cardCount: analysis.cards.length, generatedBy: analysis.generatedBy };
}

async function analyzeSelection(request) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, error: "No active tab found." };
  const selection = await getSelectionFromTab(tab.id);
  if (!selection.text || selection.text.length < 2) return { ok: false, error: "Select text on the page first." };
  const settings = { ...DEFAULT_SETTINGS, ...(await chrome.storage.local.get(DEFAULT_SETTINGS)) };
  const sourceLanguage = request.sourceLanguage || settings.sourceLanguage || "Auto";
  const targetLanguage = request.targetLanguage || settings.targetLanguage;
  const explanationLanguage = request.explanationLanguage || settings.explanationLanguage || targetLanguage;
  if (!targetLanguage || !explanationLanguage) return { ok: false, error: "Choose translate and explanation languages." };
  const article = {
    title: `Selection from ${selection.title}`,
    url: selection.url,
    text: selection.text,
    sentences: splitSentences(selection.text),
  };
  const analysis = settings.apiKey
    ? await analyzeWithProvider(article, settings, sourceLanguage, targetLanguage, explanationLanguage)
    : buildLocalAnalysis(article, targetLanguage, explanationLanguage, sourceLanguage);
  await chrome.storage.session.set({ latestTabId: tab.id, [`analysis:${tab.id}`]: { ...analysis, createdAt: Date.now() } });
  await rememberArticle(analysis);
  await openSidePanel(tab.id);
  return { ok: true, cardCount: analysis.cards.length, generatedBy: analysis.generatedBy };
}

async function getSelectionFromTab(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "PARAREAD_GET_SELECTION" });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["src/content/content-script.js"] });
    return chrome.tabs.sendMessage(tabId, { type: "PARAREAD_GET_SELECTION" });
  }
}

async function insertInlineLens(card) {
  const { latestTabId } = await chrome.storage.session.get("latestTabId");
  if (!latestTabId || !card) return { ok: false, error: "No lens to insert." };
  await chrome.tabs.sendMessage(latestTabId, { type: "PARAREAD_INSERT_INLINE_LENS", card });
  return { ok: true };
}

async function extractFromTab(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "PARAREAD_EXTRACT_ARTICLE" });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["src/content/content-script.js"] });
    return chrome.tabs.sendMessage(tabId, { type: "PARAREAD_EXTRACT_ARTICLE" });
  }
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
