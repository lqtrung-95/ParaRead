# Codebase Summary

GrammarLens is a dependency-free Manifest V3 Chrome extension.

Core behavior:
- Extract article text from semantic page regions.
- Segment text into sentence-level grammar lenses.
- Generate local grammar/vocabulary hints without a network dependency.
- Optionally call DeepSeek's OpenAI-compatible chat endpoint for richer translation and explanations.
- Let the learner choose a learning-language override and one explanation language.
- Grammar notes explain the original learning-language sentence in the learner's chosen explanation language.
- Cards can show translation, pronunciation, original sentence, literal reading, pattern, explanation, examples, and vocabulary.
- Side panel language fields use searchable dropdown controls.
- Article extraction skips hidden content and AI-summary widgets.
- Hovering a card highlights the matching original paragraph.
- Saved vocabulary and sentences are stored locally for review with article title, URL, and learning language.
- Vocabulary terms can be marked learning or known by learning language in local storage.
- Selected text can be analyzed into a focused lens.
- Current lenses can be inserted inline into the source page.
- Analyzed articles are remembered in a local library.
- Saved items can be reviewed with simple spaced scheduling and exported to CSV.

Run:
- `npm run check`
- `npm test`

Install:
- Open `chrome://extensions`
- Enable Developer mode
- Load unpacked: project root
