(() => {
  const BLOCK_SELECTOR = "article, main, [role='main'], .article, .post, .entry-content";
  const NOISE_SELECTOR = "script, style, nav, footer, aside, form, noscript, svg";

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "PARAREAD_EXTRACT_ARTICLE") return false;
    sendResponse(extractArticle());
    return true;
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
})();
