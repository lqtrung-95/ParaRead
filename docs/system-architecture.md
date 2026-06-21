# ParaRead Architecture

## Components
- `src/content/content-script.js`: extracts readable article content from the active tab.
- `src/background/service-worker.js`: coordinates extraction, optional LLM analysis, and session storage.
- `src/popup/popup.html`: user command surface.
- `src/side-panel/side-panel.html`: parallel-text reading view.
- `src/options/options.html`: provider and default target-language configuration.
- `src/shared/*.mjs`: pure extraction and analysis helpers shared by extension and tests.

## Data Flow
1. Popup sends `PARAREAD_ANALYZE_ACTIVE_TAB` to service worker.
2. Service worker asks content script for article payload.
3. Service worker builds local analysis or calls configured OpenAI-compatible chat endpoint.
4. Analysis saved in `chrome.storage.session`.
5. Side panel reads latest tab analysis and renders sentence cards.

## Privacy
Article text is processed locally unless the user configures an API key. When an API key exists, only the extracted article title, URL, target language, and selected text snippet are sent to the configured provider.

## Provider Default
Default provider is DeepSeek Chat Completions:
- URL: `https://api.deepseek.com/chat/completions`
- Model: `deepseek-v4-flash`
- Thinking mode disabled for cost and latency
- JSON response format enabled for parse reliability
