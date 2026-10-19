/* 部品：📚 読書カード（足した人の端末でだけ読み込む）
   1冊1枚。書名・著者・状態・読み始め／読み終え・★・ページ数・感想・心に残った一文。
   日数やページは、コード君が日付から数える。データはこの端末の中だけ（yadokari.books）。外にはつながない */
(() => {
"use strict";
const KEY = "yadokari.books";
const STATES = [["want", "読みたい", "Want"], ["reading", "読んでいる", "Reading"], ["done", "読んだ", "Done"], ["quit", "やめた", "Paused"]];
const stName = s => (STATES.find(x => x[0] === s) || STATES[0])[1];
const load = () => { const v = getJ(KEY, []); return Array.isArray(v) ? v : []; };
const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch (_) { alert("保存できませんでした（容量がいっぱいかも）"); return false; } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const dayN = (a, b) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000) + 1; /* 読み始めた日も1日目 */
const md = d => d ? `${+d.slice(5, 7)}/${+d.slice(8, 10)}` : "";
const stars = (n, id) => `<span class="bkStars"${id ? ` data-bkid="${esc(id)}"` : ""}>${[1, 2, 3, 4, 5].map(i => `<button type="button" class="bkStar${i <= (n || 0) ? " on" : ""}" data-star="${i}" aria-label="★${i}">★</button>`).join("")}</span>`;
let tab = "reading", open = null, editing = null, adding = false;

function daysInfo(b) {
  const T = YK.t0();
  if (b.status === "done" && b.start && b.end) return `${dayN(b.start, b.end)}日で読了`;
  if (b.status === "reading" && b.start) return `読み始めて${dayN(b.start, T)}日目`;
  if (b.status === "done" && b.end) return `${md(b.end)} 読了`;
  return "";
}
function stats(list) {
  const y = YK.t0().slice(0, 4);
  const done = list.filter(b => b.status === "done" && b.end && b.end.startsWith(y));
  const withDays = done.filter(b => b.start);
  const days = withDays.map(b => dayN(b.start, b.end));
  const avg = days.length ? Math.round(days.reduce((a, c) => a + c, 0) / days.length) : null;
  const pp = withDays.filter(b => +b.pages > 0);
  const ppd = pp.length ? Math.round(pp.reduce((a, b) => a + +b.pages, 0) / pp.reduce((a, b) => a + dayN(b.start, b.end), 0)) : null;
  const fast = withDays.length ? withDays.reduce((a, b) => dayN(b.start, b.end) < dayN(a.start, a.end) ? b : a) : null;
  const slow = withDays.length ? withDays.reduce((a, b) => dayN(b.start, b.end) > dayN(a.start, a.end) ? b : a) : null;
  const months = [...Array(12)].map((_, i) => done.filter(b => +b.end.slice(5, 7) === i + 1).length);
  return { y, done, avg, ppd, fast, slow, months, reading: list.filter(b => b.status === "reading").length };
}
function formHtml(b) {
  const o = (v, cur) => STATES.map(([k, n]) => `<option value="${k}"${k === cur ? " selected" : ""}>${n}</option>`).join("");
  return `<div class="bkForm" data-bkform="${esc(b.id || "")}">
    <div class="pf"><span>書名</span><input data-bf="title" value="${esc(b.title || "")}" placeholder="本の名前"></div>
    <div class="pf"><span>著者</span><input data-bf="author" value="${esc(b.author || "")}" placeholder="なくてもOK"></div>
    <div class="pf"><span>状態</span><select data-bf="status">${o(STATES, b.status || "reading")}</select></div>
    <div class="pf"><span>読み始め</span><input type="date" data-bf="start" value="${esc(b.start || "")}"></div>
    <div class="pf"><span>読み終え</span><input type="date" data-bf="end" value="${esc(b.end || "")}"></div>
    <div class="pf"><span>ページ数</span><input type="number" inputmode="numeric" min="0" data-bf="pages" value="${esc(b.pages || "")}" placeholder="なくてもOK"></div>
    <div class="pf"><span>★</span>${stars(b.stars || 0)}<input type="hidden" data-bf="stars" value="${esc(b.stars || 0)}"></div>
    <div class="pf"><span>感想</span><textarea data-bf="note" rows="3" placeholder="ひとことでも">${esc(b.note || "")}</textarea></div>
    <div class="pf"><span>残った一文</span><textarea data-bf="quote" rows="2" placeholder="心に残った一文（自分で書き写す）">${esc(b.quote || "")}</textarea></div>
    <div class="ctrl"><button type="button" class="main" data-bksave>入れる</button><button type="button" data-bkcancel>やめる</button>${b.id ? `<button type="button" data-bkdel="${esc(b.id)}" style="margin-left:auto;color:#c0504d">消す</button>` : ""}</div>
  </div>`;
}
function cardHtml(b) {
  const isOpen = open === b.id;
  if (editing === b.id) return formHtml(b);
  const quick = b.status === "want" ? `<button type="button" data-bkgo="reading" data-id="${esc(b.id)}">📖 読み始める</button>`
    : b.status === "reading" ? `<button type="button" data-bkgo="done" data-id="${esc(b.id)}">✅ 読み終えた</button>` : "";
  return `<div class="bkCard${isOpen ? " open" : ""}" data-bkopen="${esc(b.id)}">
    <div class="bkTop"><div class="bkT"><b>${esc(b.title)}</b>${b.author ? ` <small>${esc(b.author)}</small>` : ""}</div><span class="bkSt s-${esc(b.status)}">${esc(stName(b.status))}</span></div>
    <div class="bkMeta">${stars(b.stars, b.id)}<span>${esc(daysInfo(b))}</span>${+b.pages > 0 ? `<span>${esc(b.pages)}ページ</span>` : ""}</div>
    ${isOpen ? `<div class="bkDetail">
      ${b.start || b.end ? `<div class="bkSub">${b.start ? `読み始め ${esc(YK.HDF(b.start))}` : ""}${b.start && b.end ? "　" : ""}${b.end ? `読み終え ${esc(YK.HDF(b.end))}` : ""}</div>` : ""}
      ${b.status === "done" && b.start && b.end && +b.pages > 0 ? `<div class="bkSub">1日あたり 約${Math.round(+b.pages / dayN(b.start, b.end))}ページ</div>` : ""}
      ${b.note ? `<div class="bkNote">${esc(b.note)}</div>` : `<div class="bkSub">感想はまだありません（✏️で書けます）</div>`}
      ${b.quote ? `<div class="bkQuote">「${esc(b.quote)}」</div>` : ""}
      <div class="ctrl">${quick}<button type="button" data-bkedit="${esc(b.id)}">✏️ 直す</button><button type="button" class="shareBtn" data-bkshare="${esc(b.id)}" style="font-size:13px;padding:5px 12px">⤴︎ 送る<span class="en">Share</span></button></div>
    </div>` : quick ? `<div class="ctrl" style="margin-top:4px">${quick}</div>` : ""}
  </div>`;
}
function render(el) {
  const list = load(), s = stats(list);
  const shown = (tab === "all" ? list : list.filter(b => b.status === tab)).slice().sort((a, b) => (b.end || b.start || "").localeCompare(a.end || a.start || "") || (b.made || 0) - (a.made || 0));
  const max = Math.max(1, ...s.months);
  const bars = s.done.length ? `<div class="bkBars">${s.months.map((n, i) => `<div class="bkBar" title="${i + 1}月 ${n}冊"><i style="height:${Math.round(n / max * 100)}%"></i><span>${i + 1}</span></div>`).join("")}</div>` : "";
  const per = s.done.filter(b => b.start).slice(-8);
  const pmax = Math.max(1, ...per.map(b => dayN(b.start, b.end)));
  const perBars = per.length ? `<div class="bkSub" style="margin-top:8px">1冊ごとにかかった日数</div>` + per.map(b => { const n = dayN(b.start, b.end); return `<div class="bkRow"><span class="bkRt">${esc(b.title)}</span><span class="bkRb"><i style="width:${Math.max(4, Math.round(n / pmax * 100))}%"></i></span><span class="bkRn">${n}日</span></div>`; }).join("") : "";
  el.innerHTML = `<div class="sect" style="display:flex;justify-content:space-between;align-items:center"><span>📚 読書カード<span class="en">Books</span></span><button type="button" data-bkadd style="font-size:13px;padding:3px 12px">＋ 本を足す</button></div>
    <div class="tiles" style="margin-top:4px">
      <div class="tile"><div class="k">${s.y}年に読んだ</div><div class="v">${s.done.length}<span class="u">冊</span></div><div class="s">読んでいる ${s.reading}冊</div></div>
      <div class="tile"><div class="k">1冊あたり</div><div class="v">${s.avg ?? "—"}<span class="u">${s.avg != null ? "日" : ""}</span></div><div class="s">平均（読み始め〜読み終え）</div></div>
      <div class="tile"><div class="k">1日あたり</div><div class="v">${s.ppd ?? "—"}<span class="u">${s.ppd != null ? "ページ" : ""}</span></div><div class="s">ページ数を入れた本だけ</div></div>
    </div>
    ${s.fast && s.slow && s.fast !== s.slow ? `<div class="bkSub" style="margin-top:6px">いちばん早かった：${esc(s.fast.title)}（${dayN(s.fast.start, s.fast.end)}日）／いちばん長かった：${esc(s.slow.title)}（${dayN(s.slow.start, s.slow.end)}日）</div>` : ""}
    ${bars ? `<div class="bkSub" style="margin-top:8px">月ごとに読み終えた冊数</div>${bars}` : ""}
    ${perBars}
    ${adding ? formHtml({ status: "reading", start: YK.t0() }) : ""}
    <div class="bkTabs">${[["reading", "読んでいる"], ["want", "読みたい"], ["done", "読んだ"], ["all", "ぜんぶ"]].map(([k, n]) => `<button type="button" data-bktab="${k}" class="${tab === k ? "on" : ""}">${n}（${k === "all" ? list.length : list.filter(b => b.status === k).length}）</button>`).join("")}</div>
    ${shown.length ? shown.map(cardHtml).join("") : `<div class="empty">${tab === "reading" ? "読んでいる本はありません。「＋ 本を足す」から入れてね" : "まだありません"}</div>`}
    <p class="note" style="margin-top:6px">カードを押すと、感想や日付が開きます。★は押すとすぐ変わります。表紙の写真や、本の情報を外から取ってくることはしません（端末の中だけ）。</p>`;
}
function readForm(f) {
  const v = k => (f.querySelector(`[data-bf="${k}"]`)?.value || "").trim();
  return { title: v("title").slice(0, 120), author: v("author").slice(0, 80), status: v("status") || "reading", start: v("start"), end: v("end"), pages: v("pages").replace(/[^\d]/g, "").slice(0, 5), stars: Math.max(0, Math.min(5, +v("stars") || 0)), note: v("note").slice(0, 3000), quote: v("quote").slice(0, 600) };
}
function onClick(e, el) {
  const st = e.target.closest("[data-star]");
  if (st) {
    e.stopPropagation();
    const wrap = st.closest(".bkStars"), n = +st.dataset.star, form = st.closest(".bkForm");
    if (form) { const h = form.querySelector('[data-bf="stars"]'), nv = +h.value === n ? 0 : n; h.value = nv; wrap.outerHTML = stars(nv); return; }
    const id = wrap.dataset.bkid, list = load(), b = list.find(x => x.id === id); if (!b) return;
    b.stars = b.stars === n ? 0 : n; save(list); render(el); return;
  }
  const t = e.target.closest("[data-bktab]"); if (t) { tab = t.dataset.bktab; open = null; render(el); return; }
  if (e.target.closest("[data-bkadd]")) { adding = !adding; editing = null; render(el); setTimeout(() => el.querySelector('[data-bf="title"]')?.focus(), 50); return; }
  if (e.target.closest("[data-bkcancel]")) { adding = false; editing = null; render(el); return; }
  if (e.target.closest("[data-bksave]")) {
    const f = e.target.closest(".bkForm"), o = readForm(f); if (!o.title) { alert("書名を入れてね"); return; }
    if (o.status === "done" && !o.end) o.end = YK.t0();
    if (o.start && o.end && o.end < o.start) { alert("読み終えた日が、読み始めた日より前になっています"); return; }
    const list = load(), id = f.dataset.bkform;
    if (id) { const b = list.find(x => x.id === id); if (b) Object.assign(b, o); }
    else list.push({ id: uid(), made: Date.now(), ...o });
    save(list); adding = false; editing = null; tab = o.status; open = id || null; render(el); YK.render(); return;
  }
  const dl = e.target.closest("[data-bkdel]");
  if (dl) { if (!confirm("このカードを消します。元には戻せません。いい？")) return; save(load().filter(x => x.id !== dl.dataset.bkdel)); editing = null; render(el); YK.render(); return; }
  const ed = e.target.closest("[data-bkedit]"); if (ed) { editing = ed.dataset.bkedit; render(el); return; }
  const go = e.target.closest("[data-bkgo]");
  if (go) {
    e.stopPropagation();
    const list = load(), b = list.find(x => x.id === go.dataset.id); if (!b) return;
    if (go.dataset.bkgo === "reading") { b.status = "reading"; b.start = b.start || YK.t0(); }
    else { b.status = "done"; b.end = YK.t0(); if (!b.start) b.start = YK.t0(); }
    save(list); tab = b.status; open = b.id; render(el); YK.render(); return;
  }
  const sh = e.target.closest("[data-bkshare]");
  if (sh) {
    e.stopPropagation();
    const b = load().find(x => x.id === sh.dataset.bkshare); if (!b) return;
    const lines = [`📖 ${b.title}${b.author ? `（${b.author}）` : ""}`, b.stars ? "★".repeat(b.stars) + "☆".repeat(5 - b.stars) : "", daysInfo(b), b.note || "", b.quote ? `「${b.quote}」` : ""].filter(Boolean);
    YK.share(lines.join("\n"), sh); return;
  }
  if (e.target.closest(".bkForm") || e.target.closest("button") || e.target.closest("a")) return;
  const oc = e.target.closest("[data-bkopen]"); if (oc) { open = open === oc.dataset.bkopen ? null : oc.dataset.bkopen; render(el); }
}
/* その日の欄に出す一言（読み始め・読み終え） */
function dayInfo(ds) {
  const l = load(), out = [];
  for (const b of l) { if (b.end === ds && b.status === "done") out.push(`📖 読了：${b.title}${b.start ? `（${dayN(b.start, b.end)}日）` : ""}`); else if (b.start === ds) out.push(`📖 読み始め：${b.title}`); }
  return out;
}
window.YadoMods = window.YadoMods || {};
window.YadoMods.books = {
  mount(el) { if (!el.dataset.bound) { el.addEventListener("click", e => onClick(e, el)); el.dataset.bound = "1"; } /* 書きかけの形がある時は、外からの描き直しで消さない */ if (!(adding || editing)) render(el); },
  dayInfo
};
dispatchEvent(new Event("yadokari:modready"));
})();
