# Code Standards

- Keep modules small and focused.
- Prefer pure helpers in `src/shared` so behavior is testable outside Chrome.
- Avoid dependencies until they remove real complexity.
- Store secrets only in `chrome.storage.local`; never commit secret files.
- Use kebab-case filenames for JS, HTML, CSS, and docs.
