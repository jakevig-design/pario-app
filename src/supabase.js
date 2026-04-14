// src/supabase.js
// ─────────────────────────────────────────────────────────────
// Supabase client with auth + multi-tenant support.
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn('Supabase env vars missing — persistence disabled.');
}

export const supabase = (url && key) ? createClient(url, key) : null;

// ─── Auth ─────────────────────────────────────────────────────

export async function signIn(email, password) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signUp(email, password) {
  if (!supabase) return { error: { message: 'Supabase not configured' } };
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAuthStateChange(callback) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

// ─── User & tenant profile ────────────────────────────────────

export async function loadUserProfile() {
  if (!supabase) return null;
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, tenant_config(*)')
    .eq('user_id', session.user.id)
    .single();
  if (error) { console.error('Profile load error:', error); return null; }
  return data;
}

export async function saveUserProfile({ name, title, role }) {
  if (!supabase) return null;
  const session = await getSession();
  if (!session) return null;
  const { error } = await supabase
    .from('user_profiles')
    .update({ name, title, role, updated_at: new Date().toISOString() })
    .eq('user_id', session.user.id);
  if (error) console.error('Profile save error:', error);
  return !error;
}

// ─── Session helpers ──────────────────────────────────────────

export async function saveSession({ id, projectTitle, status, data }) {
  if (!supabase) return null;
  const session = await getSession();
  let tenantId = null;
  let userId = null;
  if (session) {
    userId = session.user.id;
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', userId)
      .single();
    tenantId = profile?.tenant_id || null;
  }
  const { error } = await supabase
    .from('procurement_sessions')
    .upsert({
      id,
      project_title: projectTitle || 'Untitled',
      status,
      data,
      tenant_id: tenantId,
      user_id: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) console.error('Supabase save error:', error);
  return !error;
}

export async function loadSessions() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('procurement_sessions')
    .select('id, project_title, status, updated_at')
    .order('updated_at', { ascending: false });
  if (error) { console.error('Supabase load error:', error); return []; }
  return data || [];
}

export async function loadSession(id) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('procurement_sessions')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error('Supabase load error:', error); return null; }
  return data;
}

export async function deleteSession(id) {
  if (!supabase) return null;
  const { error } = await supabase
    .from('procurement_sessions')
    .delete()
    .eq('id', id);
  if (error) console.error('Supabase delete error:', error);
  return !error;
}
