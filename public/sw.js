const CACHE = "lifedesk-shell-v2";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/favicon.svg"];
const QUEUE_DB = "lifedesk-offline";

function openQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("writes", { keyPath: "id", autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueWrite(request) {
  const database = await openQueue();
  const record = {
    url: request.url,
    method: request.method,
    headers: [...request.headers.entries()],
    body: await request.clone().arrayBuffer(),
    queuedAt: Date.now(),
  };
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("writes", "readwrite");
    transaction.objectStore("writes").add(record);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

async function replayWrites() {
  const database = await openQueue();
  const records = await new Promise((resolve, reject) => {
    const request = database.transaction("writes").objectStore("writes").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  for (const record of records) {
    const response = await fetch(record.url, {
      method: record.method,
      headers: record.headers,
      body: record.body,
      credentials: "include",
    });
    if (!response.ok && response.status >= 500) throw new Error("Server unavailable");
    await new Promise((resolve, reject) => {
      const transaction = database.transaction("writes", "readwrite");
      transaction.objectStore("writes").delete(record.id);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" && url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request.clone()).catch(async () => {
        await queueWrite(request);
        if (self.registration.sync) await self.registration.sync.register("lifedesk-write-sync");
        return new Response(JSON.stringify({ queued: true }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    return;
  }
  if (request.method === "GET" && !url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
          replayWrites().catch(() => undefined);
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/index.html"))),
    );
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "lifedesk-write-sync") event.waitUntil(replayWrites());
});

self.addEventListener("message", (event) => {
  if (event.data === "REPLAY_WRITES") event.waitUntil(replayWrites());
});
