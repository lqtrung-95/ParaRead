# GrammarLens Product Requirements

## Problem
Language learners can read authentic articles, but translation alone does not explain why a sentence is built that way.

## MVP
Chrome extension that extracts article text from the active page and renders sentence-level grammar lenses with:
- target-language translation
- pronunciation for CJK/Japanese/Korean when useful
- original source sentence
- literal or structure-preserving reading
- grammar pattern and explanation in the learner's mother tongue
- short pattern examples
- vocabulary terms with saved, learning, and known states

## Scope
- Manifest V3 unpacked extension
- Configurable OpenAI-compatible LLM provider
- DeepSeek `deepseek-v4-flash` as cost-efficient default provider/model
- Sidebar-first analysis flow
- User-configurable source, target, and explanation languages
- Local fallback analysis when no API key configured
- Article extraction from common semantic HTML
- Local saved vocabulary and sentence review
- Lightweight known-word tracking

## Out Of Scope
- User accounts
- Billing
- Full LingQ-style course system
- Server backend

## Acceptance
- Extension loads unpacked in Chrome
- Extension icon opens the side panel
- Side panel analyzes the active article
- Cards show grammar lens fields when provider returns them
- Review saves include article title and URL
- Saved vocabulary can be marked learning or known
- Tests cover extraction and local analysis
