import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLocalAnalysis,
  createGrammarRepairPrompt,
  createProviderPrompt,
  needsGrammarLanguageRepair,
  parseProviderCards,
} from "../src/shared/analysis-engine.mjs";

test("buildLocalAnalysis creates sentence cards with grammar notes", () => {
  const analysis = buildLocalAnalysis({
    title: "Sample",
    url: "https://example.com",
    text: "Although learners read daily, grammar can still feel abstract. The article was written clearly.",
  });

  assert.equal(analysis.cards.length, 2);
  assert.match(analysis.cards[0].grammar, /Contrast/);
  assert.match(analysis.cards[1].grammar, /Passive/);
  assert.equal(analysis.cards[0].pattern, "Contrast marker");
  assert.deepEqual(analysis.cards[0].examples, []);
});

test("createProviderPrompt requests strict JSON", () => {
  const prompt = createProviderPrompt({
    title: "Prompt Test",
    text: "This is a short article. It has two sentences.",
  }, "Chinese", "Vietnamese", "English");

  assert.match(prompt, /Return strict JSON/);
  assert.match(prompt, /Source article language: English/);
  assert.match(prompt, /parallel" field into exactly this language: Chinese/);
  assert.match(prompt, /literal" as a compact word-by-word/);
  assert.match(prompt, /pattern" as a short label/);
  assert.match(prompt, /grammar" field in exactly this language: Vietnamese/);
  assert.match(prompt, /examples" array must contain up to 2 short Chinese examples/);
  assert.match(prompt, /Chinese = pinyin with tone marks/);
  assert.match(prompt, /"pronunciation"/);
  assert.match(prompt, /explain grammar, particles, word order, or phrasing in the Chinese translation/);
  assert.match(prompt, /vocabulary" array must contain useful words or phrases from the Chinese translation/);
  assert.match(prompt, /Do not translate the "parallel" field into Vietnamese/);
});

test("buildLocalAnalysis does not force a specific default target language", () => {
  const analysis = buildLocalAnalysis({
    title: "Sample",
    text: "Readers can choose their own language.",
  });

  assert.equal(analysis.targetLanguage, "your target language");
  assert.equal(analysis.explanationLanguage, "your target language");
});

test("parseProviderCards accepts fenced JSON responses", () => {
  const analysis = parseProviderCards('```json\n{"cards":[{"source":"A","parallel":"B","grammar":"C","vocabulary":[]}]}\n```', {
    title: "Fallback",
    text: "Fallback sentence.",
  }, "Vietnamese");

  assert.equal(analysis.cards[0].parallel, "B");
});

test("buildLocalAnalysis keeps long articles instead of stopping at the first screen", () => {
  const text = Array.from({ length: 55 }, (_, index) => `Sentence number ${index + 1} has enough detail.`).join(" ");
  const analysis = buildLocalAnalysis({ title: "Long", text });

  assert.equal(analysis.cards.length, 48);
});

test("needsGrammarLanguageRepair catches Chinese grammar when explanation should be Vietnamese", () => {
  assert.equal(needsGrammarLanguageRepair({
    cards: [{ grammar: "“看似...的”表示不确定的推测。" }],
  }, "Chinese", "Vietnamese"), true);
});

test("needsGrammarLanguageRepair catches English grammar when explanation should be Vietnamese", () => {
  assert.equal(needsGrammarLanguageRepair({
    cards: [{ grammar: '"looks like" indicates uncertainty.' }],
  }, "Chinese", "Vietnamese"), true);
});

test("needsGrammarLanguageRepair accepts Vietnamese grammar explanations", () => {
  assert.equal(needsGrammarLanguageRepair({
    cards: [{ grammar: '"看似...的" biểu thị một sự suy đoán không chắc chắn.' }],
  }, "Chinese", "Vietnamese"), false);
});

test("createGrammarRepairPrompt preserves translated grammar intent", () => {
  const prompt = createGrammarRepairPrompt({
    cards: [{ source: "x", parallel: "看似...", pronunciation: "kàn sì", grammar: "wrong", vocabulary: ["看似"] }],
  }, "Chinese", "Vietnamese");

  assert.match(prompt, /Rewrite only the "grammar" fields/);
  assert.match(prompt, /Keep source, parallel, pronunciation, literal, pattern, examples, and vocabulary unchanged/);
  assert.match(prompt, /看似\.\.\.的" biểu thị một sự suy đoán không chắc chắn/);
});
