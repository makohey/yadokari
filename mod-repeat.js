/* 部品：🔁 繰り返しの予定（足した人の端末でだけ読み込む）
   「毎週火・金 ゴミ出し」「毎月25日 給料日」「毎年10/19 記念日」のように、1回決めれば毎回出る。
   予定そのものは増やさず、見る時にコード君が日付を計算して並べる（だから消す・直すは決まり1つだけ）。
   データはこの端末の中だけ（yadokari.repeat）。外にはつながない */
(() => {
"use strict";
const KEY = "yadokari.repeat";
const load = () => { const v = getJ(KEY, []); return Array.isArray(v) ? v.filter(r => r && r.id && r.what) : []; };
const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (_) { alert("保存できませんでした（容量がいっぱいかも）"); return false; } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const KINDS_R = [["daily", "毎日"], ["weekly", "毎週"], ["monthly", "毎月（日にち）"], ["nth", "毎月（第○曜日）"], ["yearly", "毎年"]];
const dowOf = ds => new Date(ds + "T12:00:00Z").getUTCDay();
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
let adding = false, editing = null;

function matches(r, ds) {
  if (r.from && ds < r.from) return false;
  if (r.until && ds > r.until) return false;
  if ((r.skip || []).includes(ds)) return false;
  const y = +ds.slice(0, 4), m = +ds.slice(5, 7), d = +ds.slice(8, 10), w = dowOf(ds);
  switch (r.kind) {
    case "daily": return true;
    case "weekly": return (r.dows || []).includes(w);
    case "monthly": { const want = +r.dom || 0, ld = lastDay(y, m); return want === 0 ? d === ld : (want > ld ? d === ld : d === want); } /* 31日の月がない時は月末に */
    case "nth": { if (w !== +r.dow) return false; const n = +r.nth; return n === 5 ? d + 7 > lastDay(y, m) : Math.ceil(d / 7) === n; } /* 5＝最後の */
    case "yearly": return ds.slice(5) === r.md;
    default: return false;
  }
}
function expand(from, to) {
  const rules = load(), out = [];
  if (!rules.length || !from || !to || from > to) return out;
  let ds = from, guard = 0;
  while (ds <= to && guard++ < 800) {
    for (const r of rules) if (matches(r, ds)) out.push({ id: `rep-${r.id}-${ds}`, rep: r.id, repText: describe(r), kind: "予定", date: ds, time: r.time || "", part: "", what: r.what, place: r.place || "", activity: r.activity || "その他", memo: "", src: r.what, made: 0 });
    ds = YK.addDays(ds, 1);
  }
  return out;
}
function describe(r) {
  const W = i => WD[i];
  const how = r.kind === "daily" ? "毎日"
    : r.kind === "weekly" ? `毎週 ${(r.dows || []).slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(W).join("・")}`
    : r.kind === "monthly" ? (+r.dom === 0 ? "毎月 月末" : `毎月 ${r.dom}日`)
    : r.kind === "nth" ? `毎月 ${+r.nth === 5 ? "最後の" : `第${r.nth}`}${W(+r.dow)}曜日`
    : r.kind === "yearly" ? `毎年 ${+r.md.slice(0, 2)}/${+r.md.slice(3, 5)}` : "";
  return how + (r.time ? ` ${+r.time.slice(0, 2)}:${r.time.slice(3, 5)}` : "");
}
function nextDates(r, n = 3) {
  const out = []; let ds = YK.t0(), g = 0;
  while (out.length < n && g++ < 800) { if (matches(r, ds)) out.push(ds); ds = YK.addDays(ds, 1); }
  return out;
}
function formHtml(r) {
  const k = r.kind || "weekly", acts_ = typeof acts === "function" ? acts() : ["その他"];
  const dows = r.dows || [dowOf(YK.t0())];
  return `<div class="bkForm" data-rpform="${esc(r.id || "")}">
    <div class="pf"><span>何</span><input data-rf="what" value="${esc(r.what || "")}" placeholder="例：ゴミ出し・給料日・記念日"></div>
    <div class="pf"><span>くり返し</span><select data-rf="kind">${KINDS_R.map(([v, n]) => `<option value="${v}"${v === k ? " selected" : ""}>${n}</option>`).join("")}</select></div>
    <div class="rpOpt" data-for="weekly"${k === "weekly" ? "" : " hidden"}><div class="pf"><span>曜日</span><span class="rpDows">${YK.weekOrder().map(i => `<button type="button" class="dyB${dows.includes(i) ? " on" : ""}" data-rdow="${i}" style="font-size:14px;min-width:34px">${WD[i]}</button>`).join("")}</span></div></div>
    <div class="rpOpt" data-for="monthly"${k === "monthly" ? "" : " hidden"}><div class="pf"><span>日にち</span><select data-rf="dom">${[...Array(31)].map((_, i) => `<option value="${i + 1}"${+r.dom === i + 1 ? " selected" : ""}>${i + 1}日</option>`).join("")}<option value="0"${+r.dom === 0 && r.kind === "monthly" ? " selected" : ""}>月末</option></select></div></div>
    <div class="rpOpt" data-for="nth"${k === "nth" ? "" : " hidden"}><div class="pf"><span>第○</span><span style="display:flex;gap:6px"><select data-rf="nth">${[1, 2, 3, 4, 5].map(n => `<option value="${n}"${+r.nth === n ? " selected" : ""}>${n === 5 ? "最後の" : `第${n}`}</option>`).join("")}</select><select data-rf="dow">${YK.weekOrder().map(i => `<option value="${i}"${+r.dow === i ? " selected" : ""}>${WD[i]}曜日</option>`).join("")}</select></span></div></div>
    <div class="rpOpt" data-for="yearly"${k === "yearly" ? "" : " hidden"}><div class="pf"><span>月日</span><input type="date" data-rf="yday" value="${esc(r.md ? `${YK.t0().slice(0, 4)}-${r.md}` : YK.t0())}"></div></div>
    <div class="pf"><span>時刻</span><span style="display:flex;gap:6px"><input type="time" data-rf="time" value="${esc(r.time || "")}" style="flex:1"><button type="button" data-rtclear style="flex:0 0 auto">なし</button></span></div>
    <div class="pf"><span>すること</span><select data-rf="activity">${acts_.map(a => `<option${a === (r.activity || "その他") ? " selected" : ""}>${esc(a)}</option>`).join("")}</select></div>
    <div class="pf"><span>始まり</span><input type="date" data-rf="from" value="${esc(r.from || YK.t0())}"></div>
    <div class="pf"><span>終わり</span><input type="date" data-rf="until" value="${esc(r.until || "")}" placeholder="なくてもOK"></div>
    <div class="ctrl"><button type="button" class="main" data-rpsave>入れる</button><button type="button" data-rpcancel>やめる</button>${r.id ? `<button type="button" data-rpdel="${esc(r.id)}" style="margin-left:auto;color:#c0504d">消す</button>` : ""}</div>
  </div>`;
}
function render(el) {
  const rules = load();
  el.innerHTML = `<div class="sect" style="display:flex;justify-content:space-between;align-items:center"><span>🔁 繰り返しの予定<span class="en">Repeat</span></span><button type="button" data-rpadd style="font-size:13px;padding:3px 12px">＋ 足す</button></div>
    ${adding ? formHtml({}) : ""}
    ${rules.length ? rules.map(r => editing === r.id ? formHtml(r) : `<div class="bkCard" style="cursor:default"><div class="bkTop"><div class="bkT"><b>${esc(r.what)}</b> <small>${esc(describe(r))}</small></div><button type="button" data-rpedit="${esc(r.id)}" style="flex:0 0 auto;padding:0 6px;border:0;background:none">✏️</button></div>
      <div class="bkSub">次は ${nextDates(r).map(d => esc(YK.HDF(d))).join("・") || "（もうありません）"}${r.until ? `　〜${esc(YK.HDF(r.until))}まで` : ""}${(r.skip || []).length ? `　外した日 ${r.skip.length}` : ""}</div></div>`).join("")
      : `<div class="empty">まだありません。「＋ 足す」から、毎週のゴミ出しや毎月の給料日などを入れてね</div>`}
    <p class="note" style="margin-top:6px">1回決めると、カレンダー・週・今日に 🔁 つきで毎回出ます。ある日だけ休む時は、その日の欄の「この日だけ外す」を押します。数える（出勤の日数など）にも入ります。</p>`;
}
function readForm(f) {
  const v = k => (f.querySelector(`[data-rf="${k}"]`)?.value || "").trim();
  const kind = v("kind"), o = { what: v("what").slice(0, 60), kind, time: v("time"), activity: v("activity") || "その他", from: v("from") || YK.t0(), until: v("until") };
  if (kind === "weekly") o.dows = [...f.querySelectorAll("[data-rdow].on")].map(b => +b.dataset.rdow);
  if (kind === "monthly") o.dom = +v("dom");
  if (kind === "nth") { o.nth = +v("nth"); o.dow = +v("dow"); }
  if (kind === "yearly") o.md = (v("yday") || YK.t0()).slice(5);
  return o;
}
function onClick(e, el) {
  if (e.target.closest("[data-rpadd]")) { adding = !adding; editing = null; render(el); setTimeout(() => el.querySelector('[data-rf="what"]')?.focus(), 30); return; }
  if (e.target.closest("[data-rpcancel]")) { adding = false; editing = null; render(el); return; }
  const dw = e.target.closest("[data-rdow]"); if (dw) { dw.classList.toggle("on"); return; }
  if (e.target.closest("[data-rtclear]")) { const t = e.target.closest(".bkForm").querySelector('[data-rf="time"]'); if (t) t.value = ""; return; }
  const ed = e.target.closest("[data-rpedit]"); if (ed) { editing = ed.dataset.rpedit; adding = false; render(el); return; }
  if (e.target.closest("[data-rpsave]")) {
    const f = e.target.closest(".bkForm"), o = readForm(f);
    if (!o.what) { alert("何の予定か入れてね"); return; }
    if (o.kind === "weekly" && !o.dows.length) { alert("曜日を1つ以上選んでね"); return; }
    if (o.until && o.until < o.from) { alert("終わりが始まりより前になっています"); return; }
    const l = load(), id = f.dataset.rpform;
    if (id) { const r = l.find(x => x.id === id); if (r) { for (const k of ["dows", "dom", "nth", "dow", "md"]) delete r[k]; Object.assign(r, o); } }
    else l.push({ id: uid(), made: Date.now(), skip: [], ...o });
    save(l); adding = false; editing = null; render(el); YK.render(); return;
  }
  const dl = e.target.closest("[data-rpdel]");
  if (dl) { if (!confirm("この繰り返しを消します。カレンダーからも全部消えます。いい？")) return; save(load().filter(x => x.id !== dl.dataset.rpdel)); editing = null; render(el); YK.render(); }
}
/* その日の欄などの「この日だけ外す」（ページ全体で受ける） */
function bindOnce() {
  if (window.__rpBound) return; window.__rpBound = true;
  document.addEventListener("click", e => {
    const sk = e.target.closest("[data-repskip]"); if (!sk) return;
    const [id, ds] = sk.dataset.repskip.split("|"), l = load(), r = l.find(x => x.id === id); if (!r) return;
    if (!confirm(`「${r.what}」を ${YK.HDF(ds)} だけ外します。いい？`)) return;
    r.skip = [...new Set([...(r.skip || []), ds])].sort(); save(l); YK.render();
  });
  document.addEventListener("change", e => {
    if (!e.target.matches('[data-rf="kind"]')) return;
    const f = e.target.closest(".bkForm"); f.querySelectorAll(".rpOpt").forEach(o => o.hidden = o.dataset.for !== e.target.value);
  });
}
window.YadoMods = window.YadoMods || {};
window.YadoMods.repeat = {
  mount(el) { bindOnce(); if (!el.dataset.bound) { el.addEventListener("click", e => onClick(e, el)); el.dataset.bound = "1"; } if (!el.contains(document.activeElement) || !(adding || editing)) render(el); },
  expand, dayInfo() { return []; }
};
dispatchEvent(new Event("yadokari:modready"));
})();
