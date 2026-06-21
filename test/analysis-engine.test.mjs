import test from "node:test";
import assert from "node:assert/strict";
import { buildLocalAnalysis, createProviderPrompt } from "../src/shared/analysis-engine.mjs";

test("buildLocalAnalysis creates sentence cards with grammar notes", () => {
  const analysis = buildLocalAnalysis({
    title: "Sample",
    url: "https://example.com",
    text: "Although learners read daily, grammar can still feel abstract. The article was written clearly.",
  });

  assert.equal(analysis.cards.length, 2);
  assert.match(analysis.cards[0].grammar, /Contrast/);
  assert.match(analysis.cards[1].grammar, /Passive/);
});

test("createProviderPrompt requests strict JSON", () => {
  const prompt = createProviderPrompt({
    title: "Prompt Test",
    text: "This is a short article. It has two sentences.",
  }, "Vietnamese");

  assert.match(prompt, /Return strict JSON/);
  assert.match(prompt, /Vietnamese/);
});

test("buildLocalAnalysis does not force a specific default target language", () => {
  const analysis = buildLocalAnalysis({
    title: "Sample",
    text: "Readers can choose their own language.",
  });

  assert.equal(analysis.targetLanguage, "your target language");
});
