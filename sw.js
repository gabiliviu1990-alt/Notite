const CACHE = "tabele-v3";
// fișierele fără de care aplicația nu pornește: dacă lipsește unul, instalarea eșuează clar
const CORE = ["./", "./index.html", "./manifest.json"];
// iconițele sunt opționale la instalare: dacă lipsește una, restul se instalează oricum
const ICONS = [
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(CORE).then(() => Promise.all(ICONS.map((u) => cache.add(u).catch(() => {}))))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;

  const esteIcon = /\.(png|jpg|jpeg|svg|ico|webp)$/i.test(new URL(req.url).pathname);

  if (esteIcon) {
    // iconițele se schimbă rar: întâi din cache
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // pagina, manifestul și restul: întâi din rețea, ca să vezi imediat modificările; offline, din cache
  event.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() =>
      caches.match(req).then((cached) =>
        cached || (req.mode === "navigate" ? caches.match("./index.html") : undefined)
      )
    )
  );
});
