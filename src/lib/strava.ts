import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { callFunction } from './api';

export type StravaConnectResult = { status: 'connected' } | { status: 'cancelled' } | { status: 'error'; error: string };

/**
 * Connects Strava. The backend issues a single-use OAuth state bound to the signed-in user,
 * so the app never builds the state (or picks the user id) itself.
 */
export async function connectStrava(returnPath: string): Promise<StravaConnectResult> {
  const returnUrl = Linking.createURL(returnPath);
  const { authUrl } = await callFunction<{ authUrl: string }>('strava_auth_start', { returnUrl });
  const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);
  if (result.type !== 'success' || !result.url) {
    return { status: 'cancelled' };
  }
  const { queryParams } = Linking.parse(result.url);
  if (queryParams?.success === 'true') {
    return { status: 'connected' };
  }
  return { status: 'error', error: String(queryParams?.error ?? 'unknown_error') };
}

/** Revokes Strava access and deletes the stored tokens on the server. */
export async function disconnectStrava(): Promise<void> {
  await callFunction('strava_disconnect');
}
