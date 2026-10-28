const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { handleApiRequest } = require('./lib/api-handler');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'streakboard.db');

// Safe SQLite initialization (only for local development)
let db = null;
if (!process.env.VERCEL) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(DB_PATH);
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
  } catch (e) {
    console.log('SQLite not loaded (running in serverless or cloud environment)');
  }
}

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
  if (!db) return null;
  const cookies = parseCookies(req);
  let token = cookies['sb_token'];
  if (!token && req.headers['authorization']) {
    const parts = req.headers['authorization'].split(' ');
    if (parts[0] === 'Bearer') token = parts[1];
  }
  if (!token) return null;

  try {
    const stmt = db.prepare(`
      SELECT users.id, users.email, users.name 
      FROM sessions 
      JOIN users ON sessions.user_id = users.id 
      WHERE sessions.token = ?
    `);
    return stmt.get(token) || null;
  } catch (e) {
    return null;
  }
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
  if (urlPath.startsWith('/api/')) {
    return await handleApiRequest(req, res, db);
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

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  Streakboard Server with Sync & Database is RUNNING`);
    console.log(`  Port: ${PORT}`);
    console.log(`  Local URL:   http://localhost:${PORT}`);
    console.log(`  Database:    ${db ? 'streakboard.db (SQLite)' : 'Supabase (PostgreSQL)'}`);
    console.log(`======================================================\n`);
  });
}

module.exports = server;
