# Research Report: ParaRead Provider Default

Date: 2026-06-21

## Recommendation
Use DeepSeek as default provider, specifically `deepseek-v4-flash`.

Why:
- Official DeepSeek API is OpenAI-compatible.
- Official model list says `deepseek-v4-flash` is current; `deepseek-chat` and `deepseek-reasoner` are compatibility aliases deprecated on 2026-07-24 15:59 UTC.
- Official pricing is low: `deepseek-v4-flash` cache-miss input $0.14 / 1M tokens, output $0.28 / 1M tokens, cache-hit input $0.0028 / 1M tokens.
- JSON output supported via `response_format: { "type": "json_object" }`.
- Thinking defaults enabled, so ParaRead should explicitly disable thinking for cheaper/faster article translation cards.

## Comparison
- DeepSeek `deepseek-v4-flash`: best cost/default fit for article translation + grammar JSON.
- Gemini `gemini-3.1-flash-lite`: strong cost-efficient alternative, but not the current OpenAI-compatible default in this extension.
- OpenAI GPT mini models: reliable, but materially more expensive for high-volume article reading.

## Implementation
- Default URL: `https://api.deepseek.com/chat/completions`
- Default model: `deepseek-v4-flash`
- Request body uses:
  - `thinking: { "type": "disabled" }`
  - `response_format: { "type": "json_object" }`
  - `max_tokens: 3500`

## Sources
- DeepSeek first API call: https://api-docs.deepseek.com/
- DeepSeek models/pricing: https://api-docs.deepseek.com/quick_start/pricing
- DeepSeek JSON output: https://api-docs.deepseek.com/guides/json_mode
- DeepSeek thinking mode: https://api-docs.deepseek.com/guides/thinking_mode
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- OpenAI pricing: https://openai.com/api/pricing/

## Unresolved Questions
None.
