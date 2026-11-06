/**
 * Nextwing Quest – gemeinsamer Spielstand für Mehrspieler-Quests.
 * Bereitstellen als Web-App (Ausführen als: ich, Zugriff: Jeder).
 * Bei Änderungen: Bereitstellen → Bereitstellungen verwalten → Bearbeiten → Version „Neue Version“ (URL bleibt gleich).
 *
 * ADVENTSKALENDER: Spieler, Codes und E-Mails stehen NUR hier (privat in deinem Google-Konto).
 * Neue Spieler einfach unten ergänzen, Feld `from` = ab welchem Tag sie mitspielen (1 = von Anfang an).
 * Wer aussteigt, bekommt `until: <letzter Tag>`. Danach speichern und eine neue Version bereitstellen.
 * Einmalig: Funktion installAdventTriggers() auswählen und ausführen (20 Uhr Erinnerung, 22 Uhr Bericht).
 * Zeitzone des Projekts muss Europe/Berlin sein (Projekteinstellungen).
 */
var ADVENT = {
  link: 'https://quest.nextwing.de/advent/',
  helpHour: 21,
  lead: { code: 'POLARSTERN-LEITUNG', name: 'Spielleitung', email: '' },   // email: deine Adresse für den Tagesbericht
  games: {
    'advent-2026': { start: '2026-12-01', players: [
      // { id: 'p1', name: 'Anna', code: 'ANNA-STERN', email: 'anna@example.de', from: 1 },
    ]},
    'advent-probe': { start: '2026-11-23', players: [
      // Testlauf 23.–27.11.
    ]}
  },
  phrase: 'FROHEWEIHNACHTENALLESAMT',
  titles: ['Der Knall am Nordpol','Frau Weihnachtsmanns Plätzchen','Der verschlüsselte Wunschzettel','Das Wichtel-Memory','Der Weg zum Rentierstall','Nikolaus kommt zu Besuch','Das Glockenspiel im Turm','Der Rentier-Dienstplan','Stau im Geschenkelager','Das Polarlicht funkt','Die Lebkuchen-Rechnung','Stromausfall in der Werkstatt','Die Christbaumkugeln','Der vereiste Brief','Die große Schneeballschlacht','Die Kuckucksuhr','Wichtelnamen-Salat','Das Geschenkpapier-Muster','Der Glühweinkessel','Spuren im Schnee','Der Tresor des Weihnachtsmanns','Sternschnuppen','Der Schlitten klemmt','Heiligabend']
};

function doGet(e) {
  var p = e.parameter || {};
  var game = String(p.g || 'default').replace(/[^a-z0-9-]/gi, '').slice(0, 40);
  var out;
  if (p.a === 'login') return json(adventLogin(game, p.code));
  var lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    var props = PropertiesService.getScriptProperties();
    var key = 'state-' + game;
    var st = JSON.parse(props.getProperty(key) || 'null');
    if (p.a === 'ev' && p.d) {
      var ev = JSON.parse(p.d);
      ev.t = Date.now();
      if (ADVENT.games[game]) {
        var who = whoIs(game, ev.code);
        delete ev.code;
        if (who && !(ev.k === 'solve' && !who.lead && (ev.day > dayOf(game) || ev.day < 1))) { ev.p = who.id; st = reduceAdvent(st, ev, who.lead); props.setProperty(key, JSON.stringify(st)); }
      } else {
        st = reduce(st, ev);
        props.setProperty(key, JSON.stringify(st));
      }
    }
    out = { ok: true, state: st };
  } catch (err) {
    out = { ok: false, error: String(err) };
  } finally {
    lock.releaseLock();
  }
  return json(out);
}
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function normCode(s) { return String(s || '').toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS').replace(/[^A-Z0-9]/g, ''); }

/* ---------- Kirmes und andere Rundenspiele ---------- */
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

/* ---------- Adventskalender ---------- */
function players(game) { return (ADVENT.games[game] || { players: [] }).players; }
function whoIs(game, code) {
  var c = normCode(code);
  if (!c) return null;
  if (c === normCode(ADVENT.lead.code)) return { id: 'lead', name: ADVENT.lead.name, lead: true };
  var ps = players(game);
  for (var i = 0; i < ps.length; i++) if (normCode(ps[i].code) === c) return { id: ps[i].id, name: ps[i].name };
  return null;
}
function publicPlayers(game) { return players(game).map(function (p) { return { id: p.id, name: p.name, from: p.from || 1, until: p.until || null }; }); }
function adventLogin(game, code) {
  var who = whoIs(game, code);
  if (!who) return { ok: false };
  return { ok: true, me: who, players: publicPlayers(game) };
}
function reduceAdvent(st, ev, isLead) {
  if (!st || (ev.k === 'reset' && isLead)) st = { v: 1, p: {}, d: {}, feed: [], fin: null };
  if (ev.k === 'reset') return st;
  var t = ev.t || Date.now();
  if (!ev.p || ev.p === 'lead') return st;
  var p = st.p[ev.p] = st.p[ev.p] || { join: 0, seen: 0 };
  function push(o) { o.t = t; o.p = ev.p; st.feed.push(o); if (st.feed.length > 60) st.feed = st.feed.slice(-60); }
  if (ev.k === 'join') { if (!p.join) { p.join = t; push({ k: 'join' }); } p.seen = t; }
  if (ev.k === 'seen') p.seen = t;
  if (ev.k === 'solve' && ev.day >= 1 && ev.day <= 24 && !st.d[ev.day]) { st.d[ev.day] = { by: ev.p, t: t, tips: ev.tips | 0, help: !!ev.help, l: ADVENT.phrase.charAt(ev.day - 1) }; push({ k: 'solve', day: ev.day, help: !!ev.help }); }
  if (ev.k === 'cheer' && ev.to) push({ k: 'cheer', to: String(ev.to).slice(0, 8), e: String(ev.e || '👏').slice(0, 4) });
  if (ev.k === 'final' && !st.fin) { st.fin = { p: ev.p, t: t }; push({ k: 'final' }); }
  return st;
}
/* Reihum, neue Spieler stellen sich hinten an (identisch mit dem Spiel). */
function assignments(ps) {
  var q = [], out = {};
  for (var d = 1; d <= 24; d++) {
    ps.forEach(function (p) { if (Math.max(1, p.from || 1) === d) q.push(p.id); });
    var id = null;
    for (var k = 0, n = q.length; k < n; k++) {
      var c = q.shift(), pl = ps.filter(function (x) { return x.id === c; })[0];
      if (pl && (!pl.until || pl.until >= d)) { id = c; q.push(c); break; }
    }
    out[d] = id;
  }
  return out;
}
function dayOf(game) {
  var s = ADVENT.games[game].start.split('-');
  var start = new Date(+s[0], +s[1] - 1, +s[2]);
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - start) / 864e5) + 1;
}
function stateOf(game) { return JSON.parse(PropertiesService.getScriptProperties().getProperty('state-' + game) || 'null') || { d: {}, p: {} }; }

/* 20 Uhr: freundliche Erinnerung an den Tagesspieler, nur wenn das Türchen noch offen ist und eine E-Mail hinterlegt ist. */
function adventReminder() {
  Object.keys(ADVENT.games).forEach(function (game) {
    var d = dayOf(game);
    if (d < 1 || d > 23) return;
    var st = stateOf(game);
    if (st.d && st.d[d]) return;
    var ps = players(game), id = assignments(ps)[d];
    var pl = ps.filter(function (x) { return x.id === id; })[0];
    if (!pl || !pl.email) return;
    var url = ADVENT.link + (game === 'advent-probe' ? '?probe=1' : '') + '#' + normCode(pl.code);
    var body = '<p>Hallo ' + esc(pl.name) + ',</p>' +
      '<p>hier ist Oberwichtel Pfefferkorn. Ich will ja nicht drängeln, aber Türchen ' + d + ' (»' + esc(ADVENT.titles[d - 1]) + '«) ist noch zu, und heute bist du dran.</p>' +
      '<p>Ab ' + ADVENT.helpHour + ' Uhr dürfen die anderen Wichtel mitraten. Du schaffst das vorher, ich hab da ein gutes Gefühl. Meistens.</p>';
    sendXmas(pl.email, 'Türchen ' + d + ' wartet noch auf dich', body, url, 'Zu meinem Türchen');
  });
}
/* 22 Uhr: Tagesbericht an die Spielleitung. */
function adventReport() {
  if (!ADVENT.lead.email) return;
  Object.keys(ADVENT.games).forEach(function (game) {
    var d = dayOf(game);
    if (d < 1 || d > 24) return;
    var ps = players(game); if (!ps.length) return;
    var st = stateOf(game), as = assignments(ps), name = function (id) { var x = ps.filter(function (p) { return p.id === id; })[0]; return x ? x.name : '–'; };
    var s = st.d && st.d[d];
    var found = st.d ? Object.keys(st.d).length : 0;
    var rows = '';
    for (var k = 1; k <= Math.min(d, 24); k++) { var x = st.d && st.d[k]; rows += '<tr><td style="padding:4px 8px">' + k + '</td><td style="padding:4px 8px">' + esc(name(as[k])) + '</td><td style="padding:4px 8px">' + (x ? esc(name(x.by)) + (x.help ? ' (Hilfe)' : '') : '<b style="color:#c2410c">offen</b>') + '</td></tr>'; }
    var body = '<p><b>' + (game === 'advent-probe' ? 'Testlauf, ' : '') + 'Tag ' + d + ':</b> ' + (s ? 'gelöst von ' + esc(name(s.by)) + (s.help ? ' mit Wichtelhilfe' : '') : 'noch offen (dran: ' + esc(name(as[d])) + ')') + '.</p>' +
      '<p>Polarstern: ' + found + ' von 24 Splittern.' + (d < 24 ? ' Morgen ist ' + esc(name(as[d + 1])) + ' dran.' : '') + '</p>' +
      '<table style="border-collapse:collapse;font-size:14px"><tr style="background:#f6f8fc"><th style="padding:4px 8px;text-align:left">Tag</th><th style="padding:4px 8px;text-align:left">dran</th><th style="padding:4px 8px;text-align:left">gelöst von</th></tr>' + rows + '</table>';
    sendXmas(ADVENT.lead.email, 'Polarstern-Advent: Bericht Tag ' + d, body, ADVENT.link + (game === 'advent-probe' ? '?probe=1' : ''), 'Zur Anzeigetafel');
  });
}
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function sendXmas(to, subject, inner, url, label) {
  var html = '<div style="background:#f6f8fc;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif">' +
    '<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden">' +
    '<div style="background:#0b1220;padding:18px 22px"><div style="color:#EEF3FF;font-size:20px;font-weight:700">Wichtelpost vom Nordpol</div><div style="color:#8eacff;font-size:14px">Der Polarstern-Advent</div></div>' +
    '<div style="height:3px;background:#ff6a1f"></div>' +
    '<div style="padding:22px;color:#0E1526;font-size:15px;line-height:23px">' + inner +
    '<p style="margin:22px 0 6px"><a href="' + url + '" style="background:#c2410c;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;display:inline-block">' + label + '</a></p>' +
    '<p style="color:#535e73;font-size:13px">Mit frostigen Grüßen, Oberwichtel Pfefferkorn</p></div></div></div>';
  MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, name: 'Oberwichtel Pfefferkorn' });
}
/* Einmal ausführen: legt die beiden täglichen Zeitpläne an. */
function installAdventTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { var f = t.getHandlerFunction(); if (f === 'adventReminder' || f === 'adventReport') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('adventReminder').timeBased().everyDays(1).atHour(20).nearMinute(0).create();
  ScriptApp.newTrigger('adventReport').timeBased().everyDays(1).atHour(22).nearMinute(0).create();
}
/* Zum Ausprobieren der Mails: schickt die Erinnerung sofort an die Spielleitung. */
function testReminderMail() { sendXmas(ADVENT.lead.email, 'Test: Türchen 3 wartet noch auf dich', '<p>Hallo Test,</p><p>so sieht die Erinnerung um 20 Uhr aus.</p>', ADVENT.link, 'Zu meinem Türchen'); }
