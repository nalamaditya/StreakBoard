const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'streakboard.db');

// Initialize SQLite database
const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS boards (
    user_id TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    rev INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

function hashPassword(pass) {
  return crypto.createHash('sha256').update(pass + '_sb_salt_2026').digest('hex');
}

function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers['cookie'];
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (name) list[name] = decodeURIComponent(rest.join('=').trim());
  });
  return list;
}

function getSessionUser(req) {
  const cookies = parseCookies(req);
  let token = cookies['sb_token'];
  if (!token && req.headers['authorization']) {
    const parts = req.headers['authorization'].split(' ');
    if (parts[0] === 'Bearer') token = parts[1];
  }
  if (!token) return null;

  const stmt = db.prepare(`
    SELECT users.id, users.email, users.name 
    FROM sessions 
    JOIN users ON sessions.user_id = users.id 
    WHERE sessions.token = ?
  `);
  return stmt.get(token) || null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, status, data, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    ...headers
  });
  res.end(JSON.stringify(data));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  const [urlPath] = req.url.split('?');

  // --- API Endpoints ---
    // Database inspector endpoint (see all users and boards in JSON)
    if (urlPath === '/api/admin/db' && req.method === 'GET') {
      const users = db.prepare('SELECT id, email, name, created_at FROM users').all();
      const boards = db.prepare('SELECT user_id, rev, updated_at, state_json FROM boards').all().map(b => {
        try { b.state = JSON.parse(b.state_json); } catch(e){}
        return b;
      });
      const sessions = db.prepare('SELECT token, user_id, created_at FROM sessions').all();
      return sendJSON(res, 200, { ok: true, users, boards, sessions });
    }

  if (urlPath.startsWith('/api/')) {
    if (urlPath === '/api/auth/me' && req.method === 'GET') {
      const user = getSessionUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Not authenticated' });
      return sendJSON(res, 200, { ok: true, user });
    }

    if (urlPath === '/api/auth/signup' && req.method === 'POST') {
      const { email, password, name } = await readBody(req);
      if (!email || !password) return sendJSON(res, 400, { error: 'Email and password required' });
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = (name || cleanEmail.split('@')[0]).trim();

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
      if (existing) return sendJSON(res, 409, { error: 'An account with this email already exists' });

      const userId = 'u_' + crypto.randomUUID();
      const hash = hashPassword(password);
      db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(
        userId, cleanEmail, cleanName, hash, Date.now()
      );

      const token = 's_' + crypto.randomBytes(32).toString('hex');
      db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, userId, Date.now());

      const cookie = `sb_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
      return sendJSON(res, 200, { ok: true, token, user: { id: userId, email: cleanEmail, name: cleanName } }, { 'Set-Cookie': cookie });
    }

    if (urlPath === '/api/auth/login' && req.method === 'POST') {
      const { email, password } = await readBody(req);
      if (!email || !password) return sendJSON(res, 400, { error: 'Email and password required' });
      const cleanEmail = email.trim().toLowerCase();

      const user = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').get(cleanEmail);
      if (!user || user.password_hash !== hashPassword(password)) {
        return sendJSON(res, 401, { error: 'Incorrect email or password' });
      }

      const token = 's_' + crypto.randomBytes(32).toString('hex');
      db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, user.id, Date.now());

      const cookie = `sb_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
      return sendJSON(res, 200, { ok: true, token, user: { id: user.id, email: user.email, name: user.name } }, { 'Set-Cookie': cookie });
    }

    if (urlPath === '/api/auth/logout' && req.method === 'POST') {
      const cookies = parseCookies(req);
      if (cookies['sb_token']) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(cookies['sb_token']);
      }
      return sendJSON(res, 200, { ok: true }, { 'Set-Cookie': 'sb_token=; Path=/; HttpOnly; Max-Age=0' });
    }

    if (urlPath === '/api/state' && req.method === 'GET') {
      const user = getSessionUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Not authenticated' });

      const row = db.prepare('SELECT state_json, rev FROM boards WHERE user_id = ?').get(user.id);
      if (!row) return sendJSON(res, 200, { ok: true, d: { data: null, rev: 0 } });
      try {
        return sendJSON(res, 200, { ok: true, d: { data: JSON.parse(row.state_json), rev: row.rev } });
      } catch (e) {
        return sendJSON(res, 200, { ok: true, d: { data: null, rev: 0 } });
      }
    }

    if (urlPath === '/api/state' && req.method === 'PUT') {
      const user = getSessionUser(req);
      if (!user) return sendJSON(res, 401, { error: 'Not authenticated' });

      const { data, rev } = await readBody(req);
      if (!data) return sendJSON(res, 400, { error: 'Missing state data' });

      const row = db.prepare('SELECT rev FROM boards WHERE user_id = ?').get(user.id);
      const nextRev = (row ? row.rev : 0) + 1;

      db.prepare(`
        INSERT INTO boards (user_id, state_json, rev, updated_at) 
        VALUES (?, ?, ?, ?) 
        ON CONFLICT(user_id) DO UPDATE SET 
          state_json = excluded.state_json, 
          rev = excluded.rev, 
          updated_at = excluded.updated_at
      `).run(user.id, JSON.stringify(data), nextRev, Date.now());

      return sendJSON(res, 200, { ok: true, d: { rev: nextRev } });
    }

    if (urlPath === '/api/me') {
      const user = getSessionUser(req);
      return sendJSON(res, 200, { ok: true, d: user ? { email: user.email, name: user.name, pro: true } : { email: 'guest', pro: true } });
    }
    if (urlPath === '/api/pricing') return sendJSON(res, 200, { ok: true, d: {} });
    if (urlPath === '/api/profile') return sendJSON(res, 200, { ok: true, d: {} });

    return sendJSON(res, 404, { error: 'Endpoint not found' });
  }

  // --- Static Files ---
  let reqFile = urlPath === '/' || urlPath === '/app' || urlPath === '/app/' ? '/index.html' : urlPath;
  const filePath = path.join(__dirname, reqFile);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(__dirname, 'index.html')).pipe(res);
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  Streakboard Server with Sync & Database is RUNNING`);
  console.log(`  Port: ${PORT}`);
  console.log(`  Local URL:   http://localhost:${PORT}`);
  console.log(`  Database:    streakboard.db (SQLite)`);
  console.log(`======================================================\n`);
});
