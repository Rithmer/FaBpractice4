import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.scss";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    if (import.meta.env.DEV) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        }
      } catch (error) {
        console.error("SW cleanup in dev failed:", error);
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("SW registration failed:", error);
    });
  });
}
