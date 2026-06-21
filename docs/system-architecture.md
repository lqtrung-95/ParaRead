# GrammarLens Architecture

## Components
- `src/content/content-script.js`: extracts readable article content from the active tab.
- `src/background/service-worker.js`: coordinates extraction, optional LLM analysis, repair, and session storage.
- `src/side-panel/side-panel.html`: main reader surface.
- `src/side-panel/side-panel.js`: side panel controller.
- `src/side-panel/reader-card.js`: renders grammar lens cards.
- `src/side-panel/review-store.js`: stores saved vocabulary and sentences.
- `src/side-panel/learning-store.js`: stores vocabulary learning/known state.
- `src/options/options.html`: provider and language defaults.
- `src/shared/*.mjs`: pure extraction and analysis helpers shared by extension and tests.

## Data Flow
1. Extension action opens the side panel.
2. Side panel sends `PARAREAD_ANALYZE_ACTIVE_TAB` to the service worker.
3. Service worker asks the content script for article payload.
4. Service worker builds local analysis or calls the configured OpenAI-compatible endpoint.
5. Analysis is saved in `chrome.storage.session`.
6. Side panel renders grammar lens cards and reads saved/known state from `chrome.storage.local`.

## Privacy
Article text is processed locally unless the user configures an API key. When an API key exists, extracted article text and selected language settings are sent to the configured provider.

## Provider Default
Default provider is DeepSeek Chat Completions:
- URL: `https://api.deepseek.com/chat/completions`
- Model: `deepseek-v4-flash`
- Thinking mode disabled for cost and latency
- JSON response format enabled for parse reliability
