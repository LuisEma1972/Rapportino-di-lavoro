const CACHE="rapportino-v30-cache-clean";
const ASSETS=["./","./index.html","./style.css","./app.js","./manifest.webmanifest","./assets/default_logo.svg","./vendor/jspdf.umd.min.js","./vendor/pdf-fonts.js"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET" || new URL(e.request.url).origin!==self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(c=>c.match(e.request).then(r=>r||fetch(e.request))));
});
