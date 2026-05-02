import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "data", "db.json");

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

async function readDb() {
  try {
    const file = await fs.readFile(dbPath, "utf8");
    return JSON.parse(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      return { users: [], sessions: [] };
    }

    throw error;
  }
}

async function writeDb(db) {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`);
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
  const [salt] = storedPassword.split(":");
  return hashPassword(password, salt) === storedPassword;
}

async function requireUser(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ message: "Missing auth token." });
    return;
  }

  const db = await readDb();
  const user = db.users.find((item) => item.token === token);

  if (!user) {
    res.status(401).json({ message: "Invalid auth token." });
    return;
  }

  req.user = user;
  req.db = db;
  next();
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/signup", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name || !email || password.length < 4) {
    res.status(400).json({ message: "Name, email, and a 4+ character password are required." });
    return;
  }

  const db = await readDb();

  if (db.users.some((user) => user.email === email)) {
    res.status(409).json({ message: "An account with this email already exists." });
    return;
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    password: hashPassword(password),
    token: crypto.randomBytes(32).toString("hex"),
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  await writeDb(db);

  res.status(201).json({ user: publicUser(user), token: user.token });
});

app.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const db = await readDb();
  const user = db.users.find((item) => item.email === email);

  if (!user || !verifyPassword(password, user.password)) {
    res.status(401).json({ message: "Email or password is incorrect." });
    return;
  }

  user.token = crypto.randomBytes(32).toString("hex");
  await writeDb(db);

  res.json({ user: publicUser(user), token: user.token });
});

app.get("/sessions", requireUser, async (req, res) => {
  const sessions = req.db.sessions
    .filter((session) => session.userId === req.user.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({ sessions });
});

app.post("/sessions", requireUser, async (req, res) => {
  const action = String(req.body.action || "").trim();
  const allowedActions = ["Reheat", "Defrost", "Timer"];

  if (!allowedActions.includes(action)) {
    res.status(400).json({ message: "Action must be Reheat, Defrost, or Timer." });
    return;
  }

  const session = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    action,
    timestamp: new Date().toISOString()
  };

  req.db.sessions.push(session);
  await writeDb(req.db);

  res.status(201).json({ session });
});

app.listen(port, () => {
  console.log(`pressly API running at http://localhost:${port}`);
});
