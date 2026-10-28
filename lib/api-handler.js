// lib/api-handler.js
// Unified API handler for local Node.js server and Vercel Serverless Functions
const crypto = require('crypto');
const supabase = require('./supabase');

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

function hashPassword(pass) {
  return crypto.createHash('sha256').update(pass + 'sb_salt_2026').digest('hex');
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch(e) { return {}; }
  }
  return new Promise((resolve) => {
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
    req.on('error', () => resolve({}));
  });
}

function sendJSON(res, status, data, headers = {}) {
  const allHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    ...headers
  };

  if (typeof res.status === 'function') {
    // Vercel / Express response
    Object.entries(allHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(status).json(data);
  }

  // Standard Node.js http response
  res.writeHead(status, allHeaders);
  res.end(JSON.stringify(data));
}

async function getAuthenticatedUser(req, db) {
  const cookieHeader = req.headers['cookie'] || '';
  const cookies = parseCookies(cookieHeader);
  let token = cookies['sb_token'];
  if (!token && req.headers['authorization']) {
    const parts = req.headers['authorization'].split(' ');
    if (parts[0] === 'Bearer') token = parts[1];
  }
  if (!token) return null;

  // 1. Try Supabase verification if configured
  if (supabase.isConfigured) {
    const sbUser = await supabase.getUser(token);
    if (sbUser) {
      return { id: sbUser.id, email: sbUser.email, name: sbUser.name, token, isSupabase: true };
    }
  }

  // 2. Try SQLite fallback session if db is available
  if (db) {
    try {
      const stmt = db.prepare(`
        SELECT users.id, users.email, users.name 
        FROM sessions 
        JOIN users ON sessions.user_id = users.id 
        WHERE sessions.token = ?
      `);
      const row = stmt.get(token);
      if (row) {
        return { id: row.id, email: row.email, name: row.name, token, isSupabase: false };
      }
    } catch (e) {
      // In case SQLite table is not initialized
    }
  }

  return null;
}

async function handleApiRequest(req, res, db) {
  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      return res.status(204).end();
    }
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, 'http://localhost');
  const urlPath = parsedUrl.pathname;

  // Configuration endpoint to let frontend know if Supabase is active
  if (urlPath === '/api/auth/config' && req.method === 'GET') {
    return sendJSON(res, 200, {
      ok: true,
      supabaseConfigured: supabase.isConfigured,
      supabaseUrl: supabase.SUPABASE_URL || null,
      supabaseAnonKey: supabase.SUPABASE_ANON_KEY || null
    });
  }

  // Database inspector endpoint (dev & admin view)
  if (urlPath === '/api/admin/db' && req.method === 'GET') {
    if (db) {
      try {
        const users = db.prepare('SELECT id, email, name, created_at FROM users').all();
        const boards = db.prepare('SELECT user_id, rev, updated_at, state_json FROM boards').all().map(b => {
          try { b.state = JSON.parse(b.state_json); } catch(e){}
          return b;
        });
        const sessions = db.prepare('SELECT token, user_id, created_at FROM sessions').all();
        return sendJSON(res, 200, { ok: true, mode: supabase.isConfigured ? 'supabase+sqlite' : 'sqlite', users, boards, sessions });
      } catch (e) {
        return sendJSON(res, 200, { ok: true, mode: 'supabase', error: e.message });
      }
    }
    return sendJSON(res, 200, { ok: true, mode: 'supabase' });
  }

  // 1. Current Session
  if (urlPath === '/api/auth/me' && req.method === 'GET') {
    const user = await getAuthenticatedUser(req, db);
    if (!user) return sendJSON(res, 401, { error: 'Not authenticated' });
    return sendJSON(res, 200, { ok: true, user: { id: user.id, email: user.email, name: user.name } });
  }

  // 2. Signup
  if (urlPath === '/api/auth/signup' && req.method === 'POST') {
    const { email, password, name } = await readBody(req);
    if (!email || !password) return sendJSON(res, 400, { error: 'Email and password required' });
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || cleanEmail.split('@')[0]).trim();

    // Try Supabase first if configured
    if (supabase.isConfigured) {
      try {
        const data = await supabase.signUp({ email: cleanEmail, password, name: cleanName });
        if (data && data.session) {
          const token = data.session.access_token;
          const cookie = `sb_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
          return sendJSON(res, 200, {
            ok: true,
            token,
            user: { id: data.user.id, email: cleanEmail, name: cleanName }
          }, { 'Set-Cookie': cookie });
        } else if (data && data.user) {
          return sendJSON(res, 200, {
            ok: true,
            requiresVerification: true,
            message: 'Account created! Please check your email for the confirmation link.',
            user: { id: data.user.id, email: cleanEmail, name: cleanName }
          });
        }
      } catch (err) {
        return sendJSON(res, 400, { error: err.message || 'Signup failed' });
      }
    }

    // Fallback to SQLite
    if (db) {
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

    return sendJSON(res, 500, { error: 'Database service unavailable' });
  }

  // 3. Login
  if (urlPath === '/api/auth/login' && req.method === 'POST') {
    const { email, password } = await readBody(req);
    if (!email || !password) return sendJSON(res, 400, { error: 'Email and password required' });
    const cleanEmail = email.trim().toLowerCase();

    // Try Supabase first if configured
    if (supabase.isConfigured) {
      try {
        const data = await supabase.signIn({ email: cleanEmail, password });
        if (data && data.session) {
          const token = data.session.access_token;
          const userMeta = data.user.user_metadata || {};
          const userName = userMeta.name || userMeta.full_name || cleanEmail.split('@')[0];
          const cookie = `sb_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
          return sendJSON(res, 200, {
            ok: true,
            token,
            user: { id: data.user.id, email: cleanEmail, name: userName }
          }, { 'Set-Cookie': cookie });
        }
      } catch (err) {
        // If Supabase authentication fails with explicit message
        return sendJSON(res, 401, { error: err.message || 'Incorrect email or password' });
      }
    }

    // Fallback to SQLite
    if (db) {
      const user = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').get(cleanEmail);
      if (!user || user.password_hash !== hashPassword(password)) {
        return sendJSON(res, 401, { error: 'Incorrect email or password' });
      }

      const token = 's_' + crypto.randomBytes(32).toString('hex');
      db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, user.id, Date.now());

      const cookie = `sb_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
      return sendJSON(res, 200, { ok: true, token, user: { id: user.id, email: user.email, name: user.name } }, { 'Set-Cookie': cookie });
    }

    return sendJSON(res, 401, { error: 'Incorrect email or password' });
  }

  // 4. Forgot Password
  if (urlPath === '/api/auth/forgot-password' && req.method === 'POST') {
    const { email } = await readBody(req);
    if (!email) return sendJSON(res, 400, { error: 'Email is required' });
    const cleanEmail = email.trim().toLowerCase();

    if (supabase.isConfigured) {
      try {
        const host = req.headers['host'] || 'localhost:3000';
        const proto = req.headers['x-forwarded-proto'] || 'http';
        const redirectTo = `${proto}://${host}/#type=recovery`;
        await supabase.resetPasswordForEmail(cleanEmail, redirectTo);
        return sendJSON(res, 200, { ok: true, message: 'Password reset link sent to your email.' });
      } catch (err) {
        return sendJSON(res, 400, { error: err.message || 'Unable to send password reset email' });
      }
    }

    return sendJSON(res, 200, {
      ok: true,
      message: 'If an account exists, instructions have been dispatched. (Note: Supabase connection needed for live email sending).'
    });
  }

  // 5. Reset / Update Password
  if (urlPath === '/api/auth/reset-password' && req.method === 'POST') {
    const { password } = await readBody(req);
    if (!password || password.length < 6) {
      return sendJSON(res, 400, { error: 'Password must be at least 6 characters long' });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : parseCookies(req.headers['cookie'])['sb_token'];
    if (!token) return sendJSON(res, 401, { error: 'Authentication token required for password update' });

    if (supabase.isConfigured) {
      try {
        await supabase.updateUserPassword(token, password);
        return sendJSON(res, 200, { ok: true, message: 'Password updated successfully!' });
      } catch (err) {
        return sendJSON(res, 400, { error: err.message || 'Failed to update password' });
      }
    }

    return sendJSON(res, 200, { ok: true, message: 'Password updated' });
  }

  // 6. Logout
  if (urlPath === '/api/auth/logout' && req.method === 'POST') {
    const cookies = parseCookies(req.headers['cookie']);
    if (db && cookies['sb_token']) {
      try { db.prepare('DELETE FROM sessions WHERE token = ?').run(cookies['sb_token']); } catch(e){}
    }
    return sendJSON(res, 200, { ok: true }, { 'Set-Cookie': 'sb_token=; Path=/; HttpOnly; Max-Age=0' });
  }

  // 7. State GET
  if (urlPath === '/api/state' && req.method === 'GET') {
    const user = await getAuthenticatedUser(req, db);
    if (!user) return sendJSON(res, 401, { error: 'Not authenticated' });

    // Supabase
    if (user.isSupabase || supabase.isConfigured) {
      try {
        const board = await supabase.getBoard(user.id, user.token);
        if (board && board.state_json) {
          const parsed = typeof board.state_json === 'string' ? JSON.parse(board.state_json) : board.state_json;
          return sendJSON(res, 200, { ok: true, d: { data: parsed, rev: board.rev || 1 } });
        }
      } catch (e) {
        console.error('Supabase getBoard exception:', e);
      }
    }

    // SQLite fallback
    if (db) {
      const row = db.prepare('SELECT state_json, rev FROM boards WHERE user_id = ?').get(user.id);
      if (!row) return sendJSON(res, 200, { ok: true, d: { data: null, rev: 0 } });
      try {
        return sendJSON(res, 200, { ok: true, d: { data: JSON.parse(row.state_json), rev: row.rev } });
      } catch (e) {
        return sendJSON(res, 200, { ok: true, d: { data: null, rev: 0 } });
      }
    }

    return sendJSON(res, 200, { ok: true, d: { data: null, rev: 0 } });
  }

  // 8. State PUT
  if (urlPath === '/api/state' && req.method === 'PUT') {
    const user = await getAuthenticatedUser(req, db);
    if (!user) return sendJSON(res, 401, { error: 'Not authenticated' });

    const { data, rev } = await readBody(req);
    if (!data) return sendJSON(res, 400, { error: 'Missing state data' });

    // Supabase
    if (user.isSupabase || supabase.isConfigured) {
      try {
        const currentBoard = await supabase.getBoard(user.id, user.token);
        const nextRev = ((currentBoard && currentBoard.rev) || (rev || 0)) + 1;
        await supabase.saveBoard(user.id, data, nextRev, user.token);
        return sendJSON(res, 200, { ok: true, d: { rev: nextRev } });
      } catch (e) {
        console.error('Supabase saveBoard exception:', e);
      }
    }

    // SQLite fallback
    if (db) {
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

    return sendJSON(res, 200, { ok: true, d: { rev: 1 } });
  }

  // 9. Pricing, Profile, Me metadata
  if (urlPath === '/api/me') {
    const user = await getAuthenticatedUser(req, db);
    return sendJSON(res, 200, { ok: true, d: user ? { email: user.email, name: user.name, pro: true } : { email: 'guest', pro: true } });
  }
  if (urlPath === '/api/pricing') return sendJSON(res, 200, { ok: true, d: {} });
  if (urlPath === '/api/profile') return sendJSON(res, 200, { ok: true, d: {} });

  return sendJSON(res, 404, { error: 'Endpoint not found' });
}

module.exports = {
  handleApiRequest,
  parseCookies,
  hashPassword,
  getAuthenticatedUser
};
