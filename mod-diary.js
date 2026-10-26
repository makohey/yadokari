/* 部品：✏️ 1行日記・気分・天気（足した人の端末でだけ読み込む）
   1日1枚：天気マーク・気分マーク・1行。予報は取りに行かない（自分で選ぶ記録）。
   データはこの端末の中だけ（yadokari.diary）。外にはつながない */
(() => {
"use strict";
const KEY = "yadokari.diary";
const WEATHER = [["☀️", "晴れ"], ["🌤️", "晴れ時々くもり"], ["☁️", "くもり"], ["🌧️", "雨"], ["⛈️", "雷雨"], ["❄️", "雪"], ["🌫️", "霧"]];
const MOOD = [["😊", "いい"], ["🙂", "まあまあ"], ["😐", "ふつう"], ["😢", "かなしい"], ["😠", "いらいら"], ["😴", "つかれた"]];
/* 自分で足したマーク（天気・気分それぞれ最大6つ）。この端末で覚える（控えにも入る） */
const MARK_KEY = "yadokari.diary.marks", MARK_MAX = 6;
const getMarks = () => { const v = getJ(MARK_KEY, {}); return { w: Array.isArray(v?.w) ? v.w.slice(0, MARK_MAX) : [], m: Array.isArray(v?.m) ? v.m.slice(0, MARK_MAX) : [] }; };
const setMarks = v => { try { localStorage.setItem(MARK_KEY, JSON.stringify(v)); } catch (_) {} };
const wList = () => [...WEATHER, ...getMarks().w.map(k => [k, "自分のマーク"])];
const mList = () => [...MOOD, ...getMarks().m.map(k => [k, "自分のマーク"])];
const oneEmoji = s => { try { const g = [...new Intl.Segmenter("ja", { granularity: "grapheme" }).segment(s)]; return g.length === 1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(s); } catch (_) { return /^\p{Extended_Pictographic}/u.test(s) && [...s].length <= 4; } };
let markEdit = false;
const load = () => { const v = getJ(KEY, []); return Array.isArray(v) ? v.filter(x => x && x.id) : []; };
const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (_) { alert("保存できませんでした（容量がいっぱいかも）"); return false; } };
const get = ds => load().find(x => x.id === ds) || { id: ds };
function put(ds, patch) {
  const l = load(); let x = l.find(e => e.id === ds);
  if (!x) { x = { id: ds }; l.push(x); }
  Object.assign(x, patch, { at: Date.now() });
  save(l.filter(e => e.w || e.m || (e.t && e.t.trim())));
}
let boardDay = null;
const editT = new Set(); /* 1行日記を直している日 */
/* マークの並び。自分で足したものは、整える時だけ ✕ がつく。＋ は部品の板にだけ出す */
function row(kind, list, cur, where) {
  const mine = getMarks()[kind], attr = kind === "w" ? "data-dyw" : "data-dym";
  const baseLen = (kind === "w" ? WEATHER : MOOD).length;
  return list.map(([k, n], i) => { const own = i >= baseLen;
      return `<button type="button" class="dyB${cur === k ? " on" : ""}${own ? " own" : ""}" ${markEdit && own && where === "board" ? `data-dydel="${kind}|${k}"` : `${attr}="${k}"`} title="${n}" aria-label="${n}">${k}${markEdit && own && where === "board" ? '<span class="dyX">✕</span>' : ""}</button>`; }).join("")
    + (where === "board" && mine.length < MARK_MAX ? `<button type="button" class="dyB dyAdd" data-dyadd="${kind}" aria-label="マークを足す">＋</button>` : "");
}
/* その日の欄・部品の板の両方で使う、1日分の書く形 */
function editor(ds, where) {
  const e = get(ds);
  return `<div class="dyBox" data-dyday="${esc(ds)}" data-dywhere="${where}">
    <div class="dyRow"><span class="dyL">天気<span class="en">Weather</span></span>${row("w", wList(), e.w, where)}</div>
    <div class="dyRow"><span class="dyL">気分<span class="en">Mood</span></span>${row("m", mList(), e.m, where)}</div>
    ${e.t && !editT.has(ds)
      ? `<div class="dyShow"><span class="dyTxt">📝 ${esc(e.t)}</span><button type="button" data-dyedit aria-label="直す">✏️</button></div>`
      : `<div class="dyIn"><input class="dyT" data-dyt maxlength="140" value="${esc(e.t || "")}" placeholder="1行日記（${+ds.slice(5, 7)}/${+ds.slice(8, 10)}）" enterkeyhint="done"><button type="button" class="main" data-dysave>書く</button></div>`}
  </div>`;
}
function counts(ym) {
  const l = load().filter(e => e.id.startsWith(ym)), c = (arr, f) => arr.map(([k]) => [k, l.filter(e => e[f] === k).length]).filter(x => x[1]);
  return { w: c(wList(), "w"), m: c(mList(), "m"), n: l.filter(e => e.t && e.t.trim()).length };
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
    ${getMarks().w.length || getMarks().m.length ? `<div style="text-align:right;margin-top:2px"><button type="button" data-dymarkedit style="font-size:11.5px;padding:2px 10px">${markEdit ? "できた" : "自分のマークを外す"}</button></div>` : ""}
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
    const ad = e.target.closest("[data-dyadd]");
    if (ad) {
      const kind = ad.dataset.dyadd, v = (prompt(`${kind === "w" ? "天気" : "気分"}のマークにする絵文字をひとつ（最大${MARK_MAX}つまで足せます）`) || "").trim();
      if (!v) return;
      if (!oneEmoji(v)) { alert("絵文字をひとつだけ入れてね"); return; }
      const mk = getMarks(), base = (kind === "w" ? WEATHER : MOOD).map(x => x[0]);
      if (base.includes(v) || mk[kind].includes(v)) { alert("そのマークはもうあります"); return; }
      mk[kind] = [...mk[kind], v].slice(0, MARK_MAX); setMarks(mk); YK.render(); return;
    }
    const dd = e.target.closest("[data-dydel]");
    if (dd) { const [kind, k] = dd.dataset.dydel.split("|"); if (!confirm(`マーク ${k} を外します（前に選んだ日の記録は残ります）。いい？`)) return; const mk = getMarks(); mk[kind] = mk[kind].filter(x => x !== k); setMarks(mk); if (!mk.w.length && !mk.m.length) markEdit = false; YK.render(); return; }
    if (e.target.closest("[data-dymarkedit]")) { markEdit = !markEdit; YK.render(); return; }
    const sv = e.target.closest("[data-dysave]"); if (sv) { const inp = sv.closest("[data-dyday]").querySelector("[data-dyt]"); if (inp) commit(inp); return; }
    const ed = e.target.closest("[data-dyedit]"); if (ed) { const ds = ed.closest("[data-dyday]").dataset.dyday; editT.add(ds); YK.render(); setTimeout(() => { const i = document.querySelector(`[data-dyday="${ds}"] [data-dyt]`); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 30); return; }
    const pk = e.target.closest("[data-dypick]"); if (pk) { boardDay = pk.dataset.dypick; const el = document.querySelector('[data-mod="diary"]'); if (el) render(el); return; }
    const nv = e.target.closest("[data-dym-nav]");
    if (nv) { const n = +nv.dataset.dymNav, T = YK.t0(); if (n === 0) boardDay = T; else { let y = +boardDay.slice(0, 4), mo = +boardDay.slice(5, 7) + n; if (mo < 1) { mo = 12; y--; } if (mo > 12) { mo = 1; y++; } boardDay = `${y}-${z(mo)}-01`; } const el = document.querySelector('[data-mod="diary"]'); if (el) render(el); }
  });
  /* 書く：「書く」・改行（完了）・欄から離れた時。しまったら入力欄はたたんで、書いた1行を見せる */
  const commit = inp => { const ds = inp.closest("[data-dyday]").dataset.dyday; put(ds, { t: inp.value.trim().slice(0, 140) }); editT.delete(ds); inp.blur(); YK.render(); };
  document.addEventListener("keydown", e => { if (e.target.matches("[data-dyt]") && e.key === "Enter" && !e.isComposing) { e.preventDefault(); commit(e.target); } });
  document.addEventListener("change", e => { if (e.target.matches("[data-dyt]")) commit(e.target); });
}
window.YadoMods = window.YadoMods || {};
window.YadoMods.diary = {
  mount(el) { bindOnce(); if (!(el.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))) render(el); },
  /* その日の欄の中に、書く形を出す */
  dayHtml(ds) { bindOnce(); return editor(ds, "day"); },
  /* 月間・週のマスの隅に出す小さな印 */
  mark(ds) { const e = load().find(x => x.id === ds); return e ? `${e.w || ""}${e.m || ""}` : ""; },
  dayInfo() { return []; }
};
dispatchEvent(new Event("yadokari:modready"));
})();
