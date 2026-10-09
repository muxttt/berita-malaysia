/* =========================================================
   Service Worker — Berita Malaysia
   Strategi:
   - Aset statik tempatan: cache-first (cepat + offline)
   - Permintaan luaran (RSS/proxy): biar lalu terus
   ========================================================= */

const VERSI_CACHE = "berita-my-v1";
const ASET_STATIK = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.svg"
];

/* --- Install: simpan aset dalam cache --- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSI_CACHE)
      .then((cache) => cache.addAll(ASET_STATIK))
      .then(() => self.skipWaiting())
  );
});

/* --- Activate: buang cache lama --- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((kunci) =>
        Promise.all(
          kunci.filter((k) => k !== VERSI_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* --- Fetch: strategi cache --- */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Hanya urus GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Permintaan luar (proxy / RSS) — biar lalu terus ke rangkaian
  if (url.origin !== self.location.origin) {
    return;
  }

  // Aset statik tempatan — cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          // Simpan salinan untuk permintaan seterusnya
          if (res && res.status === 200) {
            const salinan = res.clone();
            caches.open(VERSI_CACHE).then((cache) => cache.put(req, salinan));
          }
          return res;
        })
        .catch(() => {
          // Fallback untuk navigasi: hantar index.html
          if (req.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});

/* --- Terima mesej dari klien (untuk skipWaiting manual) --- */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});