// mobile/src/lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// Complete WebBrowser auth session if returning from OAuth
WebBrowser.maybeCompleteAuthSession();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key-here';

export const isSupabaseConfigured = !SUPABASE_URL.includes('your-project') && !SUPABASE_ANON_KEY.includes('your-supabase-anon');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Native Google OAuth helper
export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase URL and Anon Key must be configured in .env');
  }

  const redirectUrl = Linking.createURL('auth/callback');
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true
    }
  });

  if (error) throw error;
  if (!data?.url) throw new Error('No OAuth URL returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

  if (result.type === 'success' && result.url) {
    const url = result.url;
    // Extract access_token or refresh_token from redirect hash or query params
    const hashIndex = url.indexOf('#');
    const queryString = hashIndex !== -1 ? url.substring(hashIndex + 1) : url.split('?')[1] || '';
    const params = new URLSearchParams(queryString);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (sessionError) throw sessionError;
      return sessionData.session;
    }
  }

  return null;
}
