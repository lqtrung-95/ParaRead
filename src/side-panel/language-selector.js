const LANGUAGES = [
  "English",
  "Vietnamese",
  "Chinese",
  "Japanese",
  "Korean",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Russian",
  "Arabic",
  "Thai",
  "Indonesian",
];

export function attachLanguageSelector(input, options = {}) {
  const menu = document.createElement("div");
  menu.className = "language-menu";
  input.parentElement.append(menu);
  input.addEventListener("focus", () => renderMenu(input, menu, options));
  input.addEventListener("input", () => renderMenu(input, menu, options));
  document.addEventListener("click", (event) => {
    if (!input.parentElement.contains(event.target)) menu.replaceChildren();
  });
}

function renderMenu(input, menu, options) {
  const query = input.value.trim().toLowerCase();
  const languages = options.allowAuto ? ["Auto", ...LANGUAGES] : LANGUAGES;
  const matches = languages
    .filter((language) => language.toLowerCase().includes(query))
    .slice(0, 8);
  menu.replaceChildren(...matches.map((language) => createOption(input, menu, language)));
}

function createOption(input, menu, language) {
  const button = document.createElement("button");
  button.className = "language-option";
  button.type = "button";
  button.textContent = language;
  button.addEventListener("click", () => {
    input.value = language;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    menu.replaceChildren();
  });
  return button;
}
