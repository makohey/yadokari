/* 部品：📝 週のメモ（足した人の端末でだけ読み込む）
   週ごとに1枚、自由に書ける欄。書いたらすぐ端末の中にしまう（yadokari.weeknotes）。外にはつながない */
(() => {
"use strict";
const KEY = "yadokari.weeknotes";
const load = () => { const v = getJ(KEY, []); return Array.isArray(v) ? v.filter(n => n && n.id) : []; };
const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (_) { alert("保存できませんでした（容量がいっぱいかも）"); return false; } };
let wk = null, timer = null;
const range = w => { const l = YK.addDays(w, 6); return `${+w.slice(5, 7)}/${+w.slice(8, 10)}〜${+l.slice(5, 7)}/${+l.slice(8, 10)}`; };
function put(w, text) {
  const l = load(), n = l.find(x => x.id === w);
  if (n) { n.text = text; n.at = Date.now(); } else if (text.trim()) l.push({ id: w, text, at: Date.now() });
  save(l.filter(x => x.text && x.text.trim()));
}
function render(el) {
  const T = YK.t0(); if (!wk) wk = YK.weekOf(T);
  const l = load(), cur = l.find(x => x.id === wk);
  const others = l.filter(x => x.id !== wk).sort((a, b) => b.id.localeCompare(a.id)).slice(0, 12);
  el.innerHTML = `<div class="sect"><span>📝 週のメモ<span class="en">Week notes</span></span></div>
    <div class="hbNav"><button type="button" data-wkn="-1" aria-label="前の週">‹</button><b>${range(wk)}</b><button type="button" data-wkn="1" aria-label="次の週">›</button>${wk !== YK.weekOf(T) ? `<button type="button" data-wkn="0" style="font-size:12px;padding:2px 10px">今週へ</button>` : ""}</div>
    <textarea data-wktext rows="5" placeholder="この週のこと（予定の詳しいこと・ふりかえり・メモ）" style="width:100%;font-size:16px;border:1px solid var(--line);border-radius:12px;padding:8px 10px;line-height:1.6">${esc(cur ? cur.text : "")}</textarea>
    <div class="bkSub" data-wksaved>${cur ? "端末にしまってあります" : "書くと、すぐ端末にしまいます"}</div>
    ${others.length ? `<details style="margin-top:6px"><summary class="note" style="cursor:pointer">ほかの週のメモ（${others.length}）</summary>${others.map(n => `<div class="bkCard" data-wkgo="${esc(n.id)}" style="cursor:pointer"><div class="bkSub">${esc(range(n.id))}</div><div class="bkNote" style="font-size:13px;max-height:4.8em;overflow:hidden">${esc(n.text)}</div></div>`).join("")}</details>` : ""}`;
}
window.YadoMods = window.YadoMods || {};
window.YadoMods.week = {
  mount(el) {
    if (!el.dataset.bound) {
      el.addEventListener("click", e => {
        const n = e.target.closest("[data-wkn]"); if (n) { wk = +n.dataset.wkn === 0 ? YK.weekOf(YK.t0()) : YK.addDays(wk, 7 * +n.dataset.wkn); render(el); return; }
        const g = e.target.closest("[data-wkgo]"); if (g) { wk = g.dataset.wkgo; render(el); el.scrollIntoView({ behavior: "smooth", block: "start" }); }
      });
      el.addEventListener("input", e => {
        if (!e.target.matches("[data-wktext]")) return;
        const v = e.target.value.slice(0, 5000), w = wk; clearTimeout(timer);
        timer = setTimeout(() => { put(w, v); const s = el.querySelector("[data-wksaved]"); if (s) s.textContent = "端末にしまいました"; }, 400);
      });
      el.dataset.bound = "1";
    }
    if (!el.contains(document.activeElement)) render(el);
  },
  dayInfo() { return []; }
};
dispatchEvent(new Event("yadokari:modready"));
})();
