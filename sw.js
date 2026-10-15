/* ヤドカリの裏の係（サービスワーカー）
   カレンダー用のファイルを「住所から届いたファイル」として Safari に渡すためだけに使う。
   ./cal.ics?t=... の t の中身をそのまま返す。外とは一切通信しない。ほかの通信には触らない */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
/* 何件もまとめた長いファイルは、先にページから受け取っておく（端末の中だけ。しばらくしたら捨てる） */
const held = new Map();
self.addEventListener("message", e => {
  const d = e.data || {}; if (typeof d.k !== "string" || typeof d.text !== "string") return;
  held.set(d.k, d.text); setTimeout(() => held.delete(d.k), 120000);
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin || !u.pathname.endsWith("/cal.ics")) return;
  const t = u.searchParams.get("t") || held.get(u.searchParams.get("k") || "") || "";
  if (!t.startsWith("BEGIN:VCALENDAR")) { e.respondWith(new Response("not a calendar", { status: 400 })); return; }
  e.respondWith(new Response(t, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="yadokari.ics"', "Cache-Control": "no-store" } }));
});
