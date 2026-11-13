import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import type { AuthenticatedSessionProvider } from './transport';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
let client: SupabaseClient | null = null;

export function cloudSyncConfiguration(): { url: string; publishableKey: string } | null {
  if (!url || !publishableKey) return null;
  if (!/^https?:\/\//.test(url)) return null;
  return { url, publishableKey };
}

export function cloudAuthClient(): SupabaseClient | null {
  const configuration = cloudSyncConfiguration();
  if (!configuration) return null;
  if (!client) {
    client = createClient(configuration.url, configuration.publishableKey, {
      auth: {
        storage: {
          getItem: (key) => SecureStore.getItemAsync(key),
          setItem: (key, value) => SecureStore.setItemAsync(key, value),
          removeItem: (key) => SecureStore.deleteItemAsync(key),
        },
        storageKey: 'retail-pilot-auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export function cloudSessionProvider(auth: SupabaseClient): AuthenticatedSessionProvider {
  return {
    async getSession() {
      const { data, error } = await auth.auth.getSession();
      if (error || !data.session) return null;
      return {
        accessToken: data.session.access_token,
        expiresAt: data.session.expires_at
          ? new Date(data.session.expires_at * 1000).toISOString() : undefined,
      };
    },
  };
}
