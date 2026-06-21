import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWhitespace, splitSentences } from "../src/shared/article-extractor.mjs";

test("normalizeWhitespace trims repeated spacing", () => {
  assert.equal(normalizeWhitespace("  A\n\n  useful\t sentence. "), "A useful sentence.");
});

test("splitSentences keeps punctuation and limits count", () => {
  const sentences = splitSentences("One sentence. Two sentence! Three sentence?", 2);
  assert.deepEqual(sentences, ["One sentence.", "Two sentence!"]);
});
