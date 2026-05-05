const CACHE_PREFIX = "lifestage-focus-pwa-";
const CACHE_NAME = "lifestage-focus-pwa-v2";
const APP_SHELL_PATHS = [
  "",
  "index.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

function getBaseUrl() {
  return new URL(self.registration.scope);
}

function toScopedUrl(pathname) {
  return new URL(pathname, getBaseUrl()).toString();
}

const APP_SHELL = APP_SHELL_PATHS.map((pathname) => toScopedUrl(pathname));

async function cacheResponse(request, response) {
  if (!response || !response.ok) {
    return response;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function notifyClientsActivated() {
  const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(
    clientList.map((client) =>
      client.postMessage({
        type: "SW_ACTIVATED",
        cacheName: CACHE_NAME
      })
    )
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(
      APP_SHELL.map(async (url) => {
        try {
          await cache.add(url);
        } catch (error) {
          console.warn("SW cache add failed:", url, error);
        }
      })
    );
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
      .then(() => notifyClientsActivated())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  const isNavigationRequest = event.request.mode === "navigate";
  const isImageAsset = /\.(svg|png|jpg|jpeg|webp|gif|avif|ico)$/i.test(requestUrl.pathname);
  const isCoreAsset = /\.(js|css|html|webmanifest)$/i.test(requestUrl.pathname);

  if (isNavigationRequest) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(event.request);
        return cacheResponse(event.request, networkResponse);
      } catch (error) {
        const cachedPage = await caches.match(event.request);
        if (cachedPage) {
          return cachedPage;
        }
        return caches.match(toScopedUrl("index.html"));
      }
    })());
    return;
  }

  if (isCoreAsset) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(event.request);
        return cacheResponse(event.request, networkResponse);
      } catch (error) {
        return caches.match(event.request);
      }
    })());
    return;
  }

  if (isImageAsset) {
    event.respondWith((async () => {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      const networkResponse = await fetch(event.request);
      return cacheResponse(event.request, networkResponse);
    })());
    return;
  }

  event.respondWith((async () => {
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(event.request);
    return cacheResponse(event.request, networkResponse);
  })());
});
