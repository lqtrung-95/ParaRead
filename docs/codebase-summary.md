# Codebase Summary

ParaRead is a dependency-free Manifest V3 Chrome extension.

Core behavior:
- Extract article text from semantic page regions.
- Segment text into readable sentence cards.
- Generate local grammar/vocabulary hints without a network dependency.
- Optionally call DeepSeek's OpenAI-compatible chat endpoint for better translation and explanations.
- Require the learner to choose or save a target language.

Run:
- `npm run check`
- `npm test`

Install:
- Open `chrome://extensions`
- Enable Developer mode
- Load unpacked: project root
