# ParaRead Product Requirements

## Problem
Language learners can open authentic articles but lose time switching between translation, grammar lookup, and sentence context.

## MVP
Chrome extension that extracts article text from the active page, opens a side panel, and renders sentence-level reading cards with:
- original sentence
- parallel translation or learning paraphrase
- grammar note in context
- vocabulary hints

## Scope
- Manifest V3 unpacked extension
- Configurable OpenAI-compatible LLM provider
- DeepSeek `deepseek-v4-flash` as cost-efficient default provider/model
- User-configurable target translation language
- Local fallback analysis when no API key configured
- Article extraction from common semantic HTML

## Out Of Scope
- User accounts
- Saved library
- Billing
- Full LingQ-style known-word tracking
- Server backend

## Acceptance
- Extension loads unpacked in Chrome
- Popup can analyze active article
- Side panel displays analysis
- Options page stores provider settings locally
- First analysis asks for target language if none configured
- Tests cover extraction and local analysis
