export function createSaveButton(label, onClick, options = {}) {
  const button = document.createElement("button");
  button.className = options.className || "secondary-button";
  button.type = "button";
  button.textContent = options.saved ? options.savedLabel || "Saved" : label;
  if (options.saved) setSaveButtonState(button, "saved", button.textContent, true);
  button.addEventListener("click", async () => {
    if (button.dataset.state === "saved") return;
    setSaveButtonState(button, "saving", "Saving...", true);
    try {
      const result = await onClick();
      setSaveButtonState(button, "saved", options.savedLabel || "Saved", true);
      return result;
    } catch {
      setSaveButtonState(button, "error", "Save failed", false);
      setTimeout(() => setSaveButtonState(button, "", label, false), 2200);
      return null;
    }
  });
  return button;
}

function setSaveButtonState(button, state, label, disabled) {
  button.disabled = disabled;
  button.dataset.state = state;
  button.textContent = label;
}
