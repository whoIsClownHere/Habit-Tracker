export function registerServiceWorker() {
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  const canRegister =
    "serviceWorker" in navigator &&
    window.location.protocol === "https:" &&
    !isLocalHost;

  if (!canRegister) return;

  window.addEventListener("load", () => {
    const workerUrl = new URL("sw.js", window.location.href);
    navigator.serviceWorker.register(workerUrl, { scope: "./" }).catch(() => {});
  });
}
