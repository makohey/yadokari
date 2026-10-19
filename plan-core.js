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
/* ローカルくんの名前（使う人が付けられる。初めは「ローカルくん」） */
K.aiName = "yadokari.ai.name";
/* 見張り役の絵（初めは🦀）。見出しの絵を長押しすると変えられる（説明はしない、見つけた人だけのおまけ） */
K.avatar = "yadokari.avatar";
function avatar() { try { const v = (localStorage.getItem(K.avatar) || "").trim(); return v || "🦀"; } catch (_) { return "🦀"; } }
function aiName() { try { const n = (localStorage.getItem(K.aiName) || "").trim(); return n ? n.slice(0, 12) : "ローカルくん"; } catch (_) { return "ローカルくん"; } }
const getJ = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (_) { return d; } };
const setJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { alert("保存できませんでした（容量がいっぱいかも）"); return false; } };
const load = () => { const v = getJ(K.items, []); return Array.isArray(v) ? v : []; };
const save = items => setJ(K.items, items);

const KINDS = ["予定", "やること", "習慣", "メモ"];
const ACTS = ["出勤", "休み", "外出", "手続き", "買い物", "通院", "家のこと", "移動", "遊び", "その他"];
/* すること は、使う人が足したり隠したりできる。出勤・休み・その他 は見張りがついているので動かさない */
const FIXED_ACTS = ["出勤", "休み", "その他"];
const ACTS_KEY = "yadokari.acts";
function getActs() {
  try {
    const v = JSON.parse(localStorage.getItem(ACTS_KEY) || "{}");
    const add = (Array.isArray(v.add) ? v.add : []).filter(x => typeof x === "string").map(x => x.trim().slice(0, 10)).filter(x => x && !ACTS.includes(x));
    const hide = (Array.isArray(v.hide) ? v.hide : []).filter(x => ACTS.includes(x) && !FIXED_ACTS.includes(x));
    return { add: [...new Set(add)].slice(0, 12), hide: [...new Set(hide)] };
  } catch (_) { return { add: [], hide: [] }; }
}
function setActs(v) { try { localStorage.setItem(ACTS_KEY, JSON.stringify(v)); } catch (_) {} }
/* 選べる並び（隠したものは出さない。足したものは「その他」の前） */
function acts() { const a = getActs(); return [...ACTS.filter(x => x !== "その他" && !a.hide.includes(x)), ...a.add, "その他"]; }
/* 中身として正しいか（隠していても、前に使った分は正しいまま） */
const actOK = x => ACTS.includes(x) || getActs().add.includes(x);
/* 直す時の並び：いまの値が隠れていても選べるようにする */
const actList = v => acts().includes(v) || !v ? acts() : [...acts().slice(0, -1), v, "その他"];
/* 曜日の書き方は選べる（月火水／Mon Tue Wed）。この端末で覚える */
const WD_KEY = "yadokari.wd";
const WD_JA = ["日", "月", "火", "水", "木", "金", "土"], WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const wdEn = () => { try { return localStorage.getItem(WD_KEY) === "en"; } catch (_) { return false; } };
const WD = new Proxy(WD_JA, { get: (t, k) => (wdEn() ? WD_EN : WD_JA)[k] });

/* ---------- 日本時間の「今日」 ---------- */
/* 「明日」などの基準の日。ふだんは今日。ヤドカリのメモを読む時だけ、そのメモを書いた日にする */
let baseDay = null;
function todayJ() {
  if (baseDay) { const t = new Date(Date.parse(baseDay + "T12:00:00Z")); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), w: t.getUTCDay() }; }
  const j = new Date(Date.now() + 9 * 3600000); return { y: j.getUTCFullYear(), m: j.getUTCMonth() + 1, d: j.getUTCDate(), w: j.getUTCDay() }; }
function withBase(day, fn) { const keep = baseDay; baseDay = /^\d{4}-\d{2}-\d{2}$/.test(day || "") ? day : null; try { return fn(); } finally { baseDay = keep; } }
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
  休み: /休み|やすみ|OFF|ｏｆｆ|オフ|公休|有給|有休|休日|非番/i,
  通院: /病院|歯医者|眼科|皮膚科|内科|整骨院|診察|健診|検診/,
  手続き: /役所|区役所|市役所|郵便局|銀行|手続き|申請|届け|免許|車検|予約電話|支払い|振込/,
  買い物: /買い物|買う|かう|スーパー|コンビニ|ドラッグストア/,
  家のこと: /洗濯|布団|干す|掃除|片付け|ゴミ|料理/,
  移動: /旅行|出張|新幹線|飛行機|ドライブ|帰省/,
  遊び: /釣り|つり|映画|ライブ|飲み会|遊び|カラオケ/,
  外出: /スタバ|カフェ|散歩|外食|出かけ|行く|寄る/,
};
/* 行の頭の「に・の・へ・から」は、日付や時刻を外したあとに残った時だけ外す（「にんじん」「のり」を守る） */
function cutWhat(text, d, tm) {
  let what = zen(text); const before = what;
  for (const h of [d?.how, tm?.how]) if (h) what = what.replace(h, "");
  /* 「急遽」などは元の文に残っているので、「何」からは外す（数えるのは元の文から） */
  what = what.replace(/急遽|急に/g, " ").replace(/^\s*(明け方|朝|昼|夕方|夜|晩|午前|午後)\s*/, "").replace(/\s+/g, " ");
  what = what.replace(/^[\s、,。]+|予定$|になった$|[\s、,。]+$/g, "");
  if (what !== before) what = what.replace(/^\s*(から|まで|に|の|へ)\s*(?![ぁ-ゖ])/, "");
  return what.trim();
}
/* 「何」から日付・時刻の言葉を外す（表示にも使う。外すと空になる時は元のまま） */
function cleanWhat(s) {
  const w = zen(s || "").replace(/\d{4}\s*[\/年.・-]\s*\d{1,2}\s*[\/月.・-]\s*\d{1,2}日?|\d{1,2}\s*[\/月.・-]\s*\d{1,2}日?|\d{1,2}:\d{2}|\d{1,2}\s*時(半|\d{1,2}\s*分)?/g, " ")
    .replace(/\s+/g, " ").replace(/^[\s、,。]+|[\s、,。]+$/g, "").trim();
  const changed = w !== zen(s || "").trim();
  const w2 = changed ? w.replace(/^(から|まで|に|の|へ)\s*(?![ぁ-ゖ])/, "").trim() : w;
  return w2 || String(s || "");
}
/* 打ち消し：「仕事ない」「出勤なし」「シフト入ってない」「出なくていい」は出勤ではなく休み。
   「休日出勤」「休みだけど出勤」は出勤のまま（打ち消しの言葉がないため） */
const WORK_NEG_RE = /(仕事|出勤|シフト|会社|バイト)\s*(は|が|も)?\s*(ない|無い|なし|無し|なくなった|休み|入ってない|入ってへん|入ってません|ありません|ないです)|出なくて(いい|よい|ok)|行かなくて(いい|よい)|休んで(いい|よい)/i;
const isWork = text => ACT_RE.出勤.test(text) && !WORK_NEG_RE.test(text);
/* 希望休：「希望休」「休み希望」、または日付・時刻のほかに「希望」しか書いていない行（シフトの希望休の書き方） */
const HOPE_OFF_RE = /希望休|休み希望|休希望|希望の休み/;
const onlyHope = text => String(text || "").replace(/[0-9０-９\/／月日.・\-ー〜~\s:：時分（）()年]|今日|明日|あした|明後日|あさって|[月火水木金土日]曜?/g, "") === "希望";
const isOff = text => WORK_NEG_RE.test(text) || HOPE_OFF_RE.test(text) || onlyHope(text) || (ACT_RE.休み.test(text) && !ACT_RE.出勤.test(text));
function ruleRead(text) {
  const d = readDate(text), tm = readTime(text);
  const act = isOff(text) ? "休み" : isWork(text) ? "出勤" : (Object.keys(ACT_RE).filter(k => k !== "出勤" && k !== "休み").find(k => ACT_RE[k].test(text)) || "その他");
  const kind = /毎日|毎朝|毎晩|毎週|習慣/.test(text) ? "習慣" : (d || tm) ? "予定" : /買う|かう|出す|払う|やる|する|片付け|返す|連絡|電話|見とく|しとく/.test(text) ? "やること" : "メモ";
  const what = cutWhat(text, d, tm);
  const m = what.match(/スタバ|[ァ-ヶー]{2,}|([一-龠]{1,3})?(駅|港|海岸|公園|役所|病院|郵便局|銀行)/);
  const place = m ? m[0].replace(/^[日月時分]+/, "") : "";
  return { kind, what: kind === "メモ" ? zen(text).trim() : (what || text), place, activity: act, date: d?.date || "", time: tm?.time || "", part: tm?.part || "" };
}

/* ---------- 手本帳（直した例を覚えておく＝ヤドカリのえさ） ----------
   直した時の「元の文 → 正しい種類・すること」をためる。
   ・同じ言葉が入った文は、次から直した通りに読む（コード）
   ・AIには、近い例を「前にこう直された」と一緒に見せてから読ませる（頭は変えない。見本を見せるだけ）
   ・控えのファイルで、別の端末（iPhone → iPad など）へ運んで足し合わせられる */
const FIX_MAX = 50;
const getFixes = () => { const v = getJ(K.fixes, []); return Array.isArray(v) ? v : []; };
function fixKey(o) { return (o.place || o.what || "").trim().slice(0, 20); }
function applyFixes(o, text) {
  const hit = getFixes().find(f => f.key && text.includes(f.key));
  if (!hit) return ownActGuard(o, text);
  if (hit.fixAct && actOK(hit.activity) && hit.activity !== o.activity) { o.activity = hit.activity; o.notes.push(`手本帳から：「${hit.key}」は ${hit.activity}`); }
  if (hit.fixKind && KINDS.includes(hit.kind) && hit.kind !== o.kind) { o.kind = hit.kind; o.notes.push(`手本帳から：「${hit.key}」は ${hit.kind}`); }
  return o;
}
/* 自分で足した すること の言葉が文に入っていたら、それを選ぶ（出勤・休みの見張りと手本帳のほうが先） */
function ownActGuard(o, text) {
  if (o.activity === "出勤" || o.activity === "休み") return o;
  const hit = getActs().add.find(a => text.includes(a));
  if (hit) { o.activity = hit; (o.notes ||= []).push(`自分の「すること」から：${hit}`); }
  return o;
}
function rememberFix(it, before) {
  const fixAct = it.activity !== before.activity, fixKind = it.kind !== before.kind;
  if (!fixAct && !fixKind) return;
  const key = fixKey(it); if (!key) return;
  const old = getFixes().find(f => f.key === key) || {};
  const list = getFixes().filter(f => f.key !== key);
  list.unshift({ key, src: String(it.src || "").slice(0, 200), kind: it.kind, activity: it.activity, fixAct: fixAct || !!old.fixAct, fixKind: fixKind || !!old.fixKind, at: Date.now() });
  setJ(K.fixes, list.slice(0, FIX_MAX));
}
/* AIに見せる見本：今の文に同じ言葉が入った例を先に、あとは新しい順。最大6つ */
function fixExamples(text) {
  const f = getFixes().filter(x => x.src);
  const near = f.filter(x => x.key && text.includes(x.key)), rest = f.filter(x => !near.includes(x));
  return near.concat(rest).slice(0, 6).map(x => `前にこう直された：「${x.src}」→ kind「${x.kind}」、activity「${x.activity}」`);
}
function mergeFixes(a, b) {
  const m = new Map();
  for (const f of a.concat(b)) { const o = m.get(f.key); if (!o || (f.at || 0) > (o.at || 0)) m.set(f.key, f); }
  return [...m.values()].sort((x, y) => (y.at || 0) - (x.at || 0)).slice(0, FIX_MAX);
}

/* ---------- 控え（押した時だけ）：書き出す／足し合わせて読み込む ---------- */
/* 控えに入れる「好み」：どの端末でも同じでいいものだけ（週のはじまり・曜日の書き方・数える項目・ローカルくんの名前）。
   月／週の見え方は端末ごと（iPhoneは週、iPadは月）なので入れない。カレンダーの許可も端末ごとに本人が選ぶので入れない */
const PREF_KEYS = ["yadokari.weekstart", "yadokari.wd", "yadokari.dash.tiles", "yadokari.ai.name", "yadokari.theme"];
/* 部品の中身（読書カードなど）。読み込む時は足し合わせる（同じ id は入れない） */
const MOD_DATA_KEYS = ["yadokari.books", "yadokari.habits", "yadokari.weeknotes"];
function getModData() { const o = { list: getJ("yadokari.mods", []) }; for (const k of MOD_DATA_KEYS) { const v = getJ(k, null); if (Array.isArray(v)) o[k] = v; } return o; }
function getPrefs() { const o = {}; for (const k of PREF_KEYS) { try { const v = localStorage.getItem(k); if (v !== null) o[k] = v.slice(0, 2000); } catch (_) {} } return o; }
function exportPlan() {
  const blob = new Blob([JSON.stringify({ app: "yadokari-lab-plan", format: 2, exportedAt: new Date().toISOString(), items: load(), fixes: getFixes(), acts: getActs(), prefs: getPrefs(), mods: getModData() })], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `yadokari-techo-${addDays(0)}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
const str = (v, n = 200) => typeof v === "string" ? v.slice(0, n) : "";
function cleanItem(it) {
  if (!it || typeof it !== "object") return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(it.date) ? it.date : "", time = /^\d{2}:\d{2}$/.test(it.time) ? it.time : "";
  return { id: str(it.id, 24).replace(/[^0-9a-z]/gi, "") || Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    kind: KINDS.includes(it.kind) ? it.kind : "メモ", date, time, part: str(it.part, 4), what: str(it.what), place: str(it.place, 60),
    activity: actOK(it.activity) ? it.activity : "その他", memo: str(it.memo, 1000), src: str(it.src, 500), made: Number(it.made) || Date.now() };
}
function cleanFix(f) {
  if (!f || typeof f.key !== "string" || !f.key.trim()) return null;
  return { key: f.key.slice(0, 20), src: str(f.src), kind: KINDS.includes(f.kind) ? f.kind : "", activity: actOK(f.activity) ? f.activity : "その他",
    fixAct: f.fixAct === undefined ? actOK(f.activity) : !!f.fixAct, fixKind: !!f.fixKind && KINDS.includes(f.kind), at: Number(f.at) || 0 };
}
async function importPlan(file) {
  let data; try { data = JSON.parse(await file.text()); } catch (_) { alert("このファイルは読めませんでした"); return; }
  if (!data || data.app !== "yadokari-lab-plan" || !Array.isArray(data.items)) { alert("手帳の控えファイルではないみたいです"); return; }
  /* 先に「自分の すること」を足し合わせる（でないと、その種類の予定が「その他」になる） */
  const inActs = data.acts && Array.isArray(data.acts.add) ? data.acts.add : [];
  const actsBefore = getActs();
  if (inActs.length) { const a = getActs(); setActs({ add: [...a.add, ...inActs.filter(x => typeof x === "string")], hide: a.hide }); }
  const inItems = data.items.map(cleanItem).filter(Boolean), inFixes = (Array.isArray(data.fixes) ? data.fixes : []).map(cleanFix).filter(Boolean);
  const cur = load(), seen = new Set(cur.map(x => x.id)), sig = x => `${x.date}|${x.time}|${x.what}|${x.src}`, seenSig = new Set(cur.map(sig));
  const add = inItems.filter(x => !seen.has(x.id) && !seenSig.has(sig(x)));
  const fx = mergeFixes(getFixes(), inFixes), newFix = fx.length - getFixes().length;
  if (!confirm(`控えを足し合わせます。${inActs.length ? `\n自分の すること：${inActs.join("・")}` : ""}\n予定など：新しく ${add.length} 件（同じものは入れません）\n手本帳（えさ）：${inFixes.length} 件を合わせて、全部で ${fx.length} 件に\n\n今ある中身は消えません。読み込んでもいい？`)) { setActs(actsBefore); return; }
  /* 好みは、控えにあって この端末でまだ決めていないものだけ入れる（今の好みは上書きしない） */
  const inPrefs = data.prefs && typeof data.prefs === "object" ? data.prefs : {};
  for (const k of PREF_KEYS) { try { if (typeof inPrefs[k] === "string" && localStorage.getItem(k) === null) localStorage.setItem(k, inPrefs[k].slice(0, 2000)); } catch (_) {} }
  const inMods = data.mods && typeof data.mods === "object" ? data.mods : {};
  if (Array.isArray(inMods.list)) { const cur = getJ("yadokari.mods", []); setJ("yadokari.mods", [...new Set([...(Array.isArray(cur) ? cur : []), ...inMods.list.filter(x => typeof x === "string").slice(0, 20)])]); }
  for (const k of MOD_DATA_KEYS) {
    if (!Array.isArray(inMods[k])) continue;
    const cur = Array.isArray(getJ(k, [])) ? getJ(k, []) : [], byId = new Map(cur.map(x => [x && x.id, x]));
    let changed = false;
    for (const x of inMods[k].slice(0, 2000)) {
      if (!x || typeof x !== "object" || typeof x.id !== "string") continue;
      const mine = byId.get(x.id);
      if (!mine) { cur.push(x); byId.set(x.id, x); changed = true; }
      /* 同じ習慣は、チェックした日を足し合わせる（消さない） */
      else if (Array.isArray(mine.days) && Array.isArray(x.days)) { const u = [...new Set([...mine.days, ...x.days.filter(d => typeof d === "string")])].sort(); if (u.length !== mine.days.length) { mine.days = u; changed = true; } }
    }
    if (changed) setJ(k, cur);
  }
  if (save(cur.concat(add))) { setJ(K.fixes, fx); dispatchEvent(new Event("yadokari:saved")); alert(`足し合わせました（予定など +${add.length}・手本帳 ${newFix >= 0 ? "+" + newFix : fx.length + "件"}）`); }
}
function fixSummary() { const f = getFixes(); return f.length ? `手本帳（えさ）：${f.length}件（${f.slice(0, 4).map(x => `${x.key}→${x.fixKind ? x.kind : x.activity}`).join("、")}${f.length > 4 ? "…" : ""}）` : "手本帳（えさ）：まだ空です"; }

/* ---------- ローカルくん（AI）の読み込み：地球儀の実験室と同じ席・同じ版 ---------- */
const LIBS = { light: "https://esm.run/@mlc-ai/web-llm@0.2.86", jp: "https://esm.run/@mlc-ai/web-llm@0.2.79" };
const libs = {};
const SEATS = {
  /* fit：どの端末向けか（📱 iPhone でも動く／💻 iPad・パソコン向け）。mem：動かす時に使うメモリの目安 */
  light: { label: "軽い：Qwen2.5 0.5B", size: "約0.4GB", mem: "約0.95GB", fit: "all", f16: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", f32: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC" },
  jp: { label: "少し上：TinySwallow 1.5B", size: "約1.2GB", mem: "約1.6GB", fit: "big", custom: true,
    repo: "https://huggingface.co/asai95/TinySwallow-1.5B-Instruct-q4f32_1-MLC", id: "TinySwallow-1.5B-Instruct-q4f32_1-MLC", libFrom: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC" },
};
let webllm = null, engine = null, curId = null, lastModel = null;
/* Gemma の仲間は「係の決まり」を別枠で受け取らないので、最初の文に混ぜて渡す */
const msgsFor = (sys, user) => /^gemma/i.test(curId || "") ? [{ role: "user", content: `${sys}\n\n---\n${user}` }] : [{ role: "system", content: sys }, { role: "user", content: user }];
const log = msg => { const el = $("aiLog"); if (el) el.textContent = msg; };
const setBar = w => { const b = $("aiBar"); if (b) b.style.width = w; };
const isPhone = () => /iPhone|Android.+Mobile/.test(navigator.userAgent);
async function hasF16() { try { const ad = await navigator.gpu?.requestAdapter(); return !!ad?.features?.has?.("shader-f16"); } catch (_) { return false; } }
async function modelFor(key) {
  const s = SEATS[key];
  if (!s.custom) { const f16 = await hasF16(); if (!f16 && !s.f32) throw new Error("この端末では、この席は動かせません（f16 が使えない）。軽い席を選んでね"); return { id: f16 ? s.f16 : s.f32, appConfig: undefined, chatOpts: s.chatOpts }; }
  const base = webllm.prebuiltAppConfig, lib = base.model_list.find(m => m.model_id === s.libFrom)?.model_lib;
  if (!lib) throw new Error("この版の WebLLM に、TinySwallow を動かす部品が見つかりませんでした");
  return { id: s.id, appConfig: { ...base, model_list: [...base.model_list, { model: s.repo, model_id: s.id, model_lib: lib }] } };
}
let loadingAI = false;
function showAIState() {
  const name = curId ? curId.split("-").slice(0, 2).join(" ") : "";
  const [cls, txt] = loadingAI ? ["wait", "🤖 AI：読み込み中…（終わるまでAIのボタンは押せません）"]
    : engine ? ["on", `🤖 AI：あり・${aiName()}が使えます（${name}）`]
    : ["", `🤖 AI：なし（${aiName()}の席を選ぶと使えます。AIなしの読み取りはそのまま使えます）`];
  document.querySelectorAll("[data-ai-state]").forEach(el => { el.className = "aiState " + cls; el.textContent = txt; });
}
function setBusy(b) {
  for (const id of ["aiLight", "aiJp", "pRule", "tRule"]) { const el = $(id); if (el) el.disabled = b; }
  for (const id of ["pAi", "tAi"]) { const el = $(id); if (el) el.disabled = b || !engine; }
  /* 消すボタンは、読み込みに失敗した時も押せるように（端末の中に残った分を消せる） */
  { const el = $("aiDel"); if (el) el.disabled = b || !("gpu" in navigator); }
  showAIState();
  dispatchEvent(new Event("yadokari:ai"));
}
async function loadAI(key, auto = false) {
  if (!("gpu" in navigator)) { log("この端末のブラウザには WebGPU（ウェブジーピーユー）がないので、AIは動かせません。AIなしの読み取りはそのまま使えます。"); return; }
  const s = SEATS[key];
  if (!auto && s.fit === "big" && isPhone() && !confirm(`⚠️ ${s.label} は 💻 iPad・パソコン向けです。\n動かすのに${s.mem}のメモリが要るので、iPhone ではほとんどの場合ページが止まります（予定は消えません）。\n止まったら、ページを開き直して「端末の中のモデルを消す」を押してね。\n\nそれでも読み込みますか？`)) return;
  if (!auto && key === "light" && !confirm(`${s.label}（${s.size}）を Hugging Face から読み込みます（端末の中にあれば通信しません）。読み込みますか？`)) return;
  loadingAI = true; setBusy(true); const t0 = performance.now();
  try {
    webllm = libs[key] ||= await import(LIBS[key]);
    const m = await modelFor(key); lastModel = m;
    if (engine) { try { await engine.unload(); } catch (_) {} engine = null; }
    log("読み込みを始めます…");
    engine = await webllm.CreateMLCEngine(m.id, { appConfig: m.appConfig, initProgressCallback: p => { log(`読み込み中：${Math.round((p.progress || 0) * 100)}%`); setBar(`${Math.round((p.progress || 0) * 100)}%`); } }, m.chatOpts);
    curId = m.id; try { localStorage.setItem(K.seat, key); } catch (_) {}
    log(`読み込み完了：${m.id}（${((performance.now() - t0) / 1000).toFixed(0)} 秒）。「AIに読み取ってもらう」が押せます。`);
  } catch (e) { engine = null; log(`読み込めませんでした（${s.label}）：` + (e?.message || e)); }
  finally { loadingAI = false; setBusy(false); }
}
async function delAI() {
  if (!("gpu" in navigator)) return;
  if (!confirm("この端末の中にあるローカルくんのモデルを、全部消しますか？（読み込みに失敗して残った分も消えます。地球儀の実験室と共有している場合は、そちらでも読み込み直しになります）")) return;
  setBusy(true); const gone = [];
  try {
    if (engine) { try { await engine.unload(); } catch (_) {} engine = null; }
    for (const key of Object.keys(SEATS)) {
      try {
        const lib = libs[key] ||= await import(LIBS[key]); webllm = lib;
        const s = SEATS[key], ids = s.custom ? [s.id] : [s.f16, s.f32].filter(Boolean);
        for (const id of ids) {
          const cfg = s.custom ? (await modelFor(key)).appConfig : undefined;
          if (await lib.hasModelInCache(id, cfg)) { await lib.deleteModelAllInfoInCache(id, cfg); gone.push(id); }
        }
      } catch (_) {}
    }
    /* 前に置いていた席（Gemma 3 1B・iPhoneで落ちたので外した）の残りも消す */
    try { const lib = libs.light ||= await import(LIBS.light); for (const id of ["gemma3-1b-it-q4f16_1-MLC"]) if (await lib.hasModelInCache(id)) { await lib.deleteModelAllInfoInCache(id); gone.push(id); } } catch (_) {}
    curId = null; setBar("0"); try { localStorage.removeItem(K.seat); } catch (_) {}
    log(gone.length ? `消しました：${gone.join("、")}。端末の容量が戻ります。` : "端末の中に、消すモデルはありませんでした。");
  } catch (e) { log("消せませんでした：" + (e?.message || e)); }
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
  `activity：${"{ACTS}"} から選ぶ。どれにも当てはまらなければ「その他」。仕事に行く時だけ「出勤」、休みの日（OFF・オフ・有給など）は「休み」`,
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
  const ex = fixExamples(text);
  const msgs = msgsFor(SYS.replace("{ACTS}", acts().join("・")) + (ex.length ? "\n" + ex.join("\n") : ""), text);
  let r; try { r = await engine.chat.completions.create({ messages: msgs, temperature: 0, max_tokens: 120, response_format: { type: "json_object", schema: JSON.stringify({ ...SCHEMA, properties: { ...SCHEMA.properties, activity: { type: "string", enum: acts() } } }) } }); }
  catch (_) { r = await engine.chat.completions.create({ messages: msgs, temperature: 0, max_tokens: 120 }); }
  const raw = (r.choices?.[0]?.message?.content || "").trim(), m = raw.match(/\{[\s\S]*\}/); let o = null; try { o = JSON.parse(m ? m[0] : raw); } catch (_) {}
  if (!o) return { bad: true, raw };
  /* 日付・時刻は元の文から。AIが抜き出した言葉は、元の文に本当にある時だけ使う（AIが時刻を作ることがあるため） */
  const inText = r => r && zen(text).includes(zen(r.how));
  const dw = readDate(o.when || ""), tw = readTime(o.when || "");
  const d = readDate(text) || (inText(dw) ? dw : null), tm = readTime(text) || (inText(tw) ? tw : null);
  const out = { kind: KINDS.includes(o.kind) ? o.kind : "メモ", what: String(o.what || ""), place: String(o.place || ""), activity: actOK(o.activity) ? o.activity : "その他",
    date: d?.date || "", time: tm?.time || "", part: tm?.part || "", notes: [], raw };
  /* 見張り1：「何」は元の文から */
  if (!whatIsFromSource(out.what, text)) { out.notes.push(`AIの「何」（${out.what || "空"}）は元の文にない言葉だったので、元の文から切り出しました`); out.what = cutWhat(text, d, tm) || text; }
  if (!readDate(text) && dw && !d) out.notes.push(`AIの日付（${dw.how}）は元の文になかったので使いませんでした`);
  if (!readTime(text) && tw && !tm && tw.time) out.notes.push(`AIの時刻（${tw.how}）は元の文になかったので使いませんでした`);
  /* 「何」に日付・時刻の言葉が残っていたら外す */
  { const w = cleanWhat(out.what); if (w && w !== out.what) out.what = w; }
  /* 見張り2：場所も元の文にない名前なら消す */
  if (out.place && !zen(text).includes(zen(out.place))) { out.notes.push(`AIの「場所」（${out.place}）は元の文になかったので外しました`); out.place = ""; }
  /* 見張り3：出勤は数える物（出勤日・時間）なので、手がかりの言葉がない時は使わない */
  if (out.activity === "出勤" && !isWork(text)) { const r2 = ruleRead(text).activity; out.notes.push(`「出勤」の手がかりになる言葉がないので「${r2}」にしました`); out.activity = r2; }
  /* 日付・時刻があるのに予定でなければ、予定に寄せる */
  if ((out.date || out.time) && out.kind === "メモ") out.kind = "予定";
  return out;
}

/* ---------- 重なりのチェック ----------
   同じ日に、似た予定がないかを見る。まずコードが「言葉の似かた」で探す。
   コードでは決めきれない近さの組だけ、ローカルくん（AI）に「同じ予定？」と聞ける。
   消すかどうかは必ず本人が決める（勝手に消さない）。「別の予定」と言われた組は覚えて、次から出さない */
K.dupOk = "yadokari.plan.dupok";
const normWhat = s => zen(s || "").replace(/\d{4}\s*[\/年.・-]\s*\d{1,2}\s*[\/月.・-]\s*\d{1,2}日?|\d{1,2}\s*[\/月.・-]\s*\d{1,2}日?|\d{1,2}:\d{2}|\d{1,2}\s*時(半|\d{1,2}\s*分)?/g, "")
  .replace(/急遽|急に|予定|する|します|行く|いく|行きます|に|へ|を|で|の|が|は|と|、|。|\s/g, "").toLowerCase();
function similarity(a, b) {
  const x = normWhat(a), y = normWhat(b);
  if (!x || !y) return 0; if (x === y) return 1; if (x.includes(y) || y.includes(x)) return 0.9;
  const bg = s => { const g = []; for (let i = 0; i < s.length - 1; i++) g.push(s.slice(i, i + 2)); return g.length ? g : [s]; };
  const A = bg(x), B = bg(y); let hit = 0; const pool = [...B]; for (const g of A) { const k = pool.indexOf(g); if (k >= 0) { hit++; pool.splice(k, 1); } }
  return 2 * hit / (A.length + B.length);
}
const pairKey = (a, b) => [a.id, b.id].sort().join("|");
const getDupOk = () => { const v = getJ(K.dupOk, []); return Array.isArray(v) ? v : []; };
function markDifferent(a, b) { const s = new Set(getDupOk()); s.add(pairKey(a, b)); setJ(K.dupOk, [...s].slice(-300)); }
function timeClash(a, b) { return a.time && b.time && a.time !== b.time; }
/* 返す：{ a, b, score, sure }  sure＝コードだけで「似ている」と言える組 */
function findDups(items) {
  const ok = new Set(getDupOk()), out = [], by = {};
  for (const it of items) if (it.date) (by[it.date] ||= []).push(it);
  for (const list of Object.values(by)) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j]; if (ok.has(pairKey(a, b))) continue;
    let s = Math.max(similarity(a.what, b.what), similarity(a.src, b.src)); if (timeClash(a, b)) s -= 0.3;
    if (s >= 0.6) out.push({ a, b, score: s, sure: true }); else if (s >= 0.3) out.push({ a, b, score: s, sure: false });
  }
  return out.sort((x, y) => y.score - x.score);
}
/* 入れる前の1回目のチェック：同じ日に似た予定があれば、カードに一言出す */
function dupHint(o) {
  if (!o.date) return "";
  const twin = load().filter(it => it.date === o.date).map(it => ({ it, s: Math.max(similarity(it.what, o.what), similarity(it.src, o.src)) - (timeClash(it, o) ? 0.3 : 0) })).filter(x => x.s >= 0.6).sort((a, b) => b.s - a.s)[0];
  return twin ? `同じ日に似た予定がもうあります：「${twin.it.what}」${twin.it.time ? "（" + twin.it.time + "）" : ""}。二重になっていないか見てね` : "";
}
/* 決めきれない組だけ、ローカルくんに聞く。答えは「同じ／ちがう」だけ */
async function aiSame(a, b) {
  if (!engine) throw new Error("AIが読み込まれていません");
  const sys = "あなたは手帳の係です。同じ日の予定が2つあります。同じ用事を二重に書いたものなら same を true、別の用事なら false にしたJSONだけを返します。説明は書きません。";
  const user = `日付：${a.date}\nA：${a.what}${a.time ? "（" + a.time + "）" : ""}　元の文「${a.src || ""}」\nB：${b.what}${b.time ? "（" + b.time + "）" : ""}　元の文「${b.src || ""}」`;
  const msgs = msgsFor(sys, user);
  let r; try { r = await engine.chat.completions.create({ messages: msgs, temperature: 0, max_tokens: 20, response_format: { type: "json_object", schema: JSON.stringify({ type: "object", properties: { same: { type: "boolean" } }, required: ["same"] }) } }); }
  catch (_) { r = await engine.chat.completions.create({ messages: msgs, temperature: 0, max_tokens: 20 }); }
  const raw = (r.choices?.[0]?.message?.content || ""); const m = raw.match(/"same"\s*:\s*(true|false)/);
  return m ? m[1] === "true" : null;
}
/* まとめる：残す方に、消す方の備考だけを足してから消す */
function mergeInto(keepId, dropId) {
  const items = load(), keep = items.find(x => x.id === keepId), drop = items.find(x => x.id === dropId); if (!keep || !drop) return false;
  if (drop.memo && !String(keep.memo || "").includes(drop.memo)) keep.memo = [keep.memo, drop.memo].filter(Boolean).join(" / ");
  /* 時刻と場所は残す方のまま（混ぜると、どちらでもない予定ができてしまうため） */
  return save(items.filter(x => x !== drop));
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
  <div class="reply"><div class="av">${esc(avatar())}</div><div class="bb">${esc(replyLine(o))}</div></div>
  ${o.notes?.length ? o.notes.map(t => `<div class="warn">${esc(t)}</div>`).join("") : ""}
  <div class="note"><span class="chip">読み取った人：${esc(who)}${sec != null ? `・${sec.toFixed(1)}秒` : ""}</span></div>
  <div class="pf"><span>種類</span><select id="${id("pKind")}">${opts(KINDS, o.kind)}</select></div>
  <div class="pf"><span>日付</span><input type="date" id="${id("pDate")}" value="${esc(o.date)}"></div>
  <div class="pf"><span>時刻</span><span style="display:flex;gap:6px"><input type="time" id="${id("pTime")}" value="${esc(o.time)}" style="flex:1"><button type="button" data-clear="${id("pTime")}" style="flex:0 0 auto">なし</button></span></div>
  <div class="pf"><span>何</span><input id="${id("pWhat")}" value="${esc(o.what)}"></div>
  <div class="pf"><span>場所</span><input id="${id("pPlace")}" value="${esc(o.place)}"></div>
  <div class="pf"><span>すること</span><select id="${id("pAct")}">${opts(actList(o.activity), o.activity)}</select></div>
  <div class="pf"><span>備考</span><textarea id="${id("pMemo")}" placeholder="空欄のままでも入れられます"></textarea></div>
  <div class="ctrl"><button type="button" class="main" data-pok="${i}">これで入れる</button><button type="button" data-pno="${i}">やめる</button></div></div>`;
}
function takeCard(i) {
  const d = drafts[i], v = k => $(`${k}-${i}`).value;
  const it = { id: Date.now().toString(36) + i, kind: v("pKind"), date: v("pDate"), time: v("pTime"), part: v("pTime") ? "" : (d.part || ""),
    what: v("pWhat").trim() || d.src, place: v("pPlace").trim(), activity: v("pAct"), memo: v("pMemo").trim(), src: d.src, made: Date.now() };
  rememberFix(it, d);
  return it;
}
function finishCard(i, html) { if (drafts[i]?.memoKey) { memoMarkSeen(drafts[i].memoKey); dispatchEvent(new Event("yadokari:memo")); } const el = $(`pc-${i}`); if (el) el.outerHTML = html; drafts[i] = null; if (drafts.every(x => !x)) { $("pIn").value = ""; const a = $("pAll"); if (a) a.remove(); } }
function saveCards(list) {
  const items = load(), got = list.map(takeCard); items.push(...got); if (!save(items)) return;
  const calOn = typeof window.calAllowed === "function" && window.calAllowed();
  list.forEach((i, k) => finishCard(i, `<div class="reply"><div class="av">${esc(avatar())}</div><div class="bb">入れたよ。${esc(replyLine(got[k]))}${calOn && got[k].date ? `<div style="margin-top:6px"><button type="button" data-cal="${esc(got[k].id)}">📅 カレンダーへ</button></div>` : ""}</div></div>`));
  dispatchEvent(new Event("yadokari:saved"));
}
/* 見張り4：元の文に「出勤・仕事・シフト」などがあるのに、すること が出勤でない時は出勤にする。
   出勤は日数を数える物なので、AIや手本帳より、書かれた言葉を優先する */
function workGuard(o, text) {
  if (isWork(text) && o.activity !== "出勤") { (o.notes ||= []).push(`「${(text.match(ACT_RE.出勤) || [""])[0]}」と書いてあるので、すること を「${o.activity}」から「出勤」にしました`); o.activity = "出勤"; }
  return o;
}
/* 見張り5：「休み・OFF・オフ・有給」などがあれば、すること は休み。日付があれば種類は予定。
   休みも出勤と同じく日数を数える物なので、書かれた言葉を優先する（出勤の言葉もある時は出勤のまま） */
function offGuard(o, text) {
  if (isOff(text)) {
    if (o.activity !== "休み") { (o.notes ||= []).push(WORK_NEG_RE.test(text) ? `「${text.match(WORK_NEG_RE)[0]}」は打ち消しなので、すること を「休み」にしました` : `「${(text.match(ACT_RE.休み) || text.match(HOPE_OFF_RE) || ["希望"])[0]}」と書いてあるので、すること を「休み」にしました`); o.activity = "休み"; }
    if (o.date && o.kind !== "予定") o.kind = "予定";
  }
  return o;
}
/* 見張り6：「買う・電話・出す・払う」などの用事で、時刻がなく、出勤・休みでもないものは、日付があっても「やること」
   （「今日牛乳を買う」は、今日の予定ではなく、今日のやること） */
const TODO_RE = /買う|かう|買い物|電話|出す|払う|振り込|返す|連絡|予約|申し込|見とく|しとく|やっとく|片付け|掃除|洗濯|調べる/;
function todoGuard(o, text) {
  if (o.kind === "予定" && !o.time && TODO_RE.test(text) && !isWork(text) && !isOff(text) && !/行く|いく|寄る|会う|集合/.test(text)) {
    o.kind = "やること"; (o.notes ||= []).push("時刻のない用事なので「やること」にしました（日付は残しています）");
  }
  return o;
}
function showCards(list, who, secs) {
  for (const o of list) { workGuard(o, o.src || ""); offGuard(o, o.src || ""); todoGuard(o, o.src || ""); }
  for (const o of list) { const hint = dupHint(o); if (hint) (o.notes ||= []).push(hint); }
  drafts = list.map(o => ({ ...o }));
  const n = list.length;
  $("pOut").innerHTML = (n > 1 ? `<p class="note">${n} 行あったので、1行ずつ読み取りました。</p>` : "")
    + list.map((o, i) => card(o, who, secs ? secs[i] : null, i, n)).join("")
    + (n > 1 ? `<div class="ctrl" id="pAll" style="margin-top:8px"><button type="button" class="main" data-pall>ぜんぶ入れる</button></div>` : "");
  $("pOut").onclick = e => {
    const cl = e.target.closest("[data-clear]"); if (cl) { const el = $(cl.dataset.clear); if (el) el.value = ""; return; }
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
  $("pOut").innerHTML = `<p class="aiState wait" id="pWait">🤖 ${esc(aiName())}が読み取っています… 0秒</p>`;
  const tick = setInterval(() => { const el = $("pWait"); if (el) el.textContent = `🤖 ${aiName()}が読み取っています…${lines.length > 1 ? ` ${k + 1}/${lines.length}行目` : ""} ${Math.round((performance.now() - t0) / 1000)}秒`; }, 1000);
  try {
    const out = [], secs = [];
    for (k = 0; k < lines.length; k++) {
      const t = lines[k], s0 = performance.now();
      let o = await Promise.race([aiRead(t), new Promise((_, rej) => setTimeout(() => rej(new Error("90秒たっても返事がありませんでした。もう一度押すか、AIなしで読み取ってください")), 90000))]);
      if (o.bad) { o = { ...ruleRead(t), notes: ["AIが読み取れなかったので、この行はAIなしで読みました"] }; }
      applyFixes(o, t); o.src = t; out.push(o); secs.push((performance.now() - s0) / 1000);
    }
    showCards(out, aiName() + "（" + curId.split("-").slice(0, 2).join(" ") + "）", secs);
  } catch (e) { $("pOut").innerHTML = `<p class="ng">止まりました：${esc(e?.message || e)}</p>`; }
  finally { clearInterval(tick); setBusy(false); }
}

/* ---------- ヤドカリのメモから拾う（ヤドカリ本体には書き込まない。読むだけ） ----------
   ヤドカリ（ひとりメモ）の「書きかけ」と「保存済み」から、自分が書いた文だけを読む。
   コード：日付・時刻・出勤・休み の言葉があるものを拾う
   ローカルくん：言葉で拾えなかったものだけ「予定ややることが書いてある？」と聞ける（目安）
   入れる・入れないは本人が決める。入れた／ちがう と決めたメモは覚えて、次から出さない */
K.memoSeen = "yadokari.memo.seen";
const MEMO_KEYS = { current: "hitori_memo_current_v4", saved: "hitori_memo_saved_v4" };
const memoKey = m => `${m.date}|${m.time}|${String(m.text).slice(0, 80)}`;
function readMemos() {
  const out = [], seen = new Set(getJ(K.memoSeen, []));
  const push = (m, from) => { if (!m || m.role !== "user" || typeof m.text !== "string" || !m.text.trim()) return; const k = memoKey(m); if (seen.has(k) || out.some(x => x.key === k)) return;
    out.push({ key: k, text: m.text.trim().slice(0, 300), date: /^\d{4}-\d{2}-\d{2}$/.test(m.date) ? m.date : "", time: typeof m.time === "string" ? m.time : "", from }); };
  const cur = getJ(MEMO_KEYS.current, {}); for (const m of (cur && Array.isArray(cur.messages) ? cur.messages : [])) push(m, "書きかけ");
  const saved = getJ(MEMO_KEYS.saved, []); for (const s of (Array.isArray(saved) ? saved : [])) for (const m of (s && Array.isArray(s.messages) ? s.messages : [])) push(m, s.title ? `保存「${String(s.title).slice(0, 20)}」` : "保存済み");
  return out.sort((a, b) => (b.date + b.time) < (a.date + a.time) ? -1 : 1).slice(0, 200);
}
function memoMarkSeen(key) { const s = getJ(K.memoSeen, []); if (!s.includes(key)) s.push(key); setJ(K.memoSeen, s.slice(-1000)); }
/* コードで「予定かも」と言える手がかり */
function memoClue(m) {
  const t = m.text; const d = withBase(m.date, () => readDate(t)), tm = readTime(t);
  /* 「今日は〜」はその日の出来事の記録が多いので、それだけでは拾わない（時刻や出勤・休みの言葉がある時は拾う） */
  if (d && !/^(今日|きょう|本日)$/.test(d.how)) return `日付「${d.how.trim()}」`; if (tm && tm.time) return `時刻「${tm.how}」`;
  if (WORK_NEG_RE.test(t)) return `「${t.match(WORK_NEG_RE)[0]}」`; if (ACT_RE.出勤.test(t)) return `「${t.match(ACT_RE.出勤)[0]}」`; if (ACT_RE.休み.test(t)) return `「${t.match(ACT_RE.休み)[0]}」`;
  return "";
}
async function aiIsPlan(text) {
  if (!engine) throw new Error("AIが読み込まれていません");
  const sys = "あなたは手帳の係です。ひとりメモに書かれた一文を読んで、これから行う予定・やること・休みの日が書いてあれば plan を true、ただの気持ちや出来事の記録なら false にしたJSONだけを返します。説明は書きません。";
  const msgs = msgsFor(sys, text);
  let r; try { r = await engine.chat.completions.create({ messages: msgs, temperature: 0, max_tokens: 20, response_format: { type: "json_object", schema: JSON.stringify({ type: "object", properties: { plan: { type: "boolean" } }, required: ["plan"] }) } }); }
  catch (_) { r = await engine.chat.completions.create({ messages: msgs, temperature: 0, max_tokens: 20 }); }
  const m = (r.choices?.[0]?.message?.content || "").match(/"plan"\s*:\s*(true|false)/); return m ? m[1] === "true" : null;
}
/* 拾ったメモを、ふだんの確認カードに渡す（「明日」はメモを書いた日の明日として読む） */
function memoToCard(m) {
  const o = withBase(m.date, () => applyFixes({ ...ruleRead(m.text), notes: [] }, m.text)); o.src = m.text; o.memoKey = m.key;
  if (m.date) o.notes.push(`ヤドカリに書いた日（${DF(m.date)}）を基準に読みました`);
  showCards([o], "AIなし（ヤドカリのメモから）");
  const el = $("pOut"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
