(() => {
  const BLOCK_SELECTOR = "article, main, [role='main'], .article, .post, .entry-content";
  const NOISE_SELECTOR = "script, style, nav, footer, aside, form, noscript, svg";
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
    const root = pickReadableRoot().cloneNode(true);
    root.querySelectorAll(NOISE_SELECTOR).forEach((node) => node.remove());
    const title = clean(
      document.querySelector("meta[property='og:title']")?.content ||
        document.querySelector("h1")?.textContent ||
        document.title ||
        "Untitled article",
    );
    const text = [...root.querySelectorAll("p, h2, h3, li, blockquote")]
      .map((node) => clean(node.textContent))
      .filter((value) => value.length > 40)
      .join(" ");
    const fallbackText = clean(root.textContent);
    return { title, url: location.href, text: clean(text || fallbackText) };
  }

  function pickReadableRoot() {
    return [...document.querySelectorAll(BLOCK_SELECTOR), document.body]
      .filter(Boolean)
      .map((element) => ({ element, score: scoreElement(element) }))
      .sort((left, right) => right.score - left.score)[0]?.element || document.body;
  }

  function scoreElement(element) {
    const textLength = clean(element.textContent).length;
    const paragraphCount = element.querySelectorAll("p").length;
    const linkLength = [...element.querySelectorAll("a")]
      .reduce((sum, link) => sum + clean(link.textContent).length, 0);
    return textLength + paragraphCount * 80 - linkLength * 1.8;
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
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
