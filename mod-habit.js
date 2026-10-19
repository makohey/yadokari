/* 部品：✅ ハビットトラッカー（足した人の端末でだけ読み込む）
   習慣ごとに、日付のマスを押してチェック。続いた日数・今月の回数はコード君が数える。
   データはこの端末の中だけ（yadokari.habits）。外にはつながない */
(() => {
"use strict";
const KEY = "yadokari.habits";
const load = () => { const v = getJ(KEY, []); return Array.isArray(v) ? v.filter(h => h && h.id) : []; };
const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (_) { alert("保存できませんでした（容量がいっぱいかも）"); return false; } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let wk = null, open = null, adding = false, editing = null;

function streak(h, T) {
  const set = new Set(h.days || []); let n = 0, d = T;
  if (!set.has(d)) d = YK.addDays(d, -1); /* 今日まだでも、昨日まで続いていれば数える */
  while (set.has(d)) { n++; d = YK.addDays(d, -1); }
  return n;
}
function best(h) {
  const ds = [...new Set(h.days || [])].sort(); let b = 0, c = 0, prev = null;
  for (const d of ds) { c = prev && YK.addDays(prev, 1) === d ? c + 1 : 1; b = Math.max(b, c); prev = d; }
  return b;
}
function monthGrid(h, T) {
  const y = +T.slice(0, 4), m = +T.slice(5, 7), days = new Date(Date.UTC(y, m, 0)).getUTCDate(), set = new Set(h.days || []);
  const lead = YK.leadOf(new Date(Date.UTC(y, m - 1, 1)).getUTCDay());
  let cells = YK.weekOrder().map(i => `<div class="hbW">${WD[i]}</div>`).join("") + "<div></div>".repeat(lead);
  for (let d = 1; d <= days; d++) { const ds = `${y}-${z(m)}-${z(d)}`; cells += `<button type="button" class="hbM${set.has(ds) ? " on" : ""}${ds === T ? " today" : ""}${ds > T ? " fut" : ""}" data-hbtog="${esc(h.id)}" data-d="${ds}">${d}</button>`; }
  return `<div class="hbGrid">${cells}</div>`;
}
function render(el) {
  const T = YK.t0(); if (!wk) wk = YK.weekOf(T);
  const days = [...Array(7)].map((_, i) => YK.addDays(wk, i)), list = load().filter(h => !h.archived);
  const ym = T.slice(0, 7), last = days[6];
  const rows = list.map(h => {
    const set = new Set(h.days || []), mon = (h.days || []).filter(d => d.startsWith(ym)).length, st = streak(h, T);
    if (editing === h.id) return `<div class="hbRow"><div style="display:flex;gap:6px;width:100%"><input data-hbname value="${esc(h.name)}" maxlength="20" style="flex:1;min-width:0;font-size:16px;padding:5px 8px;border:1px solid var(--line);border-radius:10px"><button type="button" class="main" data-hbren="${esc(h.id)}">直す</button><button type="button" data-hbdel="${esc(h.id)}" style="color:#c0504d">消す</button><button type="button" data-hbcancel>やめる</button></div></div>`;
    return `<div class="hbRow">
      <div class="hbHead"><button type="button" class="hbName" data-hbopen="${esc(h.id)}">${esc(h.name)}</button><span class="hbStat">🔥 ${st}日続いている　今月 ${mon}回</span></div>
      <div class="hbWeek">${days.map(d => `<button type="button" class="hbDot${set.has(d) ? " on" : ""}${d === T ? " today" : ""}${d > T ? " fut" : ""}" data-hbtog="${esc(h.id)}" data-d="${d}"><small>${WD[new Date(d + "T12:00:00Z").getUTCDay()]}</small>${set.has(d) ? "✓" : +d.slice(8, 10)}</button>`).join("")}</div>
      ${open === h.id ? `<div class="hbMore"><div class="bkSub">${+T.slice(5, 7)}月のマス（押すとチェック）・いちばん長く続いたのは ${best(h)}日・ぜんぶで ${(h.days || []).length}回</div>${monthGrid(h, T)}<div class="ctrl"><button type="button" data-hbedit="${esc(h.id)}" style="font-size:12px;padding:3px 10px">✏️ 名前を直す・消す</button></div></div>` : ""}
    </div>`;
  }).join("");
  el.innerHTML = `<div class="sect" style="display:flex;justify-content:space-between;align-items:center"><span>✅ ハビットトラッカー<span class="en">Habits</span></span><button type="button" data-hbadd style="font-size:13px;padding:3px 12px">＋ 習慣を足す</button></div>
    ${adding ? `<div style="display:flex;gap:6px;margin:6px 0"><input data-hbnew maxlength="20" placeholder="例：散歩・読書・ストレッチ・💧水2L" style="flex:1;min-width:0;font-size:16px;padding:6px 8px;border:1px solid var(--line);border-radius:10px"><button type="button" class="main" data-hbsave>足す</button></div>` : ""}
    <div class="hbNav"><button type="button" data-hbwk="-1" aria-label="前の週">‹</button><b>${+wk.slice(5, 7)}/${+wk.slice(8, 10)}〜${+last.slice(5, 7)}/${+last.slice(8, 10)}</b><button type="button" data-hbwk="1" aria-label="次の週">›</button>${wk !== YK.weekOf(T) ? `<button type="button" data-hbwk="0" style="font-size:12px;padding:2px 10px">今週へ</button>` : ""}</div>
    ${rows || `<div class="empty">まだ習慣はありません。「＋ 習慣を足す」から入れてね</div>`}
    <p class="note" style="margin-top:6px">丸を押すとチェック、もう一度押すと外れます。習慣の名前を押すと、その月のマスと記録が開きます。</p>`;
  if (adding) setTimeout(() => el.querySelector("[data-hbnew]")?.focus(), 30);
}
function onClick(e, el) {
  const tg = e.target.closest("[data-hbtog]");
  if (tg) { const l = load(), h = l.find(x => x.id === tg.dataset.hbtog); if (!h) return; const s = new Set(h.days || []); s.has(tg.dataset.d) ? s.delete(tg.dataset.d) : s.add(tg.dataset.d); h.days = [...s].sort(); save(l); render(el); return; }
  const w = e.target.closest("[data-hbwk]"); if (w) { wk = +w.dataset.hbwk === 0 ? YK.weekOf(YK.t0()) : YK.addDays(wk, 7 * +w.dataset.hbwk); render(el); return; }
  if (e.target.closest("[data-hbadd]")) { adding = !adding; render(el); return; }
  if (e.target.closest("[data-hbsave]")) { const v = (el.querySelector("[data-hbnew]")?.value || "").trim().slice(0, 20); if (!v) return; const l = load(); l.push({ id: uid(), name: v, made: Date.now(), days: [] }); save(l); adding = false; render(el); return; }
  const op = e.target.closest("[data-hbopen]"); if (op) { open = open === op.dataset.hbopen ? null : op.dataset.hbopen; render(el); return; }
  const ed = e.target.closest("[data-hbedit]"); if (ed) { editing = ed.dataset.hbedit; render(el); return; }
  if (e.target.closest("[data-hbcancel]")) { editing = null; render(el); return; }
  const rn = e.target.closest("[data-hbren]"); if (rn) { const v = (el.querySelector("[data-hbname]")?.value || "").trim().slice(0, 20); if (!v) return; const l = load(), h = l.find(x => x.id === rn.dataset.hbren); if (h) h.name = v; save(l); editing = null; render(el); return; }
  const dl = e.target.closest("[data-hbdel]"); if (dl) { if (!confirm("この習慣と、そのチェックを全部消します。元には戻せません。いい？")) return; save(load().filter(x => x.id !== dl.dataset.hbdel)); editing = null; open = null; render(el); }
}
window.YadoMods = window.YadoMods || {};
window.YadoMods.habit = {
  mount(el) {
    if (!el.dataset.bound) {
      el.addEventListener("click", e => onClick(e, el));
      el.addEventListener("keydown", e => { if (e.target.matches("[data-hbnew]") && e.key === "Enter" && !e.isComposing) { e.preventDefault(); el.querySelector("[data-hbsave]")?.click(); } });
      el.dataset.bound = "1";
    }
    if (!(el.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))) render(el);
  },
  dayInfo(ds) { return load().filter(h => !h.archived && (h.days || []).includes(ds)).map(h => `✅ ${h.name}`); }
};
dispatchEvent(new Event("yadokari:modready"));
})();
