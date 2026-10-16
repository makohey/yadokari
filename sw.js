/* ヤドカリの裏の係（サービスワーカー）
   1. ページを覚えておく：電波がある時はいつも新しい版を取りに行き、取れた版を端末の中に覚え直す。
      電波がない時（飛行機モード・地下など）だけ、覚えた版を出す。だから古い版のまま固まらない。
      覚えるのはヤドカリのページと共通部品だけ（同じ住所の中）。予定の中身は今まで通りページの棚にあり、ここには入らない。
   2. カレンダー用のファイルを「住所から届いたファイル」として Safari に渡す（./cal.ics）。外とは通信しない。
   ほかの住所（ローカルくんの部品など）には触らない */
const PAGES = "yadokari-pages-v1";
const FIRST = ["./", "./index.html", "./dashboard.html", "./lab.html", "./plan-core.js"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(PAGES).then(c => Promise.all(FIRST.map(u => fetch(u, { cache: "no-cache" }).then(r => r.ok ? c.put(u, r) : null).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith("yadokari-pages-") && k !== PAGES) await caches.delete(k);
  await self.clients.claim();
})()));
/* 何件もまとめた長いファイルは、先にページから受け取っておく（端末の中だけ。しばらくしたら捨てる） */
const held = new Map();
self.addEventListener("message", e => {
  const d = e.data || {}; if (typeof d.k !== "string" || typeof d.text !== "string") return;
  held.set(d.k, d.text); setTimeout(() => held.delete(d.k), 120000);
});
/* 覚える物：ページ（.html・フォルダの頭）と .js。version.json（新しい版の知らせ）は覚えない */
const keepable = u => u.origin === self.location.origin && (u.pathname.endsWith("/") || u.pathname.endsWith(".html") || u.pathname.endsWith(".js")) && !u.pathname.endsWith("/sw.js");
async function fromCache(req) {
  const c = await caches.open(PAGES);
  return (await c.match(req)) || (await c.match(req, { ignoreSearch: true })) || (req.mode === "navigate" ? await c.match("./dashboard.html") : undefined);
}
async function networkFirst(req) {
  const c = await caches.open(PAGES);
  const net = fetch(req, { cache: "no-cache" }).then(r => { if (r.ok) c.put(req, r.clone()); return r; });
  net.catch(() => {});
  /* 電波が弱くて返事が遅い時は、5秒待って覚えた版を出す（覚えた版がなければそのまま待つ） */
  const slow = new Promise(res => setTimeout(async () => res(await fromCache(req)), 5000));
  try {
    const r = await Promise.race([net, slow.then(x => x || net)]);
    return r;
  } catch (_) {
    const hit = await fromCache(req);
    if (hit) return hit;
    return new Response("<meta charset=utf-8><p style='font-family:sans-serif;padding:20px'>電波がなく、このページはまだ端末に覚えていません。電波のある所で一度開いてね。</p>", { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  if (u.origin === self.location.origin && u.pathname.endsWith("/cal.ics")) {
    const t = u.searchParams.get("t") || held.get(u.searchParams.get("k") || "") || "";
    if (!t.startsWith("BEGIN:VCALENDAR")) { e.respondWith(new Response("not a calendar", { status: 400 })); return; }
    e.respondWith(new Response(t, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="yadokari.ics"', "Cache-Control": "no-store" } }));
    return;
  }
  if (keepable(u)) e.respondWith(networkFirst(e.request));
});
