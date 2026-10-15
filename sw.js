/* ヤドカリの裏の係（サービスワーカー）
   カレンダー用のファイルを「住所から届いたファイル」として Safari に渡すためだけに使う。
   ./cal.ics?t=... の t の中身をそのまま返す。外とは一切通信しない。ほかの通信には触らない */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin || !u.pathname.endsWith("/cal.ics")) return;
  const t = u.searchParams.get("t") || "";
  if (!t.startsWith("BEGIN:VCALENDAR")) { e.respondWith(new Response("not a calendar", { status: 400 })); return; }
  e.respondWith(new Response(t, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="yadokari.ics"', "Cache-Control": "no-store" } }));
});
