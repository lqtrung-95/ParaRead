import {
  buildLocalAnalysis,
  createGrammarRepairPrompt,
  createProviderPrompt,
  needsGrammarLanguageRepair,
  parseProviderCards,
} from "../shared/analysis-engine.mjs";

export async function analyzeWithProvider(article, settings, sourceLanguage, targetLanguage, explanationLanguage) {
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
  if (!response.ok) return { ok: false, error: `Provider returned ${response.status}.` };
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
