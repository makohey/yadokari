/* 部品：🏫 時間割（足した人の端末でだけ読み込む）
   曜日 × 何時間目 の表。マスを押して書く。授業でも、習い事・ジム・週のルーティンでも。
   データはこの端末の中だけ（yadokari.timetable）。外にはつながない */
(() => {
"use strict";
const KEY = "yadokari.timetable";
const PASTEL = ["#fde2e4", "#e2ece9", "#dfe7fd", "#fff1c1", "#e9dff7", "#d8f0e0", "#ffe5d0", "#d6eef8", "#f6e0ef", "#eef3d2"];
const load = () => {
  const v = getJ(KEY, []), t = Array.isArray(v) ? v.find(x => x && x.id === "main") : null;
  const o = t && typeof t === "object" ? t : {};
  return { id: "main", days: Array.isArray(o.days) && o.days.length ? o.days.filter(d => d >= 0 && d <= 6) : [1, 2, 3, 4, 5],
    periods: Math.min(10, Math.max(1, +o.periods || 6)), times: o.times && typeof o.times === "object" ? o.times : {},
    cells: o.cells && typeof o.cells === "object" ? o.cells : {}, at: o.at || 0 };
};
const save = t => { t.at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify([t])); return true; } catch (_) { alert("保存できませんでした（容量がいっぱいかも）"); return false; } };
const color = s => { let h = 0; for (const c of s) h = (h * 31 + c.codePointAt(0)) >>> 0; return PASTEL[h % PASTEL.length]; };
const dowOf = ds => new Date(ds + "T12:00:00Z").getUTCDay();
let sel = null, shape = false;

function render(el) {
  const t = load(), T = YK.t0(), today = dowOf(T);
  const cols = YK.weekOrder().filter(d => t.days.includes(d));
  const used = [...new Set(Object.values(t.cells).filter(Boolean))].slice(0, 24);
  let grid = `<div class="ttGrid" style="grid-template-columns:2.6em repeat(${cols.length},1fr)"><div></div>`
    + cols.map(d => `<div class="ttW${d === today ? " today" : ""}">${WD[d]}</div>`).join("");
  for (let p = 1; p <= t.periods; p++) {
    grid += `<div class="ttP"><b>${p}</b>${t.times[p] ? `<small>${esc(t.times[p])}</small>` : ""}</div>`;
    grid += cols.map(d => { const k = `${d}-${p}`, v = t.cells[k] || "";
      return `<button type="button" class="ttC${d === today ? " today" : ""}${sel === k ? " sel" : ""}" data-ttcell="${k}"${v ? ` style="background:${color(v)}"` : ""}>${esc(v)}</button>`; }).join("");
  }
  grid += "</div>";
  let bar = "";
  if (sel) {
    const [d, p] = sel.split("-").map(Number);
    bar = `<div class="ttBar"><div class="bkSub">${WD[d]}曜　${p}時間目${t.times[p] ? `（${esc(t.times[p])}）` : ""}</div>
      <div style="display:flex;gap:6px;margin-top:4px"><input data-ttin maxlength="16" value="${esc(t.cells[sel] || "")}" placeholder="例：国語・体育・ピアノ・ジム" style="flex:1;min-width:0;font-size:16px;padding:6px 8px;border:1px solid var(--line);border-radius:10px"><button type="button" class="main" data-ttset>入れる</button></div>
      ${used.length ? `<div class="ttChips">${used.map(u => `<button type="button" data-ttpick="${esc(u)}" style="background:${color(u)}">${esc(u)}</button>`).join("")}</div>` : ""}
      <div class="ctrl" style="margin-top:6px">${t.cells[sel] ? `<button type="button" data-ttclear style="font-size:12px;padding:3px 10px">このマスを空にする</button>` : ""}<button type="button" data-ttclose style="font-size:12px;padding:3px 10px">閉じる</button></div></div>`;
  }
  const form = shape ? `<div class="ttBar"><div class="bkSub">表の形</div>
      <div class="ttRow">曜日：${[1, 2, 3, 4, 5, 6, 0].map(d => `<button type="button" class="ttDay${t.days.includes(d) ? " on" : ""}" data-ttday="${d}">${WD[d]}</button>`).join("")}</div>
      <div class="ttRow">何時間目まで：<button type="button" data-ttper="-1">−</button><b style="min-width:1.6em;text-align:center">${t.periods}</b><button type="button" data-ttper="1">＋</button></div>
      <div class="bkSub" style="margin-top:6px">はじまる時刻（書かなくてもいい）</div>
      <div class="ttTimes">${[...Array(t.periods)].map((_, i) => `<label>${i + 1}<input data-tttime="${i + 1}" maxlength="11" value="${esc(t.times[i + 1] || "")}" placeholder="8:45"></label>`).join("")}</div>
      <div class="ctrl" style="margin-top:6px"><button type="button" data-ttwipe style="font-size:12px;padding:3px 10px;color:#c0504d">表を空にする</button><button type="button" data-ttshape style="font-size:12px;padding:3px 10px">閉じる</button></div></div>` : "";
  el.innerHTML = `<div class="sect" style="display:flex;justify-content:space-between;align-items:center"><span>🏫 時間割<span class="en">Timetable</span></span><button type="button" data-ttshape style="font-size:13px;padding:3px 12px">${shape ? "閉じる" : "⚙︎ 表の形"}</button></div>
    ${form}${grid}${bar}
    <p class="note" style="margin-top:6px">マスを押すと書けます。一度書いたものは下に並ぶので、次からは押すだけ。授業でも、習い事・ジム・週のルーティンでも。選んだ日のカードにも、その曜日の分が出ます。</p>`;
  if (sel) setTimeout(() => { const i = el.querySelector("[data-ttin]"); if (i && !i.value) i.focus(); }, 30);
}
function put(el, v) { const t = load(); v = String(v || "").trim().slice(0, 16); if (v) t.cells[sel] = v; else delete t.cells[sel]; save(t); sel = null; render(el); }
function onClick(e, el) {
  const c = e.target.closest("[data-ttcell]"); if (c) { sel = sel === c.dataset.ttcell ? null : c.dataset.ttcell; render(el); return; }
  if (e.target.closest("[data-ttset]")) { put(el, el.querySelector("[data-ttin]")?.value); return; }
  const pk = e.target.closest("[data-ttpick]"); if (pk) { put(el, pk.dataset.ttpick); return; }
  if (e.target.closest("[data-ttclear]")) { put(el, ""); return; }
  if (e.target.closest("[data-ttclose]")) { sel = null; render(el); return; }
  if (e.target.closest("[data-ttshape]")) { shape = !shape; render(el); return; }
  const dy = e.target.closest("[data-ttday]"); if (dy) { const t = load(), d = +dy.dataset.ttday; t.days = t.days.includes(d) ? t.days.filter(x => x !== d) : [...t.days, d]; if (!t.days.length) return; save(t); render(el); return; }
  const pr = e.target.closest("[data-ttper]"); if (pr) { const t = load(); t.periods = Math.min(10, Math.max(1, t.periods + +pr.dataset.ttper)); save(t); render(el); return; }
  if (e.target.closest("[data-ttwipe]")) { if (!confirm("時間割のマスを全部空にします。元には戻せません。いい？")) return; const t = load(); t.cells = {}; save(t); sel = null; render(el); }
}
window.YadoMods = window.YadoMods || {};
window.YadoMods.timetable = {
  mount(el) {
    if (!el.dataset.bound) {
      el.addEventListener("click", e => onClick(e, el));
      el.addEventListener("keydown", e => { if (e.target.matches("[data-ttin]") && e.key === "Enter" && !e.isComposing) { e.preventDefault(); el.querySelector("[data-ttset]")?.click(); } });
      el.addEventListener("change", e => { const i = e.target.closest("[data-tttime]"); if (!i) return; const t = load(), v = i.value.trim().slice(0, 11); if (v) t.times[i.dataset.tttime] = v; else delete t.times[i.dataset.tttime]; save(t); });
      el.dataset.bound = "1";
    }
    if (!(el.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))) render(el);
  },
  dayInfo(ds) {
    const t = load(), d = dowOf(ds); if (!t.days.includes(d)) return [];
    const l = []; for (let p = 1; p <= t.periods; p++) if (t.cells[`${d}-${p}`]) l.push(`${p}.${t.cells[`${d}-${p}`]}`);
    return l.length ? [`🏫 時間割：${l.join("　")}`] : [];
  }
};
dispatchEvent(new Event("yadokari:modready"));
})();
