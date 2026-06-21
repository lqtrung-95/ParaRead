import { splitSentences } from "./article-extractor.mjs";

const MAX_ANALYSIS_SENTENCES = 48;

const PATTERNS = [
  { re: /\b(was|were|is|are|been|being)\s+\w+(ed|en|itten|own|ade|uilt)\b/i, note: "Passive voice: focus is on what happened, not who did it." },
  { re: /\b(if|unless|provided that|as long as)\b/i, note: "Conditional clause: this sentence sets a condition before the main idea." },
  { re: /\balthough|though|however|nevertheless|despite\b/i, note: "Contrast marker: compare the two ideas around this connector." },
  { re: /\bwho|which|that|where\b/i, note: "Relative clause: extra information modifies a noun before it." },
  { re: /\b(has|have|had)\s+\w+ed\b/i, note: "Perfect aspect: connects a past action to a later reference point." },
  { re: /\bwill|would|could|should|might|may|must\b/i, note: "Modal verb: shows possibility, obligation, prediction, or attitude." },
];

export function buildLocalAnalysis(article, targetLanguage = "your target language", explanationLanguage = targetLanguage) {
  const sentences = article.sentences?.length ? article.sentences : splitSentences(article.text);
  return {
    title: article.title,
    url: article.url,
    targetLanguage,
    explanationLanguage,
    generatedBy: "local",
    cards: sentences.slice(0, MAX_ANALYSIS_SENTENCES).map((sentence, index) => ({
      id: `s-${index + 1}`,
      source: sentence,
      parallel: buildLearningParaphrase(sentence, targetLanguage),
      grammar: buildLocalGrammarNote(sentence, explanationLanguage),
      vocabulary: pickVocabulary(sentence),
    })),
  };
}

export function parseProviderCards(rawText, fallbackArticle, targetLanguage, explanationLanguage = targetLanguage) {
  try {
    const parsed = JSON.parse(extractJson(rawText));
    if (Array.isArray(parsed.cards)) return parsed;
  } catch {
    return buildLocalAnalysis(fallbackArticle, targetLanguage, explanationLanguage);
  }
  return buildLocalAnalysis(fallbackArticle, targetLanguage, explanationLanguage);
}

function extractJson(rawText) {
  const text = String(rawText || "").trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

export function createProviderPrompt(article, targetLanguage, explanationLanguage = targetLanguage) {
  const sample = splitSentences(article.text, MAX_ANALYSIS_SENTENCES).join("\n");
  return [
    `You are ParaRead, a concise language-learning reader.`,
    `Translate each source sentence into: ${targetLanguage}.`,
    `Write grammar explanations in the learner's mother tongue: ${explanationLanguage}.`,
    `Return strict JSON: {"cards":[{"source":"","parallel":"","grammar":"","vocabulary":[""]}]}.`,
    `Translate naturally, explain grammar in context, and keep each grammar note under 22 words in ${explanationLanguage}.`,
    `Article title: ${article.title}`,
    `Sentences:\n${sample}`,
  ].join("\n\n");
}

function buildLocalGrammarNote(sentence, explanationLanguage) {
  const note = PATTERNS.find((pattern) => pattern.re.test(sentence))?.note ||
    "Main clause: identify the subject, verb, and object before reading details.";
  if (explanationLanguage === "your target language" || /^english$/i.test(explanationLanguage)) return note;
  return `Local hint in English: ${note} Configure an AI provider for ${explanationLanguage} explanations.`;
}

function pickVocabulary(sentence) {
  const words = sentence
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 6);
  return [...new Set(words)].slice(0, 4);
}

function buildLearningParaphrase(sentence, targetLanguage) {
  return `(${targetLanguage}) Configure an AI provider for full translation. Reading gist: ${sentence}`;
}
