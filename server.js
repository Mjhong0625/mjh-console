require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PASS = process.env.CONSOLE_PASSWORD;
if (!PASS || PASS.length < 10) { console.error("请设置 CONSOLE_PASSWORD（至少10位）"); process.exit(1); }
const DIR = process.env.DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(DIR, { recursive: true });
const FILE = path.join(DIR, "brands.json");
let brands = [];
try { brands = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (e) {}
const save = () => { fs.writeFileSync(FILE + ".tmp", JSON.stringify(brands, null, 1)); fs.renameSync(FILE + ".tmp", FILE); };

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 登入：单一密码，签名 cookie（重启后仍有效）
const SECRET = crypto.createHash("sha256").update("mjh:" + PASS).digest("hex");
const sign = (t) => t + "." + crypto.createHmac("sha256", SECRET).update(t).digest("hex");
const verify = (c) => { const [t, s] = String(c || "").split("."); return t && s && sign(t) === c && Date.now() < Number(t); };
const cookie = (req) => (req.headers.cookie || "").split(";").map(s => s.trim()).find(s => s.startsWith("mjh="))?.slice(4);
const fails = new Map();
app.post("/api/login", (req, res) => {
  const ip = req.ip, f = fails.get(ip) || { n: 0, t: 0 };
  if (f.n >= 8 && Date.now() - f.t < 600000) return res.status(429).json({ error: "尝试过多，请稍后再试" });
  const a = Buffer.from(String(req.body.password || "")), b = Buffer.from(PASS);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { fails.set(ip, { n: f.n + 1, t: Date.now() }); return res.status(401).json({ error: "密码错误" }); }
  fails.delete(ip);
  const t = String(Date.now() + 7 * 86400000);
  res.setHeader("Set-Cookie", `mjh=${sign(t)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  res.json({ ok: true });
});
app.post("/api/logout", (req, res) => { res.setHeader("Set-Cookie", "mjh=; Max-Age=0; Path=/"); res.json({ ok: true }); });
// ---- 客户统一入口：输入账号 -> 找出所属品牌 -> 跳转到该品牌后台 ----
const findFails = new Map();
app.post("/go", async (req, res) => {
  const ip = req.ip, f = findFails.get(ip) || { n: 0, t: 0 };
  if (Date.now() - f.t > 600000) { f.n = 0; }
  if (f.n >= 20) return res.status(429).json({ error: "尝试过多，请稍后再试" });
  const u = clean(req.body.username).toLowerCase();
  if (!/^[a-z0-9_.-]{2,40}$/.test(u) || u === "owner") { findFails.set(ip, { n: f.n + 1, t: Date.now() }); return res.status(404).json({ error: "找不到这个账号，请确认或联系技术支持" }); }
  const hits = (await Promise.all(brands.map(async (b) => {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 6000);
    try { const r = await fetch(b.url + "/api/platform/has-user?u=" + encodeURIComponent(u), { headers: { "x-platform-key": b.key }, signal: ctl.signal }); const j = await r.json(); return j.exists ? b : null; }
    catch (e) { return null; } finally { clearTimeout(tm); }
  }))).filter(Boolean);
  if (hits.length !== 1) { findFails.set(ip, { n: f.n + 1, t: Date.now() }); return res.status(hits.length ? 409 : 404).json({ error: hits.length ? "账号重复，请联系技术支持" : "找不到这个账号，请确认或联系技术支持" }); }
  res.json({ url: hits[0].url + "/?u=" + encodeURIComponent(u) });
});
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

app.use("/api", (req, res, next) => verify(cookie(req)) ? next() : res.status(401).json({ error: "未登入" }));

const clean = (s) => String(s || "").trim();
const normUrl = (u) => { u = clean(u).replace(/\/+$/, ""); if (!/^https?:\/\//.test(u)) u = "https://" + u; return u; };

app.get("/api/brands", (req, res) => res.json(brands.map(b => ({ id: b.id, name: b.name, url: b.url, note: b.note || "" }))));
app.post("/api/brands", (req, res) => {
  const name = clean(req.body.name), key = clean(req.body.key);
  if (!name || !req.body.url || key.length < 16) return res.status(400).json({ error: "请填品牌名、后台网址、PLATFORM_KEY（至少16位）" });
  const b = { id: crypto.randomBytes(5).toString("hex"), name, url: normUrl(req.body.url), key, note: clean(req.body.note) };
  brands.push(b); save(); res.json({ ok: true, id: b.id });
});
app.put("/api/brands/:id", (req, res) => {
  const b = brands.find(x => x.id === req.params.id); if (!b) return res.status(404).json({ error: "找不到" });
  if (req.body.name) b.name = clean(req.body.name);
  if (req.body.url) b.url = normUrl(req.body.url);
  if (req.body.key) b.key = clean(req.body.key);
  if (req.body.note !== undefined) b.note = clean(req.body.note);
  save(); res.json({ ok: true });
});
app.delete("/api/brands/:id", (req, res) => { brands = brands.filter(x => x.id !== req.params.id); save(); res.json({ ok: true }); });

async function fetchOne(b) {
  const t0 = Date.now(), ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(b.url + "/api/platform/summary", { headers: { "x-platform-key": b.key }, signal: ctl.signal });
    if (r.status === 401) return { id: b.id, status: "key", error: "PLATFORM_KEY 不符" };
    if (r.status === 404) return { id: b.id, status: "key", error: "该品牌未设置 PLATFORM_KEY" };
    if (!r.ok) return { id: b.id, status: "down", error: "HTTP " + r.status };
    return { id: b.id, status: "ok", ms: Date.now() - t0, data: await r.json() };
  } catch (e) { return { id: b.id, status: "down", error: e.name === "AbortError" ? "超时" : "无法连线" }; }
  finally { clearTimeout(tm); }
}
app.get("/api/overview", async (req, res) => {
  const out = await Promise.all(brands.map(fetchOne));
  res.json(brands.map((b, i) => ({ id: b.id, name: b.name, url: b.url, note: b.note || "", ...out[i] })));
});

app.listen(process.env.PORT || 3000, () => console.log("MJH 总汇已启动"));
