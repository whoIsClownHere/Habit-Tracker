export function getCssColor(variableName) {
  return getComputedStyle(document.body).getPropertyValue(variableName).trim();
}
