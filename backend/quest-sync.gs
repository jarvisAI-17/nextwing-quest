/**
 * Nextwing Quest – gemeinsamer Spielstand für Mehrspieler-Quests (z. B. /soest/).
 * Einmal als Web-App bereitstellen: Bereitstellen → Neue Bereitstellung → Typ „Web-App“,
 * Ausführen als: ich, Zugriff: Jeder. Die /exec-URL dann in soest/api.js eintragen.
 * Speichert nur Spielfortschritt (wer hat welche Runde gelöst, Anfeuern), keine persönlichen Daten.
 */
function doGet(e) {
  var p = e.parameter || {};
  var game = String(p.g || 'default').replace(/[^a-z0-9-]/gi, '').slice(0, 40);
  var key = 'state-' + game;
  var lock = LockService.getScriptLock();
  lock.waitLock(8000);
  var out;
  try {
    var props = PropertiesService.getScriptProperties();
    var st = JSON.parse(props.getProperty(key) || 'null');
    if (p.a === 'ev' && p.d) {
      var ev = JSON.parse(p.d);
      ev.t = Date.now();
      st = reduce(st, ev);
      props.setProperty(key, JSON.stringify(st));
    }
    out = { ok: true, state: st };
  } catch (err) {
    out = { ok: false, error: String(err) };
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* Identisch mit dem Reducer im Spiel. */
function reduce(st, ev) {
  if (!st || ev.k === 'reset') st = { v: 1, p: {}, feed: [], fin: null };
  var t = ev.t || Date.now();
  if (!ev.p || !/^[A-Z]$/.test(ev.p)) return st;
  var p = st.p[ev.p] = st.p[ev.p] || { s: {}, join: 0, seen: 0 };
  function push(o) { o.t = t; o.p = ev.p; st.feed.push(o); if (st.feed.length > 40) st.feed = st.feed.slice(-40); }
  if (ev.k === 'join') { if (!p.join) { p.join = t; push({ k: 'join' }); } p.seen = t; }
  if (ev.k === 'seen') p.seen = t;
  if (ev.k === 'solve' && ev.r != null && !p.s[ev.r]) { p.s[ev.r] = { t: t, tips: ev.tips | 0, l: String(ev.l || '').slice(0, 1) }; push({ k: 'solve', r: ev.r, tips: ev.tips | 0 }); }
  if (ev.k === 'cheer' && ev.to) push({ k: 'cheer', to: String(ev.to).slice(0, 1), e: String(ev.e || '👏').slice(0, 4) });
  if (ev.k === 'final' && !st.fin) { st.fin = { p: ev.p, t: t }; push({ k: 'final' }); }
  return st;
}
