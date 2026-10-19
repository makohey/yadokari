/* 部品：✏️ 1行日記・気分・天気（足した人の端末でだけ読み込む）
   1日1枚：天気マーク・気分マーク・1行。予報は取りに行かない（自分で選ぶ記録）。
   データはこの端末の中だけ（yadokari.diary）。外にはつながない */
(() => {
"use strict";
const KEY = "yadokari.diary";
const WEATHER = [["☀️", "晴れ"], ["🌤️", "晴れ時々くもり"], ["☁️", "くもり"], ["🌧️", "雨"], ["⛈️", "雷雨"], ["❄️", "雪"], ["🌫️", "霧"]];
const MOOD = [["😊", "いい"], ["🙂", "まあまあ"], ["😐", "ふつう"], ["😢", "かなしい"], ["😠", "いらいら"], ["😴", "つかれた"]];
const load = () => { const v = getJ(KEY, []); return Array.isArray(v) ? v.filter(x => x && x.id) : []; };
const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (_) { alert("保存できませんでした（容量がいっぱいかも）"); return false; } };
const get = ds => load().find(x => x.id === ds) || { id: ds };
function put(ds, patch) {
  const l = load(); let x = l.find(e => e.id === ds);
  if (!x) { x = { id: ds }; l.push(x); }
  Object.assign(x, patch, { at: Date.now() });
  save(l.filter(e => e.w || e.m || (e.t && e.t.trim())));
}
let boardDay = null, timer = null;
/* その日の欄・部品の板の両方で使う、1日分の書く形 */
function editor(ds, where) {
  const e = get(ds);
  return `<div class="dyBox" data-dyday="${esc(ds)}" data-dywhere="${where}">
    <div class="dyRow"><span class="dyL">天気<span class="en">Weather</span></span>${WEATHER.map(([k, n]) => `<button type="button" class="dyB${e.w === k ? " on" : ""}" data-dyw="${k}" title="${n}" aria-label="${n}">${k}</button>`).join("")}</div>
    <div class="dyRow"><span class="dyL">気分<span class="en">Mood</span></span>${MOOD.map(([k, n]) => `<button type="button" class="dyB${e.m === k ? " on" : ""}" data-dym="${k}" title="${n}" aria-label="${n}">${k}</button>`).join("")}</div>
    <input class="dyT" data-dyt maxlength="140" value="${esc(e.t || "")}" placeholder="1行日記（${+ds.slice(5, 7)}/${+ds.slice(8, 10)}）">
  </div>`;
}
function counts(ym) {
  const l = load().filter(e => e.id.startsWith(ym)), c = (arr, f) => arr.map(([k]) => [k, l.filter(e => e[f] === k).length]).filter(x => x[1]);
  return { w: c(WEATHER, "w"), m: c(MOOD, "m"), n: l.filter(e => e.t && e.t.trim()).length };
}
function render(el) {
  const T = YK.t0(); if (!boardDay) boardDay = T;
  const ym = boardDay.slice(0, 7), y = +ym.slice(0, 4), m = +ym.slice(5, 7), days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = YK.leadOf(new Date(Date.UTC(y, m - 1, 1)).getUTCDay()), all = new Map(load().map(e => [e.id, e]));
  let cells = YK.weekOrder().map(i => `<div class="hbW">${WD[i]}</div>`).join("") + "<div></div>".repeat(lead);
  for (let d = 1; d <= days; d++) { const ds = `${ym}-${z(d)}`, e = all.get(ds) || {}; cells += `<button type="button" class="dyC${ds === boardDay ? " sel" : ""}${ds === T ? " today" : ""}" data-dypick="${ds}"><small>${d}</small><span>${e.w || ""}${e.m || ""}</span></button>`; }
  const c = counts(ym);
  const recent = load().filter(e => e.t && e.t.trim()).sort((a, b) => b.id.localeCompare(a.id)).slice(0, 7);
  el.innerHTML = `<div class="sect"><span>✏️ 1行日記・気分・天気<span class="en">Diary</span></span></div>
    <div class="hbNav"><button type="button" data-dym-nav="-1" aria-label="前の月">‹</button><b>${y}年${m}月</b><button type="button" data-dym-nav="1" aria-label="次の月">›</button>${ym !== T.slice(0, 7) ? `<button type="button" data-dym-nav="0" style="font-size:12px;padding:2px 10px">今月へ</button>` : ""}</div>
    <div class="hbGrid">${cells}</div>
    <div class="bkSub" style="margin-top:6px">${esc(YK.HDF(boardDay))} を書く</div>
    ${editor(boardDay, "board")}
    ${c.w.length || c.m.length ? `<div class="dyCount">${c.w.map(([k, n]) => `<span>${k}<b>${n}</b></span>`).join("")}${c.w.length && c.m.length ? `<span class="dySep"></span>` : ""}${c.m.map(([k, n]) => `<span>${k}<b>${n}</b></span>`).join("")}</div><div class="bkSub">${m}月：天気と気分を選んだ日の数・1行日記 ${c.n}日</div>` : ""}
    ${recent.length ? `<details style="margin-top:6px"><summary class="note" style="cursor:pointer">最近の1行日記（${recent.length}）</summary>${recent.map(e => `<div class="bkCard" data-dypick="${esc(e.id)}"><div class="bkSub">${esc(YK.HDF(e.id))} ${e.w || ""}${e.m || ""}</div><div class="bkNote" style="font-size:13.5px">${esc(e.t)}</div></div>`).join("")}</details>` : ""}
    <p class="note" style="margin-top:6px">天気は予報ではなく、その日の記録です（外から取ってきません）。同じマークをもう一度押すと外れます。</p>`;
}
/* 押した・書いた：その日の欄でも部品の板でも同じ動き（ページ全体で1つだけ受ける） */
function bindOnce() {
  if (window.__dyBound) return; window.__dyBound = true;
  document.addEventListener("click", e => {
    const box = e.target.closest("[data-dyday]");
    const w = e.target.closest("[data-dyw]"), m = e.target.closest("[data-dym]");
    if (box && (w || m)) {
      const ds = box.dataset.dyday, cur = get(ds);
      if (w) put(ds, { w: cur.w === w.dataset.dyw ? "" : w.dataset.dyw });
      if (m) put(ds, { m: cur.m === m.dataset.dym ? "" : m.dataset.dym });
      YK.render(); return;
    }
    const pk = e.target.closest("[data-dypick]"); if (pk) { boardDay = pk.dataset.dypick; const el = document.querySelector('[data-mod="diary"]'); if (el) render(el); return; }
    const nv = e.target.closest("[data-dym-nav]");
    if (nv) { const n = +nv.dataset.dymNav, T = YK.t0(); if (n === 0) boardDay = T; else { let y = +boardDay.slice(0, 4), mo = +boardDay.slice(5, 7) + n; if (mo < 1) { mo = 12; y--; } if (mo > 12) { mo = 1; y++; } boardDay = `${y}-${z(mo)}-01`; } const el = document.querySelector('[data-mod="diary"]'); if (el) render(el); }
  });
  document.addEventListener("input", e => {
    if (!e.target.matches("[data-dyt]")) return;
    const ds = e.target.closest("[data-dyday]").dataset.dyday, v = e.target.value.slice(0, 140);
    clearTimeout(timer); timer = setTimeout(() => put(ds, { t: v }), 400);
  });
  document.addEventListener("change", e => { if (e.target.matches("[data-dyt]")) { clearTimeout(timer); put(e.target.closest("[data-dyday]").dataset.dyday, { t: e.target.value.slice(0, 140) }); YK.render(); } });
}
window.YadoMods = window.YadoMods || {};
window.YadoMods.diary = {
  mount(el) { bindOnce(); if (!el.contains(document.activeElement)) render(el); },
  /* その日の欄の中に、書く形を出す */
  dayHtml(ds) { bindOnce(); return editor(ds, "day"); },
  /* 月間・週のマスの隅に出す小さな印 */
  mark(ds) { const e = load().find(x => x.id === ds); return e ? `${e.w || ""}${e.m || ""}` : ""; },
  dayInfo() { return []; }
};
dispatchEvent(new Event("yadokari:modready"));
})();
