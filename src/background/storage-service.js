export async function rememberArticle(analysis) {
  const { articleLibrary = [] } = await chrome.storage.local.get({ articleLibrary: [] });
  const item = {
    id: analysis.url || `local:${analysis.title}`,
    title: analysis.title || "Untitled",
    url: analysis.url || "",
    sourceLanguage: analysis.sourceLanguage || "Auto",
    learningLanguage: analysis.learningLanguage || analysis.sourceLanguage || "Auto",
    targetLanguage: analysis.targetLanguage || "",
    explanationLanguage: analysis.explanationLanguage || "",
    cardCount: analysis.cards?.length || 0,
    updatedAt: Date.now(),
    status: "reading",
  };
  await chrome.storage.local.set({
    articleLibrary: [item, ...articleLibrary.filter((article) => article.id !== item.id)].slice(0, 80),
  });
}
