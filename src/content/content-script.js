(() => {
  const BLOCK_SELECTOR = "article, main, [role='main'], .article, .post, .entry-content";
  const NOISE_SELECTOR = [
    "script",
    "style",
    "nav",
    "footer",
    "aside",
    "form",
    "noscript",
    "svg",
    "[hidden]",
    "[aria-hidden='true']",
    "[data-editable='aiSummary']",
    ".article__ai-summary-wrapper",
    ".ai-article-summary",
    "[class*='ai-summary']",
  ].join(",");
  const HIGHLIGHT_CLASS = "pararead-source-highlight";
  let highlightedNode = null;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "PARAREAD_EXTRACT_ARTICLE") {
      sendResponse(extractArticle());
      return true;
    }
    if (message?.type === "PARAREAD_HIGHLIGHT_SOURCE") {
      highlightSource(message.source, message.active);
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  function extractArticle() {
    const root = pickReadableRoot();
    const title = clean(
      document.querySelector("meta[property='og:title']")?.content ||
        document.querySelector("h1")?.textContent ||
        document.title ||
        "Untitled article",
    );
    const text = getReadableTextNodes(root)
      .map((node) => clean(node.textContent))
      .filter((value) => value.length > 40)
      .join(" ");
    const fallbackText = getVisibleText(root);
    return { title, url: location.href, text: clean(text || fallbackText) };
  }

  function pickReadableRoot() {
    return [...document.querySelectorAll(BLOCK_SELECTOR), document.body]
      .filter(Boolean)
      .map((element) => ({ element, score: scoreElement(element) }))
      .sort((left, right) => right.score - left.score)[0]?.element || document.body;
  }

  function scoreElement(element) {
    const readableNodes = getReadableTextNodes(element);
    const textLength = readableNodes.reduce((sum, node) => sum + clean(node.textContent).length, 0);
    const paragraphCount = readableNodes.filter((node) => node.matches("p")).length;
    const linkLength = [...element.querySelectorAll("a")]
      .filter(isVisibleContentNode)
      .reduce((sum, link) => sum + clean(link.textContent).length, 0);
    return textLength + paragraphCount * 80 - linkLength * 1.8;
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function getReadableTextNodes(root) {
    return [...root.querySelectorAll("p, h1, h2, h3, li, blockquote")]
      .filter(isVisibleContentNode);
  }

  function getVisibleText(root) {
    return clean(getReadableTextNodes(root).map((node) => node.textContent).join(" "));
  }

  function isVisibleContentNode(node) {
    if (!node || node.closest(NOISE_SELECTOR)) return false;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
    return node.getClientRects().length > 0;
  }

  function highlightSource(source, active) {
    clearHighlight();
    if (!active || !source) return;
    highlightedNode = findClosestSourceNode(source);
    if (!highlightedNode) return;
    ensureHighlightStyles();
    highlightedNode.classList.add(HIGHLIGHT_CLASS);
    highlightedNode.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function clearHighlight() {
    if (highlightedNode) highlightedNode.classList.remove(HIGHLIGHT_CLASS);
    highlightedNode = null;
  }

  function findClosestSourceNode(source) {
    const needle = clean(source).slice(0, 120);
    return [...document.querySelectorAll("p, h1, h2, h3, li, blockquote")]
      .filter(isVisibleContentNode)
      .find((node) => clean(node.textContent).includes(needle));
  }

  function ensureHighlightStyles() {
    if (document.querySelector("#pararead-highlight-style")) return;
    const style = document.createElement("style");
    style.id = "pararead-highlight-style";
    style.textContent = `
      .${HIGHLIGHT_CLASS} {
        background: rgba(23, 107, 135, 0.12) !important;
        box-shadow: 0 0 0 3px rgba(23, 107, 135, 0.28) !important;
        border-radius: 4px !important;
        transition: background 160ms ease, box-shadow 160ms ease !important;
      }
    `;
    document.documentElement.append(style);
  }
})();
