# GrammarLens Product Requirements

## Problem
Language learners can open any page in a language they are learning, but translation alone does not explain why the original sentence is built that way.

## MVP
Chrome extension that detects the page language, translates into the learner's chosen explanation language, and renders sentence-level grammar lenses with:
- translation into the explanation language
- pronunciation for CJK/Japanese/Korean when useful
- original source sentence
- literal or structure-preserving reading
- grammar/vocabulary pattern from the original language explained in the learner's chosen language
- short pattern examples
- original-language vocabulary terms with saved, learning, and known states

## Scope
- Manifest V3 unpacked extension
- Configurable OpenAI-compatible LLM provider
- DeepSeek `deepseek-v4-flash` as cost-efficient default provider/model
- Sidebar-first analysis flow
- Auto-detected learning language with manual override
- User-configurable explanation language
- Local fallback analysis when no API key configured
- Article extraction from common semantic HTML
- Local saved vocabulary and sentence review
- Lightweight known-word tracking
- Selected-text grammar lens analysis
- Inline paragraph lens insertion
- Local article library
- CSV export for saved items
- Provider presets for common OpenAI-compatible APIs

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
- Saved vocabulary can be marked learning or known and grouped by learning language
- Selected page text can be analyzed without analyzing the whole article
- Review items can be rated to schedule future review
- Saved items can be exported to CSV
- Tests cover extraction and local analysis
