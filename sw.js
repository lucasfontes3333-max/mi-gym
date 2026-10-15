/* Service worker de Mi gym.
   Objetivo: que la app abra en el gimnasio sin señal, siempre.
   Subí el número de VERSION cada vez que cambies index.html. */
const VERSION = "mi-gym-v6";

const SHELL = [
  ".",
  "index.html",
  "manifest.json",
  "fonts.css",
  "fonts/barlow-400.woff2",
  "fonts/barlow-500.woff2",
  "fonts/barlow-600.woff2",
  "fonts/barlow-condensed-600.woff2",
  "fonts/barlow-condensed-800.woff2",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      // addAll falla entero si un archivo falla; los agrego de a uno para no romper la instalación.
      await Promise.all(
        SHELL.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => {})),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Red con límite de paciencia: si en 2,5 s no contestó, uso lo que tengo guardado.
function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      },
    );
  });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // Al abrir la app: intento traer la versión nueva, pero nunca me quedo esperando.
  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          const res = await withTimeout(fetch(req), 2500);
          // una respuesta con error no reemplaza la copia buena que ya tengo
          if (res.ok) (await caches.open(VERSION)).put("index.html", res.clone());
          return res;
        } catch (err) {
          return (
            (await caches.match("index.html")) ||
            (await caches.match(".")) ||
            new Response("Sin conexión y sin copia guardada.", {
              status: 503,
              headers: { "Content-Type": "text/plain;charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  // Fuentes, íconos, css: lo guardado primero, que no cambia casi nunca.
  e.respondWith(
    (async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
      return res;
    })(),
  );
});
