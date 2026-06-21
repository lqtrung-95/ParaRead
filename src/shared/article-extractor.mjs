const BLOCK_SELECTOR = "article, main, [role='main'], .article, .post, .entry-content";
const NOISE_SELECTOR = "script, style, nav, footer, aside, form, noscript, svg";
const MIN_TEXT_LENGTH = 240;

export function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function splitSentences(text, maxSentences = 60) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];
  const matches = normalized.match(/[^.!?。！？]+[.!?。！？]+(?:["'”’])?|[^.!?。！？]+$/g) || [];
  return matches.map(normalizeWhitespace).filter(Boolean).slice(0, maxSentences);
}

export function pickReadableRoot(documentRef) {
  const candidates = [...documentRef.querySelectorAll(BLOCK_SELECTOR), documentRef.body].filter(Boolean);
  return candidates
    .map((element) => ({ element, score: scoreElement(element) }))
    .sort((left, right) => right.score - left.score)[0]?.element || documentRef.body;
}

export function extractArticleFromDocument(documentRef, locationRef = globalThis.location) {
  const root = pickReadableRoot(documentRef).cloneNode(true);
  root.querySelectorAll(NOISE_SELECTOR).forEach((node) => node.remove());

  const title = normalizeWhitespace(
    documentRef.querySelector("meta[property='og:title']")?.content ||
      documentRef.querySelector("h1")?.textContent ||
      documentRef.title ||
      "Untitled article",
  );
  const paragraphs = [...root.querySelectorAll("p, h2, h3, li, blockquote")]
    .map((node) => normalizeWhitespace(node.textContent))
    .filter((text) => text.length > 40);
  const text = normalizeWhitespace(paragraphs.join(" "));

  return {
    title,
    url: locationRef?.href || "",
    text: text.length >= MIN_TEXT_LENGTH ? text : normalizeWhitespace(root.textContent),
    sentences: splitSentences(text || root.textContent),
  };
}

function scoreElement(element) {
  const textLength = normalizeWhitespace(element.textContent).length;
  const paragraphCount = element.querySelectorAll("p").length;
  const linkTextLength = [...element.querySelectorAll("a")]
    .map((link) => normalizeWhitespace(link.textContent).length)
    .reduce((sum, length) => sum + length, 0);
  return textLength + paragraphCount * 80 - linkTextLength * 1.8;
}
