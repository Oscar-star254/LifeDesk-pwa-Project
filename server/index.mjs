import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import argon2 from "argon2";
import { db, transaction } from "./database.mjs";
import { AppError, cleanText, email, password, positiveAmount, splitIncome, validateSplitRules } from "./domain.mjs";

const port = Number(process.env.API_PORT || 8787);
const production = process.env.NODE_ENV === "production";
const allowedOrigin = process.env.APP_ORIGIN || `http://localhost:${process.env.PORT || 8443}`;
const tokenHash = (value) => createHash("sha256").update(value).digest("hex");
const randomToken = () => randomBytes(32).toString("base64url");
const rate = new Map();

function json(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").filter(Boolean).map((part) => {
    const [key, ...value] = part.trim().split("=");
    return [key, decodeURIComponent(value.join("="))];
  }));
}
async function body(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new AppError(413, "Request body is too large");
  }
  try { return raw ? JSON.parse(raw) : {}; } catch { throw new AppError(400, "Request body must be valid JSON"); }
}
function limit(req, key, maximum = 20) {
  const id = `${req.socket.remoteAddress}:${key}`, now = Date.now(), current = rate.get(id);
  if (!current || current.until < now) return rate.set(id, { count: 1, until: now + 60_000 });
  if (++current.count > maximum) throw new AppError(429, "Too many requests. Try again shortly.", "RATE_LIMITED");
}
function session(req, requireCsrf = false) {
  const token = cookies(req).lifedesk_session;
  if (!token) throw new AppError(401, "Sign in to continue", "UNAUTHENTICATED");
  const row = db.prepare(`SELECT sessions.*, users.email, users.name FROM sessions
    JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires_at>?`).get(tokenHash(token), Date.now());
  if (!row) throw new AppError(401, "Your session has expired", "UNAUTHENTICATED");
  if (requireCsrf) {
    const supplied = String(req.headers["x-csrf-token"] || "");
    const expected = String(row.csrf_token);
    if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
      throw new AppError(403, "Invalid CSRF token", "CSRF");
    }
  }
  return row;
}
function setSession(res, userId, remember) {
  const token = randomToken(), csrf = randomToken(), ttl = remember ? 30 * 864e5 : 864e5;
  db.prepare("INSERT INTO sessions(user_id,token_hash,csrf_token,expires_at) VALUES(?,?,?,?)")
    .run(userId, tokenHash(token), csrf, Date.now() + ttl);
  const cookie = `lifedesk_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(ttl / 1000)}${production ? "; Secure" : ""}`;
  json(res, 200, { ok: true, csrfToken: csrf }, { "Set-Cookie": cookie });
}
function createAuthToken(userId, kind, ttl) {
  const token = kind === "verify" ? String(randomInt(100000, 1000000)) : randomToken();
  db.prepare("INSERT INTO auth_tokens(user_id,kind,token_hash,expires_at) VALUES(?,?,?,?)")
    .run(userId, kind, tokenHash(token), Date.now() + ttl);
  return token;
}
function receipt() { return `LD-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${randomBytes(3).toString("hex").toUpperCase()}`; }

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (req.headers.origin && req.headers.origin !== allowedOrigin) throw new AppError(403, "Origin not allowed");
    if (req.method === "OPTIONS") return json(res, 204, {}, { "Access-Control-Allow-Origin": allowedOrigin, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "Content-Type,X-CSRF-Token" });
    if (url.pathname === "/api/health") return json(res, 200, { ok: true });

    if (url.pathname === "/api/auth/signup" && req.method === "POST") {
      limit(req, "signup", 5);
      const input = await body(req), mail = email(input.email), username = cleanText(input.username, "Username", { min: 3, max: 30 }).toLowerCase();
      const hash = await argon2.hash(password(input.password), { type: argon2.argon2id });
      let userId;
      try {
        userId = Number(db.prepare("INSERT INTO users(name,email,username,password_hash) VALUES(?,?,?,?)")
          .run(cleanText(input.name, "Name", { min: 2, max: 80 }), mail, username, hash).lastInsertRowid);
      } catch (error) {
        if (String(error).includes("UNIQUE")) throw new AppError(409, "Email or username is already registered");
        throw error;
      }
      const code = createAuthToken(userId, "verify", 15 * 60_000);
      return json(res, 201, { ok: true, ...(production ? {} : { developmentCode: code }) });
    }
    if (url.pathname === "/api/auth/verify" && req.method === "POST") {
      limit(req, "verify", 10);
      const input = await body(req), user = db.prepare("SELECT id FROM users WHERE email=?").get(email(input.email));
      if (!user) throw new AppError(400, "Verification code is invalid");
      const auth = db.prepare("SELECT id FROM auth_tokens WHERE user_id=? AND kind='verify' AND token_hash=? AND expires_at>? AND used_at IS NULL")
        .get(user.id, tokenHash(cleanText(input.code, "Code", { min: 6, max: 6 })), Date.now());
      if (!auth) throw new AppError(400, "Verification code is invalid or expired");
      transaction(() => {
        db.prepare("UPDATE auth_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?").run(auth.id);
        db.prepare("UPDATE users SET verified_at=CURRENT_TIMESTAMP WHERE id=?").run(user.id);
        const insert = db.prepare("INSERT INTO money_accounts(user_id,name,percentage,color) VALUES(?,?,?,?)");
        [["Savings",35,"yellow"],["Rent",25,"olive"],["Emergency",20,"blue"],["Everyday",20,"orange"]].forEach((a) => insert.run(user.id, ...a));
      });
      return json(res, 200, { ok: true });
    }
    if (url.pathname === "/api/auth/login" && req.method === "POST") {
      limit(req, "login", 8);
      const input = await body(req), identifier = cleanText(input.identifier, "Email or username", { max: 254 }).toLowerCase();
      const user = db.prepare("SELECT * FROM users WHERE email=? OR username=?").get(identifier, identifier);
      if (!user || !(await argon2.verify(user.password_hash, String(input.password || "")))) throw new AppError(401, "Invalid email or password");
      if (!user.verified_at) throw new AppError(403, "Verify your email before signing in", "EMAIL_UNVERIFIED");
      return setSession(res, user.id, Boolean(input.remember));
    }
    if (url.pathname === "/api/auth/forgot" && req.method === "POST") {
      limit(req, "forgot", 4);
      const input = await body(req), user = db.prepare("SELECT id FROM users WHERE email=?").get(email(input.email));
      const token = user ? createAuthToken(user.id, "reset", 30 * 60_000) : undefined;
      return json(res, 200, { ok: true, ...(production || !token ? {} : { developmentToken: token }) });
    }
    if (url.pathname === "/api/auth/reset" && req.method === "POST") {
      limit(req, "reset", 6);
      const input = await body(req), hash = tokenHash(cleanText(input.token, "Token", { min: 20, max: 100 }));
      const auth = db.prepare("SELECT * FROM auth_tokens WHERE kind='reset' AND token_hash=? AND expires_at>? AND used_at IS NULL").get(hash, Date.now());
      if (!auth) throw new AppError(400, "Reset link is invalid or expired");
      const passwordHash = await argon2.hash(password(input.password), { type: argon2.argon2id });
      transaction(() => {
        db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(passwordHash, auth.user_id);
        db.prepare("UPDATE auth_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?").run(auth.id);
        db.prepare("DELETE FROM sessions WHERE user_id=?").run(auth.user_id);
      });
      return json(res, 200, { ok: true });
    }
    if (url.pathname === "/api/auth/me" && req.method === "GET") {
      const current = session(req);
      return json(res, 200, { user: { id: current.user_id, name: current.name, email: current.email }, csrfToken: current.csrf_token });
    }
    if (url.pathname === "/api/auth/logout" && req.method === "POST") {
      const current = session(req, true);
      db.prepare("DELETE FROM sessions WHERE id=?").run(current.id);
      return json(res, 200, { ok: true }, { "Set-Cookie": `lifedesk_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${production ? "; Secure" : ""}` });
    }

    if (url.pathname === "/api/finance/accounts" && req.method === "GET") {
      const current = session(req);
      return json(res, 200, { accounts: db.prepare("SELECT id,name,percentage,balance_cents AS balanceCents,color FROM money_accounts WHERE user_id=? ORDER BY id").all(current.user_id) });
    }
    if (url.pathname === "/api/finance/accounts" && req.method === "PUT") {
      const current = session(req, true), input = await body(req);
      validateSplitRules(input.accounts);
      transaction(() => {
        for (const account of input.accounts) {
          const result = db.prepare("UPDATE money_accounts SET percentage=? WHERE id=? AND user_id=?").run(Number(account.percentage), Number(account.id), current.user_id);
          if (!result.changes) throw new AppError(404, "Money account not found");
        }
      });
      return json(res, 200, { ok: true });
    }
    if (url.pathname === "/api/finance/income" && req.method === "POST") {
      const current = session(req, true), input = await body(req), cents = positiveAmount(input.amount);
      const owned = db.prepare("SELECT id,percentage FROM money_accounts WHERE user_id=? ORDER BY id").all(current.user_id);
      const splits = splitIncome(cents, owned), group = randomToken(), occurred = new Date(input.date || Date.now()).toISOString();
      transaction(() => splits.forEach((split) => {
        db.prepare("UPDATE money_accounts SET balance_cents=balance_cents+? WHERE id=? AND user_id=?").run(split.amountCents, split.accountId, current.user_id);
        db.prepare("INSERT INTO transactions(user_id,account_id,kind,amount_cents,source,note,receipt_number,occurred_at,group_id) VALUES(?,?,?,?,?,?,?,?,?)")
          .run(current.user_id, split.accountId, "income", split.amountCents, cleanText(input.source || "Income", "Source"), input.note ? cleanText(input.note, "Note", { max: 500 }) : null, receipt(), occurred, group);
      }));
      return json(res, 201, { ok: true, groupId: group, splits });
    }
    if (url.pathname === "/api/finance/expense" && req.method === "POST") {
      const current = session(req, true), input = await body(req), cents = positiveAmount(input.amount), accountId = Number(input.accountId);
      const account = db.prepare("SELECT * FROM money_accounts WHERE id=? AND user_id=?").get(accountId, current.user_id);
      if (!account) throw new AppError(404, "Money account not found");
      if (account.balance_cents < cents) throw new AppError(409, "This expense would overdraw the account", "INSUFFICIENT_FUNDS");
      const number = receipt();
      transaction(() => {
        db.prepare("UPDATE money_accounts SET balance_cents=balance_cents-? WHERE id=?").run(cents, accountId);
        db.prepare("INSERT INTO transactions(user_id,account_id,kind,amount_cents,category,note,receipt_number,occurred_at) VALUES(?,?,?,?,?,?,?,?)")
          .run(current.user_id, accountId, "expense", cents, cleanText(input.category, "Category"), input.note ? cleanText(input.note, "Note", { max: 500 }) : null, number, new Date(input.date || Date.now()).toISOString());
      });
      return json(res, 201, { ok: true, receiptNumber: number });
    }
    if (url.pathname === "/api/finance/transactions" && req.method === "GET") {
      const current = session(req), limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 25));
      return json(res, 200, { transactions: db.prepare("SELECT * FROM transactions WHERE user_id=? ORDER BY occurred_at DESC LIMIT ?").all(current.user_id, limit) });
    }

    if (url.pathname === "/api/academics/units" && req.method === "GET") {
      const current = session(req);
      const units = db.prepare(`SELECT *, CASE
        WHEN cat_score IS NULL OR exam_score IS NULL THEN NULL
        ELSE ROUND(cat_score * .3 + exam_score * .7, 1) END AS total
        FROM academic_units WHERE user_id=? ORDER BY year,semester,code`).all(current.user_id);
      return json(res, 200, { units });
    }
    if (url.pathname === "/api/academics/units" && req.method === "POST") {
      const current = session(req, true), input = await body(req);
      const result = db.prepare(`INSERT INTO academic_units
        (user_id,programme,year,semester,code,title,lecturer,credit_hours,exam_date)
        VALUES(?,?,?,?,?,?,?,?,?)`).run(
          current.user_id, cleanText(input.programme, "Programme", { max: 120 }),
          Math.max(1, Math.min(8, Number(input.year))), Math.max(1, Math.min(3, Number(input.semester))),
          cleanText(input.code, "Unit code", { max: 20 }).toUpperCase(),
          cleanText(input.title, "Unit title", { max: 120 }),
          input.lecturer ? cleanText(input.lecturer, "Lecturer", { max: 100 }) : null,
          Math.max(1, Math.min(12, Number(input.creditHours) || 3)), input.examDate || null,
        );
      return json(res, 201, { id: Number(result.lastInsertRowid) });
    }
    const gradeMatch = url.pathname.match(/^\/api\/academics\/units\/(\d+)\/grade$/);
    if (gradeMatch && req.method === "PUT") {
      const current = session(req, true), input = await body(req);
      const cat = Number(input.catScore), exam = Number(input.examScore);
      if (cat < 0 || cat > 100 || exam < 0 || exam > 100) throw new AppError(400, "Scores must be between 0 and 100");
      const result = db.prepare("UPDATE academic_units SET cat_score=?,exam_score=? WHERE id=? AND user_id=?")
        .run(cat, exam, Number(gradeMatch[1]), current.user_id);
      if (!result.changes) throw new AppError(404, "Unit not found");
      const total = Math.round((cat * .3 + exam * .7) * 10) / 10;
      const grade = total >= 70 ? "A" : total >= 60 ? "B" : total >= 50 ? "C" : total >= 40 ? "D" : "E";
      return json(res, 200, { total, grade });
    }
    if (url.pathname === "/api/academics/notes" && req.method === "POST") {
      const current = session(req, true), input = await body(req), unitId = Number(input.unitId);
      if (!db.prepare("SELECT id FROM academic_units WHERE id=? AND user_id=?").get(unitId, current.user_id)) {
        throw new AppError(404, "Unit not found");
      }
      const result = db.prepare("INSERT INTO notes(user_id,unit_id,title,content,tags,pdf_page) VALUES(?,?,?,?,?,?)")
        .run(current.user_id, unitId, cleanText(input.title, "Note title", { max: 150 }), String(input.content || "").slice(0, 500_000), JSON.stringify(Array.isArray(input.tags) ? input.tags.slice(0, 20) : []), input.pdfPage || null);
      return json(res, 201, { id: Number(result.lastInsertRowid) });
    }

    if (url.pathname === "/api/schedule/events" && req.method === "GET") {
      const current = session(req), from = url.searchParams.get("from") || "1970-01-01", to = url.searchParams.get("to") || "2999-12-31";
      return json(res, 200, { events: db.prepare("SELECT * FROM events WHERE user_id=? AND starts_at>=? AND starts_at<=? ORDER BY starts_at").all(current.user_id, from, to) });
    }
    if (url.pathname === "/api/schedule/events" && req.method === "POST") {
      const current = session(req, true), input = await body(req);
      const start = new Date(input.startsAt), end = new Date(input.endsAt);
      if (!Number.isFinite(start.valueOf()) || !Number.isFinite(end.valueOf()) || end <= start) throw new AppError(400, "Event end must be after its start");
      const result = db.prepare(`INSERT INTO events
        (user_id,title,starts_at,ends_at,type,location,color,recurrence,reminder_minutes)
        VALUES(?,?,?,?,?,?,?,?,?)`).run(current.user_id, cleanText(input.title, "Event title", { max: 150 }), start.toISOString(), end.toISOString(), cleanText(input.type || "personal", "Event type", { max: 30 }), input.location ? cleanText(input.location, "Location", { max: 150 }) : null, cleanText(input.color || "yellow", "Color", { max: 30 }), input.recurrence || null, input.reminderMinutes == null ? null : Math.max(0, Number(input.reminderMinutes)));
      return json(res, 201, { id: Number(result.lastInsertRowid) });
    }
    const eventMatch = url.pathname.match(/^\/api\/schedule\/events\/(\d+)$/);
    if (eventMatch && req.method === "DELETE") {
      const current = session(req, true);
      const result = db.prepare("DELETE FROM events WHERE id=? AND user_id=?").run(Number(eventMatch[1]), current.user_id);
      if (!result.changes) throw new AppError(404, "Event not found");
      return json(res, 200, { ok: true });
    }

    if (url.pathname === "/api/goals" && req.method === "GET") {
      const current = session(req);
      const goals = db.prepare(`SELECT goals.*,
        CASE WHEN goals.account_id IS NULL THEN goals.current_value
        ELSE money_accounts.balance_cents / 100.0 END AS live_value
        FROM goals LEFT JOIN money_accounts ON money_accounts.id=goals.account_id
        WHERE goals.user_id=? ORDER BY goals.target_date`).all(current.user_id);
      return json(res, 200, { goals });
    }
    if (url.pathname === "/api/goals" && req.method === "POST") {
      const current = session(req, true), input = await body(req), accountId = input.accountId ? Number(input.accountId) : null;
      if (accountId && !db.prepare("SELECT id FROM money_accounts WHERE id=? AND user_id=?").get(accountId, current.user_id)) {
        throw new AppError(404, "Linked money account not found");
      }
      const result = transaction(() => {
        const created = db.prepare(`INSERT INTO goals
          (user_id,title,description,type,category,target_date,target_value,account_id,status)
          VALUES(?,?,?,?,?,?,?,?,?)`).run(current.user_id, cleanText(input.title, "Goal title", { max: 160 }), input.description ? cleanText(input.description, "Description", { max: 1000 }) : null, input.type === "long_term" ? "long_term" : "short_term", cleanText(input.category, "Category", { max: 40 }), new Date(input.targetDate).toISOString(), input.targetValue == null ? null : Number(input.targetValue), accountId, "in_progress");
        const goalId = Number(created.lastInsertRowid), insert = db.prepare("INSERT INTO milestones(goal_id,title) VALUES(?,?)");
        if (Array.isArray(input.milestones)) input.milestones.slice(0, 50).forEach((title) => insert.run(goalId, cleanText(title, "Milestone", { max: 160 })));
        return goalId;
      });
      return json(res, 201, { id: result });
    }
    const milestoneMatch = url.pathname.match(/^\/api\/goals\/(\d+)\/milestones\/(\d+)$/);
    if (milestoneMatch && req.method === "PUT") {
      const current = session(req, true), input = await body(req);
      const result = db.prepare(`UPDATE milestones SET completed_at=? WHERE id=? AND goal_id IN
        (SELECT id FROM goals WHERE id=? AND user_id=?)`).run(input.completed ? new Date().toISOString() : null, Number(milestoneMatch[2]), Number(milestoneMatch[1]), current.user_id);
      if (!result.changes) throw new AppError(404, "Milestone not found");
      return json(res, 200, { ok: true });
    }
    throw new AppError(404, "Route not found", "NOT_FOUND");
  } catch (error) {
    const known = error instanceof AppError;
    if (!known) console.error(error);
    json(res, known ? error.status : 500, { error: { code: known ? error.code : "SERVER_ERROR", message: known ? error.message : "Something went wrong" } });
  }
});

server.listen(port, "127.0.0.1", () => console.log(`LifeDesk API listening on http://127.0.0.1:${port}`));
