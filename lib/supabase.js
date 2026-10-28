// lib/supabase.js
// Supabase Client and Database Service Layer
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isConfigured = !!(SUPABASE_URL && (SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY));

let supabaseAdmin = null;
let supabaseAnon = null;

if (isConfigured) {
  if (SUPABASE_SERVICE_KEY) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  if (SUPABASE_ANON_KEY) {
    supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
}

// Client for user-scoped requests
function getClientForToken(token) {
  if (!isConfigured) return null;
  const key = SUPABASE_ANON_KEY || SUPABASE_SERVICE_KEY;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {}
  });
}

// Auth operations
async function signUp({ email, password, name }) {
  if (!isConfigured) return { fallback: true };
  const client = supabaseAnon || supabaseAdmin;
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { name: name || email.split('@')[0], full_name: name || email.split('@')[0] }
    }
  });
  if (error) throw error;
  return data;
}

async function signIn({ email, password }) {
  if (!isConfigured) return { fallback: true };
  const client = supabaseAnon || supabaseAdmin;
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function getUser(token) {
  if (!isConfigured || !token) return null;
  const client = supabaseAdmin || supabaseAnon;
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data || !data.user) return null;
    const u = data.user;
    return {
      id: u.id,
      email: u.email,
      name: (u.user_metadata && (u.user_metadata.name || u.user_metadata.full_name)) || u.email.split('@')[0]
    };
  } catch (err) {
    return null;
  }
}

async function resetPasswordForEmail(email, redirectTo) {
  if (!isConfigured) return { fallback: true };
  const client = supabaseAnon || supabaseAdmin;
  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || undefined
  });
  if (error) throw error;
  return data;
}

async function updateUserPassword(token, newPassword) {
  if (!isConfigured) return { fallback: true };
  const client = getClientForToken(token);
  if (!client) throw new Error('Supabase client not initialized');
  const { data, error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

// Board operations
async function getBoard(userId, token) {
  if (!isConfigured) return null;
  const client = supabaseAdmin || (token ? getClientForToken(token) : supabaseAnon);
  const { data, error } = await client
    .from('boards')
    .select('state_json, rev, updated_at')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is row not found
    console.error('Supabase getBoard error:', error.message);
  }
  return data;
}

async function saveBoard(userId, state, nextRev, token) {
  if (!isConfigured) return null;
  const client = supabaseAdmin || (token ? getClientForToken(token) : supabaseAnon);
  const { data, error } = await client
    .from('boards')
    .upsert({
      user_id: userId,
      state_json: state,
      rev: nextRev,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    .select('rev')
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  isConfigured,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  supabaseAdmin,
  supabaseAnon,
  getClientForToken,
  signUp,
  signIn,
  getUser,
  resetPasswordForEmail,
  updateUserPassword,
  getBoard,
  saveBoard
};
