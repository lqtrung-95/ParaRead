# Codebase Summary

ParaRead is a dependency-free Manifest V3 Chrome extension.

Core behavior:
- Extract article text from semantic page regions.
- Segment text into readable sentence cards.
- Generate local grammar/vocabulary hints without a network dependency.
- Optionally call DeepSeek's OpenAI-compatible chat endpoint for better translation and explanations.
- Require the learner to choose or save a target language.
- Side panel is the main app surface; extension icon opens it directly.
- Let the learner choose source, translation, and explanation languages.
- Render translation-first cards in the side panel.
- Hovering a card highlights the matching original paragraph.
- Saved vocabulary and sentences are stored locally for review with article title and URL.

Run:
- `npm run check`
- `npm test`

Install:
- Open `chrome://extensions`
- Enable Developer mode
- Load unpacked: project root
