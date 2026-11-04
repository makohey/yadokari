/* 部品：🏫 時間割（足した人の端末でだけ読み込む）
   小学生から大学生まで。曜日（月〜土）× 何時間目（4〜8）の表。マスを押して、科目・教室・先生・メモを書く。
   科目ごとに色と持ち物を決められる。宿題は いつもの「やること」へつなぐ。
   データはこの端末の中だけ（yadokari.timetable）。外にはつながない */
(() => {
"use strict";
const KEY = "yadokari.timetable";
const PASTEL = ["#fde2e4", "#ffe5d0", "#fff1c1", "#eef3d2", "#d8f0e0", "#e2ece9", "#d6eef8", "#dfe7fd", "#e9dff7", "#f6e0ef", "#eee6dc", "#e8e8e8"];
const DAYS = [1, 2, 3, 4, 5, 6], PMIN = 4, PMAX = 8;
const str = (v, n) => typeof v === "string" ? v.trim().slice(0, n) : "";
const load = () => {
  const v = getJ(KEY, []), o0 = Array.isArray(v) ? v.find(x => x && x.id === "main") : null, o = o0 && typeof o0 === "object" ? o0 : {};
  const days = Array.isArray(o.days) ? o.days.filter(d => DAYS.includes(d)) : [];
  const times = {}; for (const [p, x] of Object.entries(o.times || {})) times[p] = typeof x === "string" ? { s: str(x, 5), e: "" } : { s: str(x && x.s, 5), e: str(x && x.e, 5) };
  const cells = {}; for (const [k, x] of Object.entries(o.cells || {})) { const c = typeof x === "string" ? { s: x } : x || {}; if (str(c.s, 16)) cells[k] = { s: str(c.s, 16), r: str(c.r, 20), t: str(c.t, 20), m: str(c.m, 60) }; }
  return { id: "main", days: days.length ? days : [1, 2, 3, 4, 5], periods: Math.min(PMAX, Math.max(PMIN, +o.periods || 6)),
    lunch: Math.min(PMAX - 1, Math.max(0, +o.lunch || 0)), times, cells,
    subj: o.subj && typeof o.subj === "object" ? o.subj : {}, at: o.at || 0 };
};
const save = t => { t.at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify([t])); return true; } catch (_) { alert("保存できませんでした（容量がいっぱいかも）"); return false; } };
/* 色：自分で選んだ色が先。選んでいない科目は、まだ誰も使っていない色を書いた順に配る（同じ色がかぶりにくい） */
const colorOf = (t, s) => {
  if (t.subj[s] && t.subj[s].c) return t.subj[s].c;
  const mine = new Set(Object.values(t.subj).map(x => x && x.c).filter(Boolean)), free = PASTEL.slice(0, -2).filter(h => !mine.has(h));
  const auto = [...new Set(Object.values(t.cells).map(x => x.s))].filter(x => !(t.subj[x] && t.subj[x].c)), i = auto.indexOf(s);
  return (free.length ? free : PASTEL)[Math.max(0, i) % (free.length || PASTEL.length)];
};
const dowOf = ds => new Date(ds + "T12:00:00Z").getUTCDay();
const md = ds => `${+ds.slice(5, 7)}/${+ds.slice(8, 10)}`;
const tm = x => x && x.s ? `${x.s}${x.e ? "〜" + x.e : ""}` : "";
let sel = null, shape = false;

function cellBar(t) {
  const [d, p] = sel.split("-").map(Number), c = t.cells[sel] || { s: "", r: "", t: "", m: "" };
  const used = [...new Set(Object.values(t.cells).map(x => x.s))].slice(0, 30), sj = c.s ? (t.subj[c.s] || {}) : null;
  const inp = (k, v, ph, n) => `<input data-ttf="${k}" maxlength="${n}" value="${esc(v)}" placeholder="${ph}" style="flex:1;min-width:0;font-size:16px;padding:6px 8px;border:1px solid var(--line);border-radius:10px">`;
  return `<div class="ttBar"><div class="bkSub">${WD[d]}曜　${p}時間目${tm(t.times[p]) ? `（${esc(tm(t.times[p]))}）` : ""}</div>
    <div class="ttRow">${inp("s", c.s, "科目（例：国語・数学・英語）", 16)}</div>
    ${used.length ? `<div class="ttChips">${used.map(u => `<button type="button" data-ttpick="${esc(u)}" style="background:${colorOf(t, u)}">${esc(u)}</button>`).join("")}</div>` : ""}
    <div class="ttRow">${inp("r", c.r, "教室", 20)}${inp("t", c.t, "先生", 20)}</div>
    <div class="ttRow">${inp("m", c.m, "このコマのメモ（なくてもOK）", 60)}</div>
    <div class="ctrl" style="margin-top:6px"><button type="button" class="main" data-ttset>入れる</button>${c.s ? `<button type="button" data-tthw style="font-size:12px;padding:3px 10px">📝 この科目のやることを入れる</button><button type="button" data-ttclear style="font-size:12px;padding:3px 10px">このマスを空にする</button>` : ""}<button type="button" data-ttclose style="font-size:12px;padding:3px 10px">閉じる</button></div>
    ${sj ? `<div class="bkSub" style="margin-top:8px">「${esc(c.s)}」の色と持ち物（この科目のマス全部に効きます）</div>
      <div class="ttPal">${PASTEL.map(h => `<button type="button" data-ttcol="${h}" aria-label="色" style="background:${h}"${colorOf(t, c.s) === h ? ' class="on"' : ""}></button>`).join("")}</div>
      <div class="ttRow"><input data-ttbring maxlength="30" value="${esc(sj.b || "")}" placeholder="持ち物（例：体操服・リコーダー）" style="flex:1;min-width:0;font-size:16px;padding:6px 8px;border:1px solid var(--line);border-radius:10px"></div>` : ""}
  </div>`;
}
function shapeBar(t) {
  const P = [...Array(t.periods)].map((_, i) => i + 1);
  return `<div class="ttBar"><div class="bkSub">表の形</div>
    <div class="ttRow">曜日：${DAYS.map(d => `<button type="button" class="ttDay${t.days.includes(d) ? " on" : ""}" data-ttday="${d}">${WD[d]}</button>`).join("")}</div>
    <div class="ttRow">何時間目まで：<button type="button" data-ttper="-1">−</button><b style="min-width:1.6em;text-align:center">${t.periods}</b><button type="button" data-ttper="1">＋</button><span class="bkSub">（${PMIN}〜${PMAX}）</span></div>
    <div class="ttRow">昼休み：<button type="button" data-ttlunch="-1">−</button><b style="min-width:4.5em;text-align:center">${t.lunch ? `${t.lunch}時間目のあと` : "なし"}</b><button type="button" data-ttlunch="1">＋</button></div>
    <div class="bkSub" style="margin-top:6px">時刻（はじまり〜おわり。書かなくてもOK）</div>
    <div class="ttTimes">${P.map(p => `<label><b>${p}</b><input type="time" data-tttime="${p}" data-k="s" value="${esc((t.times[p] || {}).s || "")}">〜<input type="time" data-tttime="${p}" data-k="e" value="${esc((t.times[p] || {}).e || "")}"></label>`).join("")}</div>
    <div class="ctrl" style="margin-top:6px"><button type="button" data-ttwipe style="font-size:12px;padding:3px 10px;color:#c0504d">表を空にする</button><button type="button" data-ttshape style="font-size:12px;padding:3px 10px">閉じる</button></div></div>`;
}
function render(el) {
  const t = load(), today = dowOf(YK.t0()), cols = YK.weekOrder().filter(d => t.days.includes(d));
  let grid = `<div class="ttGrid" style="grid-template-columns:2.4em repeat(${cols.length},1fr)"><div></div>`
    + cols.map(d => `<div class="ttW${d === today ? " today" : ""}">${WD[d]}</div>`).join("");
  for (let p = 1; p <= t.periods; p++) {
    const x = t.times[p];
    grid += `<div class="ttP"><b>${p}</b>${x && x.s ? `<small>${esc(x.s)}</small>` : ""}</div>`;
    grid += cols.map(d => { const k = `${d}-${p}`, c = t.cells[k];
      return `<button type="button" class="ttC${d === today ? " today" : ""}${sel === k ? " sel" : ""}" data-ttcell="${k}"${c ? ` style="background:${colorOf(t, c.s)}"` : ""}>${c ? `${esc(c.s)}${c.r ? `<small>${esc(c.r)}</small>` : ""}` : ""}</button>`; }).join("");
    if (t.lunch === p && p < t.periods) grid += `<div class="ttL" style="grid-column:1 / -1">昼休み</div>`;
  }
  grid += "</div>";
  el.innerHTML = `<div class="sect" style="display:flex;justify-content:space-between;align-items:center"><span>🏫 時間割<span class="en">Timetable</span></span><button type="button" data-ttshape style="font-size:13px;padding:3px 12px">${shape ? "閉じる" : "⚙︎ 表の形"}</button></div>
    ${shape ? shapeBar(t) : ""}${grid}${sel ? cellBar(t) : ""}
    <p class="note" style="margin-top:6px">マスを押すと書けます。一度書いた科目は丸いボタンで並ぶので、次からは押すだけ。選んだ日のカードに、その日の時間割と持ち物が出ます。</p>`;
  if (sel) setTimeout(() => { const i = el.querySelector('[data-ttf="s"]'); if (i && !i.value) i.focus(); }, 30);
}
const val = (el, k) => (el.querySelector(`[data-ttf="${k}"]`) || {}).value || "";
function put(el, subject) {
  const t = load(), s = str(subject, 16);
  if (s) t.cells[sel] = { s, r: str(val(el, "r"), 20), t: str(val(el, "t"), 20), m: str(val(el, "m"), 60) }; else delete t.cells[sel];
  save(t); sel = null; render(el);
}
/* 宿題：次のこの科目の日（明日から数えて）を頭につけて、いつもの入力欄へ。押すまでは何も入らない */
function homework(el) {
  const t = load(), c = t.cells[sel]; if (!c) return;
  const d = +sel.split("-")[0]; let ds = YK.addDays(YK.t0(), 1); for (let i = 0; i < 7 && dowOf(ds) !== d; i++) ds = YK.addDays(ds, 1);
  const box = document.getElementById("pIn"); if (!box) return;
  box.value = `${md(ds)} ${c.s}の宿題 `; box.dispatchEvent(new Event("input", { bubbles: true }));
  sel = null; render(el);
  box.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }, 300);
}
function onClick(e, el) {
  const q = s => e.target.closest(s);
  const c = q("[data-ttcell]"); if (c) { sel = sel === c.dataset.ttcell ? null : c.dataset.ttcell; shape = false; render(el); return; }
  if (q("[data-ttset]")) { put(el, val(el, "s")); return; }
  const pk = q("[data-ttpick]"); if (pk) { const i = el.querySelector('[data-ttf="s"]'); if (i) i.value = pk.dataset.ttpick; put(el, pk.dataset.ttpick); return; }
  if (q("[data-tthw]")) { homework(el); return; }
  if (q("[data-ttclear]")) { put(el, ""); return; }
  if (q("[data-ttclose]")) { sel = null; render(el); return; }
  const co = q("[data-ttcol]"); if (co) { const t = load(), s = (t.cells[sel] || {}).s; if (!s) return; (t.subj[s] ||= {}).c = co.dataset.ttcol; save(t); render(el); return; }
  if (q("[data-ttshape]")) { shape = !shape; sel = null; render(el); return; }
  const dy = q("[data-ttday]"); if (dy) { const t = load(), d = +dy.dataset.ttday; const n = t.days.includes(d) ? t.days.filter(x => x !== d) : [...t.days, d]; if (!n.length) return; t.days = n; save(t); render(el); return; }
  const pr = q("[data-ttper]"); if (pr) { const t = load(); t.periods = Math.min(PMAX, Math.max(PMIN, t.periods + +pr.dataset.ttper)); if (t.lunch >= t.periods) t.lunch = 0; save(t); render(el); return; }
  const lu = q("[data-ttlunch]"); if (lu) { const t = load(); t.lunch = Math.min(t.periods - 1, Math.max(0, t.lunch + +lu.dataset.ttlunch)); save(t); render(el); return; }
  if (q("[data-ttwipe]")) { if (!confirm("時間割のマスを全部空にします（表の形・色・持ち物は残ります）。元には戻せません。いい？")) return; const t = load(); t.cells = {}; save(t); sel = null; render(el); }
}
function onChange(e) {
  const ti = e.target.closest("[data-tttime]");
  if (ti) { const t = load(), p = ti.dataset.tttime, x = t.times[p] || { s: "", e: "" }; x[ti.dataset.k] = str(ti.value, 5); if (x.s || x.e) t.times[p] = x; else delete t.times[p]; save(t); return; }
  const b = e.target.closest("[data-ttbring]");
  if (b) { const t = load(), s = (t.cells[sel] || {}).s; if (!s) return; (t.subj[s] ||= {}).b = str(b.value, 30); save(t); }
}
window.YadoMods = window.YadoMods || {};
window.YadoMods.timetable = {
  mount(el) {
    if (!el.dataset.bound) {
      el.addEventListener("click", e => onClick(e, el));
      el.addEventListener("keydown", e => { if (e.target.matches("[data-ttf]") && e.key === "Enter" && !e.isComposing) { e.preventDefault(); el.querySelector("[data-ttset]")?.click(); } });
      el.addEventListener("change", onChange);
      el.dataset.bound = "1";
    }
    if (!(el.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))) render(el);
  },
  dayInfo(ds) {
    const t = load(), d = dowOf(ds); if (!t.days.includes(d)) return [];
    const l = [], bring = [];
    for (let p = 1; p <= t.periods; p++) { const c = t.cells[`${d}-${p}`]; if (!c) continue; l.push(`${p}.${c.s}${c.r ? `（${c.r}）` : ""}`); const b = (t.subj[c.s] || {}).b; if (b && !bring.includes(b)) bring.push(b); }
    if (!l.length) return [];
    return [`🏫 時間割：${l.join("　")}`].concat(bring.length ? [`🎒 持ち物：${bring.join("・")}`] : []);
  }
};
dispatchEvent(new Event("yadokari:modready"));
})();
