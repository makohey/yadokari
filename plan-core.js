/* ===== ヤドカリの手帳：読み取りの共通部品（plan-core.js）=====
   実験室（lab.html）と月まとめ（dashboard.html）の両方が使う。
   ・保存はこの端末の中だけ（yadokari. で始まる名前）
   ・日付と時刻はコードが読む。AIは「読み取る・選ぶ」だけ。「何」「場所」は元の文にない言葉を使わせない
   ・入れたら "yadokari:saved" を知らせる（画面はそれを聞いて並べ直す） */
"use strict";
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
const z = n => String(n).padStart(2, "0");

/* ---------- 保存（この端末の中だけ。名前は yadokari. で始める） ---------- */
const K = { items: "yadokari.plan.items", fixes: "yadokari.plan.fixes", stats: "yadokari.lab.stats", seat: "yadokari.lab.ai.seat", auto: "yadokari.lab.ai.auto" };
const getJ = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (_) { return d; } };
const setJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { alert("保存できませんでした（容量がいっぱいかも）"); return false; } };
const load = () => { const v = getJ(K.items, []); return Array.isArray(v) ? v : []; };
const save = items => setJ(K.items, items);

const KINDS = ["予定", "やること", "習慣", "メモ"];
const ACTS = ["出勤", "外出", "手続き", "買い物", "通院", "家のこと", "移動", "遊び", "その他"];
const WD = ["日", "月", "火", "水", "木", "金", "土"];

/* ---------- 日本時間の「今日」 ---------- */
function todayJ() { const j = new Date(Date.now() + 9 * 3600000); return { y: j.getUTCFullYear(), m: j.getUTCMonth() + 1, d: j.getUTCDate(), w: j.getUTCDay() }; }
const ymd = (y, m, d) => { const t = new Date(Date.UTC(y, m - 1, d)); return `${t.getUTCFullYear()}-${z(t.getUTCMonth() + 1)}-${z(t.getUTCDate())}`; };
const addDays = n => { const t = todayJ(); return ymd(t.y, t.m, t.d + n); };
const zen = s => String(s).replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[：]/g, ":").replace(/[／]/g, "/").replace(/[．]/g, ".");
const DF = d => { if (!d) return "日付なし"; const t = new Date(Date.parse(d + "T12:00:00+09:00")); return `${t.getUTCMonth() + 1}/${t.getUTCDate()}（${WD[t.getUTCDay()]}）`; };

/* ---------- 日付と時刻はコードが読む（地球儀07と同じ） ---------- */
function readDate(text) {
  const s = zen(text), t = todayJ(); let m;
  if ((m = s.match(/(\d{4})\s*[\/年.・-]\s*(\d{1,2})\s*[\/月.・-]\s*(\d{1,2})日?/))) return { date: ymd(+m[1], +m[2], +m[3]), how: m[0] };
  if ((m = s.match(/(\d{1,2})\s*[\/月.・-]\s*(\d{1,2})\s*日?/))) { const mo = +m[1], d = +m[2]; if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) { let y = t.y; if (ymd(y, mo, d) < ymd(t.y, t.m, t.d) && (t.m - mo) > 6) y++; return { date: ymd(y, mo, d), how: m[0] }; } }
  if ((m = s.match(/今日|きょう|本日/))) return { date: addDays(0), how: m[0] };
  if ((m = s.match(/明後日|あさって/))) return { date: addDays(2), how: m[0] };
  if ((m = s.match(/明日|あした|あす/))) return { date: addDays(1), how: m[0] };
  if ((m = s.match(/(再来週|来週|今週)?の?\s*([日月火水木金土])曜日?/))) { const want = WD.indexOf(m[2]); let n = (want - t.w + 7) % 7;
    if (m[1] === "来週" || m[1] === "再来週") { const nextMon = ((8 - t.w) % 7) || 7; n = nextMon + (want + 6) % 7 + (m[1] === "再来週" ? 7 : 0); }
    return { date: addDays(n), how: m[0] }; }
  if ((m = s.match(/週末/))) return { date: addDays((6 - t.w + 7) % 7), how: m[0] };
  if ((m = s.match(/(\d{1,2})日/))) { const d = +m[1]; if (d >= 1 && d <= 31) { let mo = t.m, y = t.y; if (d < t.d) { mo++; if (mo > 12) { mo = 1; y++; } } return { date: ymd(y, mo, d), how: m[0] }; } }
  return null;
}
function readTime(text) {
  const s = zen(text); let m;
  const pm = /午後|夕方|夜|晩/.test(s), am = /午前|朝|明け方/.test(s);
  if ((m = s.match(/(\d{1,2}):(\d{2})/))) { let h = +m[1]; if (pm && h < 12) h += 12; return { time: `${z(h)}:${m[2]}`, how: m[0] }; }
  if ((m = s.match(/(\d{1,2})\s*時\s*(半|(\d{1,2})\s*分)?/))) { let h = +m[1]; const mi = m[2] === "半" ? 30 : m[3] ? +m[3] : 0; if (pm && h < 12) h += 12; if (am && h === 12) h = 0; return { time: `${z(h)}:${z(mi)}`, how: m[0] }; }
  if ((m = s.match(/明け方|朝|昼|夕方|夜|晩/))) return { time: "", part: m[0], how: m[0] };
  return null;
}

/* ---------- AIなしの係 ---------- */
const ACT_RE = {
  出勤: /出勤|仕事|会社|職場|シフト|夜勤|早番|遅番/,
  通院: /病院|歯医者|眼科|皮膚科|内科|整骨院|診察|健診|検診/,
  手続き: /役所|区役所|市役所|郵便局|銀行|手続き|申請|届け|免許|車検|予約電話|支払い|振込/,
  買い物: /買い物|買う|かう|スーパー|コンビニ|ドラッグストア/,
  家のこと: /洗濯|布団|干す|掃除|片付け|ゴミ|料理/,
  移動: /旅行|出張|新幹線|飛行機|ドライブ|帰省/,
  遊び: /釣り|つり|映画|ライブ|飲み会|遊び|カラオケ/,
  外出: /スタバ|カフェ|散歩|外食|出かけ|行く|寄る/,
};
function cutWhat(text, d, tm) {
  let what = zen(text);
  for (const h of [d?.how, tm?.how]) if (h) what = what.replace(h, "");
  /* 「急遽」などは元の文に残っているので、「何」からは外す（数えるのは元の文から） */
  what = what.replace(/急遽|急に/g, " ").replace(/^\s*(明け方|朝|昼|夕方|夜|晩|午前|午後)\s*/, "").replace(/\s+/g, " ");
  return what.replace(/^[\s、,。]+|予定$|になった$|[\s、,。]+$/g, "").replace(/^\s*(から|に|の|へ)\s*/, "").replace(/^[にのへ\s]+/, "").trim();
}
function ruleRead(text) {
  const d = readDate(text), tm = readTime(text);
  const act = Object.keys(ACT_RE).find(k => ACT_RE[k].test(text)) || "その他";
  const kind = /毎日|毎朝|毎晩|毎週|習慣/.test(text) ? "習慣" : (d || tm) ? "予定" : /買う|かう|出す|払う|やる|する|片付け|返す|連絡|電話|見とく|しとく/.test(text) ? "やること" : "メモ";
  const what = cutWhat(text, d, tm);
  const m = what.match(/スタバ|[ァ-ヶー]{2,}|([一-龠]{1,3})?(駅|港|海岸|公園|役所|病院|郵便局|銀行)/);
  const place = m ? m[0].replace(/^[日月時分]+/, "") : "";
  return { kind, what: what || text, place, activity: act, date: d?.date || "", time: tm?.time || "", part: tm?.part || "" };
}

/* ---------- 手本帳（直した例を覚えておく） ---------- */
const getFixes = () => { const v = getJ(K.fixes, []); return Array.isArray(v) ? v : []; };
function fixKey(o) { return (o.place || o.what || "").trim().slice(0, 20); }
function applyFixes(o, text) {
  const hit = getFixes().find(f => f.key && text.includes(f.key));
  if (hit && ACTS.includes(hit.activity) && hit.activity !== o.activity) { o.activity = hit.activity; o.notes.push(`手本帳から：「${hit.key}」は ${hit.activity}`); }
  return o;
}
function rememberFix(key, activity) {
  if (!key) return;
  const list = getFixes().filter(f => f.key !== key);
  list.unshift({ key, activity, at: Date.now() });
  setJ(K.fixes, list.slice(0, 50));
}

/* ---------- ローカルくん（AI）の読み込み：地球儀の実験室と同じ席・同じ版 ---------- */
const LIBS = { light: "https://esm.run/@mlc-ai/web-llm@0.2.86", jp: "https://esm.run/@mlc-ai/web-llm@0.2.79" };
const libs = {};
const SEATS = {
  light: { label: "軽い：Qwen2.5 0.5B", size: "約0.4GB", f16: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", f32: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC" },
  jp: { label: "少し上：TinySwallow 1.5B", size: "約1.2GB", custom: true,
    repo: "https://huggingface.co/asai95/TinySwallow-1.5B-Instruct-q4f32_1-MLC", id: "TinySwallow-1.5B-Instruct-q4f32_1-MLC", libFrom: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC" },
};
let webllm = null, engine = null, curId = null, lastModel = null;
const log = msg => { const el = $("aiLog"); if (el) el.textContent = msg; };
const setBar = w => { const b = $("aiBar"); if (b) b.style.width = w; };
const isPhone = () => /iPhone|Android.+Mobile/.test(navigator.userAgent);
async function hasF16() { try { const ad = await navigator.gpu?.requestAdapter(); return !!ad?.features?.has?.("shader-f16"); } catch (_) { return false; } }
async function modelFor(key) {
  const s = SEATS[key];
  if (!s.custom) return { id: (await hasF16()) ? s.f16 : s.f32, appConfig: undefined };
  const base = webllm.prebuiltAppConfig, lib = base.model_list.find(m => m.model_id === s.libFrom)?.model_lib;
  if (!lib) throw new Error("この版の WebLLM に、TinySwallow を動かす部品が見つかりませんでした");
  return { id: s.id, appConfig: { ...base, model_list: [...base.model_list, { model: s.repo, model_id: s.id, model_lib: lib }] } };
}
let loadingAI = false;
function showAIState() {
  const name = curId ? curId.split("-").slice(0, 2).join(" ") : "";
  const [cls, txt] = loadingAI ? ["wait", "🤖 AI：読み込み中…（終わるまでAIのボタンは押せません）"]
    : engine ? ["on", `🤖 AI：あり・使えます（${name}）`]
    : ["", "🤖 AI：なし（ローカルくんの席を選ぶと使えます。AIなしの読み取りはそのまま使えます）"];
  document.querySelectorAll("[data-ai-state]").forEach(el => { el.className = "aiState " + cls; el.textContent = txt; });
}
function setBusy(b) {
  for (const id of ["aiLight", "aiJp", "pRule", "tRule"]) { const el = $(id); if (el) el.disabled = b; }
  for (const id of ["aiDel", "pAi", "tAi"]) { const el = $(id); if (el) el.disabled = b || !engine; }
  showAIState();
}
async function loadAI(key, auto = false) {
  if (!("gpu" in navigator)) { log("この端末のブラウザには WebGPU（ウェブジーピーユー）がないので、AIは動かせません。AIなしの読み取りはそのまま使えます。"); return; }
  const s = SEATS[key];
  if (!auto && key === "jp" && isPhone() && !confirm(`${s.label}は${s.size}あります。iPhone だとページが落ちることがあります（予定は消えません）。読み込みますか？`)) return;
  if (!auto && key === "light" && !confirm(`${s.label}（${s.size}）を Hugging Face から読み込みます（端末の中にあれば通信しません）。読み込みますか？`)) return;
  loadingAI = true; setBusy(true); const t0 = performance.now();
  try {
    webllm = libs[key] ||= await import(LIBS[key]);
    const m = await modelFor(key); lastModel = m;
    if (engine) { try { await engine.unload(); } catch (_) {} engine = null; }
    log("読み込みを始めます…");
    engine = await webllm.CreateMLCEngine(m.id, { appConfig: m.appConfig, initProgressCallback: p => { log(`読み込み中：${Math.round((p.progress || 0) * 100)}%`); setBar(`${Math.round((p.progress || 0) * 100)}%`); } });
    curId = m.id; try { localStorage.setItem(K.seat, key); } catch (_) {}
    log(`読み込み完了：${m.id}（${((performance.now() - t0) / 1000).toFixed(0)} 秒）。「AIに読み取ってもらう」が押せます。`);
  } catch (e) { engine = null; log(`読み込めませんでした（${s.label}）：` + (e?.message || e)); }
  finally { loadingAI = false; setBusy(false); }
}
async function delAI() {
  if (!curId || !webllm) return;
  if (!confirm("読み込んだモデルを、この端末から消しますか？（地球儀の実験室と共有している場合は、そちらでも読み込み直しになります）")) return;
  try { if (engine) await engine.unload(); engine = null; await webllm.deleteModelAllInfoInCache(curId, lastModel?.appConfig); log("消しました。端末の容量が戻ります。"); curId = null; setBar("0"); }
  catch (e) { log("消せませんでした：" + (e?.message || e)); }
  finally { setBusy(false); }
}
async function autoLoad() {
  const box = $("aiAuto"); let autoOn = true;
  try { autoOn = localStorage.getItem(K.auto) !== "0"; } catch (_) {}
  if (box) { box.checked = autoOn; box.onchange = () => { try { localStorage.setItem(K.auto, box.checked ? "1" : "0"); } catch (_) {} }; }
  let key = null; try { key = localStorage.getItem(K.seat); } catch (_) {}
  if (!key || !SEATS[key] || !autoOn || !("gpu" in navigator)) return;
  try {
    webllm = libs[key] ||= await import(LIBS[key]);
    const m = await modelFor(key);
    if (!(await webllm.hasModelInCache(m.id, m.appConfig))) return;
    log(`前に使った ${SEATS[key].label} が端末の中にあるので、自動で読み込みます（通信なし）…`);
    await loadAI(key, true);
  } catch (_) {}
}

/* ---------- AIに読ませる（日付と時刻はあとでコードが読む） ---------- */
const SCHEMA = { type: "object", properties: {
  kind: { type: "string", enum: KINDS }, what: { type: "string" }, place: { type: "string" },
  activity: { type: "string", enum: ACTS }, when: { type: "string" } }, required: ["kind", "what", "place", "activity", "when"] };
const SYS = [
  "あなたは手帳の係です。書かれた一行を読んで、JSONに分けるだけが仕事です。説明は書きません。",
  `kind：${KINDS.join("・")} から選ぶ（日時が決まっている用事は予定、いつかやる用事はやること、毎日・毎週のことは習慣、それ以外はメモ）`,
  "what：何をするかを、書かれた言葉をそのまま使って短く（日付や時刻の言葉は入れない。書かれていない言葉を足さない）",
  "place：行く場所や店の名前。なければ空",
  `activity：${ACTS.join("・")} から選ぶ。どれにも当てはまらなければ「その他」。仕事に行く時だけ「出勤」`,
  "when：日付と時刻の言葉を、書かれたまま抜き出す。なければ空",
  '例：「10・14朝9時スタバへ寄ってから出勤予定」→ {"kind":"予定","what":"スタバへ寄ってから出勤","place":"スタバ","activity":"出勤","when":"10・14朝9時"}',
  '例：「10.16日役所に行く」→ {"kind":"予定","what":"役所に行く","place":"役所","activity":"手続き","when":"10.16日"}',
  '例：「牛乳かう」→ {"kind":"やること","what":"牛乳かう","place":"","activity":"買い物","when":""}',
].join("\n");

/* 「何」の見張り：元の文にない言葉が多ければ、元の文から切り出した方を使う */
function whatIsFromSource(what, src) {
  const a = zen(what).replace(/\s/g, ""), s = zen(src).replace(/\s/g, "");
  if (!a) return false;
  if (s.includes(a)) return true;
  let hit = 0, n = 0;
  for (let i = 0; i < a.length - 1; i++) { n++; if (s.includes(a.slice(i, i + 2))) hit++; }
  return n > 0 && hit / n >= 0.75;
}
async function aiRead(text) {
  if (!engine) throw new Error("AIが読み込まれていません（01で読み込んでください）");
  const msgs = [{ role: "system", content: SYS }, { role: "user", content: text }];
  let r; try { r = await engine.chat.completions.create({ messages: msgs, temperature: 0, max_tokens: 120, response_format: { type: "json_object", schema: JSON.stringify(SCHEMA) } }); }
  catch (_) { r = await engine.chat.completions.create({ messages: msgs, temperature: 0, max_tokens: 120 }); }
  const raw = (r.choices?.[0]?.message?.content || "").trim(), m = raw.match(/\{[\s\S]*\}/); let o = null; try { o = JSON.parse(m ? m[0] : raw); } catch (_) {}
  if (!o) return { bad: true, raw };
  const d = readDate(text) || readDate(o.when || ""), tm = readTime(text) || readTime(o.when || "");
  const out = { kind: KINDS.includes(o.kind) ? o.kind : "メモ", what: String(o.what || ""), place: String(o.place || ""), activity: ACTS.includes(o.activity) ? o.activity : "その他",
    date: d?.date || "", time: tm?.time || "", part: tm?.part || "", notes: [], raw };
  /* 見張り1：「何」は元の文から */
  if (!whatIsFromSource(out.what, text)) { out.notes.push(`AIの「何」（${out.what || "空"}）は元の文にない言葉だったので、元の文から切り出しました`); out.what = cutWhat(text, d, tm) || text; }
  /* 見張り2：場所も元の文にない名前なら消す */
  if (out.place && !zen(text).includes(zen(out.place))) { out.notes.push(`AIの「場所」（${out.place}）は元の文になかったので外しました`); out.place = ""; }
  /* 見張り3：出勤は数える物（出勤日・時間）なので、手がかりの言葉がない時は使わない */
  if (out.activity === "出勤" && !ACT_RE.出勤.test(text)) { const r2 = ruleRead(text).activity; out.notes.push(`「出勤」の手がかりになる言葉がないので「${r2}」にしました`); out.activity = r2; }
  /* 日付・時刻があるのに予定でなければ、予定に寄せる */
  if ((out.date || out.time) && out.kind === "メモ") out.kind = "予定";
  return out;
}

/* ---------- 画面：読み取り → 返事の一言 → 確認カード（1行に1枚） ---------- */
let drafts = [];
function replyLine(o) {
  if (o.kind === "予定") return `→ ${DF(o.date)}${o.time ? " " + o.time : o.part ? " " + o.part : ""} 予定：${o.what}`;
  return `→ ${o.kind}：${o.what}`;
}
function card(o, who, sec, i, n) {
  const opts = (list, v) => list.map(x => `<option${x === v ? " selected" : ""}>${esc(x)}</option>`).join("");
  const id = k => `${k}-${i}`;
  return `<div class="pcard" id="${id("pc")}" style="${n > 1 ? "border-top:1px dashed var(--line);padding-top:6px;margin-top:6px" : ""}">
  ${n > 1 ? `<div class="note">${i + 1} / ${n} 行目：${esc(o.src)}</div>` : ""}
  <div class="reply"><div class="av">🦀</div><div class="bb">${esc(replyLine(o))}</div></div>
  ${o.notes?.length ? o.notes.map(t => `<div class="warn">${esc(t)}</div>`).join("") : ""}
  <div class="note"><span class="chip">読み取った人：${esc(who)}${sec != null ? `・${sec.toFixed(1)}秒` : ""}</span></div>
  <div class="pf"><span>種類</span><select id="${id("pKind")}">${opts(KINDS, o.kind)}</select></div>
  <div class="pf"><span>日付</span><input type="date" id="${id("pDate")}" value="${esc(o.date)}"></div>
  <div class="pf"><span>時刻</span><input type="time" id="${id("pTime")}" value="${esc(o.time)}"></div>
  <div class="pf"><span>何</span><input id="${id("pWhat")}" value="${esc(o.what)}"></div>
  <div class="pf"><span>場所</span><input id="${id("pPlace")}" value="${esc(o.place)}"></div>
  <div class="pf"><span>すること</span><select id="${id("pAct")}">${opts(ACTS, o.activity)}</select></div>
  <div class="pf"><span>備考</span><textarea id="${id("pMemo")}" placeholder="空欄のままでも入れられます"></textarea></div>
  <div class="ctrl"><button type="button" class="main" data-pok="${i}">これで入れる</button><button type="button" data-pno="${i}">やめる</button></div></div>`;
}
function takeCard(i) {
  const d = drafts[i], v = k => $(`${k}-${i}`).value;
  const it = { id: Date.now().toString(36) + i, kind: v("pKind"), date: v("pDate"), time: v("pTime"), part: v("pTime") ? "" : (d.part || ""),
    what: v("pWhat").trim() || d.src, place: v("pPlace").trim(), activity: v("pAct"), memo: v("pMemo").trim(), src: d.src, made: Date.now() };
  if (it.activity !== d.activity) rememberFix(fixKey(it), it.activity);
  return it;
}
function finishCard(i, html) { const el = $(`pc-${i}`); if (el) el.outerHTML = html; drafts[i] = null; if (drafts.every(x => !x)) { $("pIn").value = ""; const a = $("pAll"); if (a) a.remove(); } }
function saveCards(list) {
  const items = load(), got = list.map(takeCard); items.push(...got); if (!save(items)) return;
  list.forEach((i, k) => finishCard(i, `<div class="reply"><div class="av">🦀</div><div class="bb">入れたよ。${esc(replyLine(got[k]))}</div></div>`));
  dispatchEvent(new Event("yadokari:saved"));
}
function showCards(list, who, secs) {
  drafts = list.map(o => ({ ...o }));
  const n = list.length;
  $("pOut").innerHTML = (n > 1 ? `<p class="note">${n} 行あったので、1行ずつ読み取りました。</p>` : "")
    + list.map((o, i) => card(o, who, secs ? secs[i] : null, i, n)).join("")
    + (n > 1 ? `<div class="ctrl" id="pAll" style="margin-top:8px"><button type="button" class="main" data-pall>ぜんぶ入れる</button></div>` : "");
  $("pOut").onclick = e => {
    const ok = e.target.closest("[data-pok]"), no = e.target.closest("[data-pno]"), all = e.target.closest("[data-pall]");
    if (ok) saveCards([+ok.dataset.pok]);
    else if (no) finishCard(+no.dataset.pno, `<p class="note">やめました：${esc(drafts[+no.dataset.pno]?.src || "")}</p>`);
    else if (all) saveCards(drafts.map((d, i) => d ? i : -1).filter(i => i >= 0));
  };
}
const splitLines = text => text.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 10);
async function go(useAi) {
  const lines = splitLines($("pIn").value); if (!lines.length) return;
  if (!useAi) { showCards(lines.map(t => { const o = applyFixes({ ...ruleRead(t), notes: [] }, t); o.src = t; return o; }), "AIなし"); return; }
  setBusy(true); const t0 = performance.now(); let k = 0;
  $("pOut").innerHTML = '<p class="aiState wait" id="pWait">🤖 ローカルくんが読み取っています… 0秒</p>';
  const tick = setInterval(() => { const el = $("pWait"); if (el) el.textContent = `🤖 ローカルくんが読み取っています…${lines.length > 1 ? ` ${k + 1}/${lines.length}行目` : ""} ${Math.round((performance.now() - t0) / 1000)}秒`; }, 1000);
  try {
    const out = [], secs = [];
    for (k = 0; k < lines.length; k++) {
      const t = lines[k], s0 = performance.now();
      let o = await Promise.race([aiRead(t), new Promise((_, rej) => setTimeout(() => rej(new Error("90秒たっても返事がありませんでした。もう一度押すか、AIなしで読み取ってください")), 90000))]);
      if (o.bad) { o = { ...ruleRead(t), notes: ["AIが読み取れなかったので、この行はAIなしで読みました"] }; }
      applyFixes(o, t); o.src = t; out.push(o); secs.push((performance.now() - s0) / 1000);
    }
    showCards(out, "AI（" + curId.split("-").slice(0, 2).join(" ") + "）", secs);
  } catch (e) { $("pOut").innerHTML = `<p class="ng">止まりました：${esc(e?.message || e)}</p>`; }
  finally { clearInterval(tick); setBusy(false); }
}
