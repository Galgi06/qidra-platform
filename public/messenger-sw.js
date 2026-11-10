self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Messenger contains private data, so authenticated pages and API responses are never cached.
self.addEventListener("fetch", () => undefined);
