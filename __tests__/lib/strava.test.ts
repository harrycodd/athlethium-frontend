import * as WebBrowser from 'expo-web-browser';
import { auth } from '@/lib/firebase';
import { connectStrava, disconnectStrava } from '@/lib/strava';

jest.mock('expo-linking', () => ({
  createURL: (path: string) => `athlethium://${path}`,
  parse: (url: string) => ({ queryParams: Object.fromEntries(new URL(url).searchParams) }),
}));

const AUTH_URL = 'https://www.strava.com/oauth/mobile/authorize?state=server-issued';

beforeEach(() => {
  (auth as any).currentUser = { uid: 'u1', getIdToken: jest.fn().mockResolvedValue('tok') };
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ authUrl: AUTH_URL }) });
});

const browserReturns = (result: object) => (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue(result);

it('starts OAuth on the server and opens the URL it issues', async () => {
  browserReturns({ type: 'success', url: 'athlethium://settings?success=true' });
  await expect(connectStrava('settings')).resolves.toEqual({ status: 'connected' });

  const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
  expect(url).toMatch(/\/strava_auth_start$/);
  expect(JSON.parse(init.body)).toEqual({ returnUrl: 'athlethium://settings' });
  expect(init.body).not.toContain('u1'); // the server derives the user from the token
  expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(AUTH_URL, 'athlethium://settings');
});

it('reports a cancelled browser session', async () => {
  browserReturns({ type: 'cancel' });
  await expect(connectStrava('wizard')).resolves.toEqual({ status: 'cancelled' });
});

it('passes the server error code through', async () => {
  browserReturns({ type: 'success', url: 'athlethium://settings?success=false&error=strava_auth_rejected' });
  await expect(connectStrava('settings')).resolves.toEqual({ status: 'error', error: 'strava_auth_rejected' });
});

it('disconnect calls the server to revoke access', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
  await disconnectStrava();
  expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toMatch(/\/strava_disconnect$/);
});
