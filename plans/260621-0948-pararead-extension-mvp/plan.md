# ParaRead Extension MVP Plan

## Decision
Good idea. Build Chrome extension first: fastest path to distribution, direct fit for web articles, no backend required for MVP.

## Acceptance Criteria
- Unpacked MV3 extension loads from repo root.
- Popup triggers analysis for active article.
- Side panel displays original sentence, parallel output, grammar note, vocabulary hints.
- Options page saves OpenAI-compatible provider settings.
- No API key required for demo/local fallback.
- Static checks and unit tests pass.

## Phases
1. Scaffold extension manifest and UI surfaces.
2. Implement article extraction and analysis pipeline.
3. Add tests and docs.

## Scope Boundary
No accounts, backend, payments, or saved article library in this slice.
