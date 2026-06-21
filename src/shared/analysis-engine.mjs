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

export function buildLocalAnalysis(article, targetLanguage = "your target language", explanationLanguage = targetLanguage, sourceLanguage = "Auto") {
  const sentences = article.sentences?.length ? article.sentences : splitSentences(article.text);
  return {
    title: article.title,
    url: article.url,
    sourceLanguage,
    targetLanguage,
    explanationLanguage,
    generatedBy: "local",
    cards: sentences.slice(0, MAX_ANALYSIS_SENTENCES).map((sentence, index) => ({
      id: `s-${index + 1}`,
      source: sentence,
      parallel: buildLearningParaphrase(sentence, targetLanguage),
      pronunciation: "",
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

export function needsGrammarLanguageRepair(analysis, targetLanguage, explanationLanguage) {
  if (!/chinese/i.test(targetLanguage) || !/vietnamese/i.test(explanationLanguage)) return false;
  return (analysis.cards || []).some((card) => hasCjkText(card.grammar));
}

export function createGrammarRepairPrompt(analysis, targetLanguage, explanationLanguage) {
  return [
    `Rewrite only the "grammar" fields in strict JSON.`,
    `The translated sentence language is: ${targetLanguage}.`,
    `The grammar explanation language must be: ${explanationLanguage}.`,
    `Explain the grammar of the translated ${targetLanguage} sentence in ${explanationLanguage}.`,
    `Example: "看似...的" biểu thị một sự suy đoán không chắc chắn.`,
    `Keep source, parallel, pronunciation, and vocabulary unchanged.`,
    `Return strict JSON with the same shape: {"cards":[{"source":"","parallel":"","pronunciation":"","grammar":"","vocabulary":[""]}]}.`,
    JSON.stringify({ cards: analysis.cards || [] }),
  ].join("\n\n");
}

function extractJson(rawText) {
  const text = String(rawText || "").trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

function hasCjkText(value) {
  return /[\u3400-\u9fff]/u.test(String(value || ""));
}

export function createProviderPrompt(article, targetLanguage, explanationLanguage = targetLanguage, sourceLanguage = "Auto") {
  const sample = splitSentences(article.text, MAX_ANALYSIS_SENTENCES).join("\n");
  return [
    `You are ParaRead, a concise language-learning reader.`,
    `Source article language: ${sourceLanguage}. If Auto, infer it from the source sentences only.`,
    `Translate every "parallel" field into exactly this language: ${targetLanguage}.`,
    `Write every "grammar" field in exactly this language: ${explanationLanguage}.`,
    `The "grammar" field must explain grammar, particles, word order, or phrasing in the ${targetLanguage} translation, not grammar in the source article sentence.`,
    `The "vocabulary" array must contain useful words or phrases from the ${targetLanguage} translation, not from the source article sentence.`,
    `Add "pronunciation" for target languages with useful readings: Chinese = pinyin with tone marks, Japanese = kana or romaji reading, Korean = romanization. Otherwise use "".`,
    `Do not translate the "parallel" field into ${explanationLanguage} unless it is also the target language.`,
    `Do not write the "grammar" field in ${targetLanguage} unless it is also the explanation language.`,
    `Return strict JSON: {"cards":[{"source":"","parallel":"","pronunciation":"","grammar":"","vocabulary":[""]}]}.`,
    `Translate naturally, explain the translated sentence in context, and keep each grammar note under 22 words in ${explanationLanguage}.`,
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
