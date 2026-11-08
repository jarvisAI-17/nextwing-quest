// Nextwing Quest – Cloudflare Worker
// Liefert die statischen Spiele aus und stellt die Shop-API bereit:
//   POST /api/checkout        Stripe-Checkout-Sitzung anlegen (Preise kommen nur vom Server)
//   POST /api/stripe-webhook  Zahlungsbestätigung von Stripe (Signatur wird geprüft)
//   GET  /api/order?session_id=…  Status und Spielerlinks für die Danke-Seite
//   GET  /api/health          Konfiguration prüfen (verrät keine Schlüssel)
// Geheimnisse (in Cloudflare unter Settings → Variables and Secrets):
//   STRIPE_SECRET_KEY       sk_test_… (Sandbox) bzw. später sk_live_…
//   STRIPE_WEBHOOK_SECRET   whsec_…

import { DurableObject } from "cloudflare:workers";

// Produktkatalog: Preise in Cent, brutto inkl. 19 % MwSt.
const CATALOG = {
  "tv":           { name: "Fernseh-Party",          cents: 1900, maxPlayers: 10 },
  "handy-4":      { name: "Spieleabend am Handy (bis 4)", cents: 1900, maxPlayers: 4 },
  "handy-8":      { name: "Spieleabend am Handy (bis 8)", cents: 2900, maxPlayers: 8 },
  "countdown-7":  { name: "Countdown 7 Tage",       cents: 2900, maxPlayers: 10 },
  "advent-24":    { name: "Adventskalender 24 Türchen", cents: 5900, maxPlayers: 10 }
};
const ADDONS = { "fotos": { name: "Fotos und Insider", cents: 1000 } };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      if (url.pathname === "/api/health") return json({ ok: true, stripe: !!env.STRIPE_SECRET_KEY, mode: (env.STRIPE_SECRET_KEY || "").startsWith("sk_live_") ? "live" : "test", webhook: !!env.STRIPE_WEBHOOK_SECRET });
      if (url.pathname === "/api/checkout" && request.method === "POST") return await checkout(request, env, url);
      if (url.pathname === "/api/stripe-webhook" && request.method === "POST") return await webhook(request, env);
      if (url.pathname === "/api/order" && request.method === "GET") return await order(url, env);
      if (url.pathname === "/api/game" && request.method === "GET") return await game(url, env);
      return json({ error: "Unbekannte Adresse" }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: "Interner Fehler", detail: String(e && e.message || e) }, 500);
    }
  }
};

function store(env) { return env.ORDERS.get(env.ORDERS.idFromName("orders")); }

async function checkout(request, env, url) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Stripe-Schlüssel fehlt noch in Cloudflare (STRIPE_SECRET_KEY)." }, 503);
  const b = await request.json().catch(() => ({}));
  const product = CATALOG[b.product];
  if (!product) return json({ error: "Unbekanntes Produkt" }, 400);
  const players = (Array.isArray(b.players) ? b.players : []).map(s => String(s).trim().slice(0, 30)).filter(Boolean);
  if (players.length < 1 || players.length > product.maxPlayers) return json({ error: `Bitte 1 bis ${product.maxPlayers} Mitspieler angeben.` }, 400);
  if (b.consent !== true) return json({ error: "Bitte der sofortigen Bereitstellung zustimmen." }, 400);
  const email = String(b.email || "").trim();
  const origin = url.origin;

  const p = new URLSearchParams();
  p.set("mode", "payment");
  p.set("success_url", `${origin}/danke/?session_id={CHECKOUT_SESSION_ID}`);
  p.set("cancel_url", `${origin}/shop-test/?abgebrochen=1`);
  p.set("locale", "de");
  p.set("allow_promotion_codes", "true");
  p.set("billing_address_collection", "auto");
  p.set("tax_id_collection[enabled]", "true");
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) p.set("customer_email", email);
  let i = 0;
  const addLine = (name, cents) => {
    p.set(`line_items[${i}][quantity]`, "1");
    p.set(`line_items[${i}][price_data][currency]`, "eur");
    p.set(`line_items[${i}][price_data][unit_amount]`, String(cents));
    p.set(`line_items[${i}][price_data][tax_behavior]`, "inclusive");
    p.set(`line_items[${i}][price_data][product_data][name]`, name);
    i++;
  };
  addLine(product.name, product.cents);
  if (b.fotos) addLine(ADDONS.fotos.name, ADDONS.fotos.cents);
  // Metadaten: kleine Felder, max. 500 Zeichen pro Wert
  p.set("metadata[product]", b.product);
  p.set("metadata[players]", players.join("|").slice(0, 490));
  p.set("metadata[genre]", String(b.genre || "überrascht uns").slice(0, 60));
  p.set("metadata[anlass]", String(b.anlass || "").slice(0, 120));
  p.set("metadata[fotos]", b.fotos ? "ja" : "nein");
  p.set("metadata[consent_sofort]", new Date().toISOString());
  p.set("custom_text[submit][message]", "Dein Spiel wird direkt nach der Zahlung erstellt. Die Spielerlinks erscheinen sofort auf der nächsten Seite.");

  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { "authorization": `Bearer ${env.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded" },
    body: p
  });
  const s = await r.json();
  if (!r.ok) return json({ error: "Stripe hat die Sitzung abgelehnt", detail: s.error && s.error.message }, 502);
  return json({ url: s.url, id: s.id });
}

// Stripe-Signatur: Header "t=…,v1=…", HMAC-SHA256 über "t.body"
async function verifyStripe(body, header, secret, toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map(x => x.split("=")).filter(x => x.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const sigs = header.split(",").filter(x => x.trim().startsWith("v1=")).map(x => x.trim().slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`)));
  const hex = [...mac].map(b => b.toString(16).padStart(2, "0")).join("");
  return sigs.some(s => s.length === hex.length && timingSafeEqual(s, hex));
}
function timingSafeEqual(a, b) { let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

async function webhook(request, env) {
  const body = await request.text();
  const ok = await verifyStripe(body, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return json({ error: "Signatur ungültig" }, 400);
  const ev = JSON.parse(body);
  if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
    const s = ev.data.object;
    if (s.payment_status !== "paid") return json({ received: true, note: "noch nicht bezahlt" });
    const res = await store(env).createGame(s, new URL(request.url).origin);
    return json({ received: true, game: res.gameId, neu: res.created });
  }
  return json({ received: true, ignored: ev.type });
}

async function order(url, env) {
  const id = url.searchParams.get("session_id") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json({ error: "Ungültige Sitzung" }, 400);
  const o = await store(env).getOrder(id);
  if (!o) return json({ status: "warten" }); // Webhook noch nicht da
  return json({ status: "fertig", ...o });
}

async function game(url, env) {
  const g = url.searchParams.get("g") || "", c = url.searchParams.get("c") || "";
  if (!/^[A-Z2-9]{8}$/.test(g) || !/^[A-Z2-9]{6,10}$/.test(c)) return json({ error: "Link ungültig" }, 400);
  const r = await store(env).getGame(g, c);
  return r ? json(r) : json({ error: "Spiel oder Code nicht gefunden" }, 404);
}

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function code(n) { const b = crypto.getRandomValues(new Uint8Array(n)); return [...b].map(x => ALPHA[x % ALPHA.length]).join(""); }

// Bestellungen in einem Durable Object mit SQLite (kostenloser Tarif, keine Einrichtung nötig)
export class OrderStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS orders(
      session_id TEXT PRIMARY KEY, game_id TEXT, created_at TEXT, email TEXT, name TEXT,
      product TEXT, amount INTEGER, currency TEXT, players TEXT, meta TEXT, livemode INTEGER)`);
  }
  async createGame(s, origin) {
    const ex = [...this.sql.exec("SELECT game_id FROM orders WHERE session_id=?", s.id)][0];
    if (ex) return { gameId: ex.game_id, created: false }; // Stripe schickt Ereignisse ggf. mehrfach
    const m = s.metadata || {};
    const gameId = code(8);
    const names = (m.players || "").split("|").filter(Boolean);
    const players = names.map(n => ({ name: n, code: code(6) }));
    const lead = { name: "Spielleitung", code: code(10) };
    this.sql.exec("INSERT INTO orders VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      s.id, gameId, new Date().toISOString(),
      (s.customer_details && s.customer_details.email) || s.customer_email || "",
      (s.customer_details && s.customer_details.name) || "",
      m.product || "", s.amount_total || 0, s.currency || "eur",
      JSON.stringify({ lead, players }), JSON.stringify(m), s.livemode ? 1 : 0);
    return { gameId, created: true };
  }
  async getGame(gameId, c) {
    const r = [...this.sql.exec("SELECT * FROM orders WHERE game_id=?", gameId)][0];
    if (!r) return null;
    const pl = JSON.parse(r.players), m = JSON.parse(r.meta);
    const me = pl.lead.code === c ? { name: pl.lead.name, role: "leitung" } : (pl.players.find(p => p.code === c) ? { name: pl.players.find(p => p.code === c).name, role: "spieler" } : null);
    if (!me) return null;
    return { gameId, me, product: r.product, genre: m.genre, anlass: m.anlass, players: pl.players.map(p => p.name), status: "in Vorbereitung" };
  }
  async getOrder(sessionId) {
    const r = [...this.sql.exec("SELECT * FROM orders WHERE session_id=?", sessionId)][0];
    if (!r) return null;
    const pl = JSON.parse(r.players), m = JSON.parse(r.meta);
    return { gameId: r.game_id, product: r.product, amount: r.amount, email: r.email, genre: m.genre, anlass: m.anlass, lead: pl.lead, players: pl.players, test: !r.livemode };
  }
}
