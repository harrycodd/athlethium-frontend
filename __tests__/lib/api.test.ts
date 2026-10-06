import { auth } from '@/lib/firebase';
import { ApiError, authHeaders, callFunction, deviceTimeZone, functionUrl } from '@/lib/api';

const signIn = (token = 'id-token') => {
  (auth as any).currentUser = { uid: 'u1', getIdToken: jest.fn().mockResolvedValue(token) };
};

const respond = (status: number, body: unknown) =>
  (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  });

beforeEach(() => {
  globalThis.fetch = jest.fn();
  (auth as any).currentUser = null;
});

describe('callFunction', () => {
  it('sends the ID token as a bearer header and posts JSON', async () => {
    signIn('abc');
    respond(200, { ok: true });
    await expect(callFunction('generate_training_session', { date: '2026-10-06' })).resolves.toEqual({ ok: true });
    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(functionUrl('generate_training_session'));
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer abc');
    expect(JSON.parse(init.body)).toEqual({ date: '2026-10-06' });
  });

  it('refuses to call the backend when signed out', async () => {
    await expect(callFunction('anything')).rejects.toMatchObject({ status: 401 });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('surfaces the backend error message and status', async () => {
    signIn();
    respond(400, { error: 'days must be between 1 and 28' });
    const err = await callFunction('generate_training_session').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, message: 'days must be between 1 and 28' });
  });

  it('falls back to the raw text for non-JSON errors', async () => {
    signIn();
    respond(502, 'Bad Gateway');
    await expect(callFunction('x')).rejects.toMatchObject({ status: 502, message: 'Bad Gateway' });
    respond(500, '');
    await expect(callFunction('x')).rejects.toMatchObject({ message: 'Request failed (500)' });
  });
});

it('authHeaders merges extra headers', async () => {
  signIn('t');
  await expect(authHeaders({ Accept: 'x' })).resolves.toEqual({ Accept: 'x', Authorization: 'Bearer t' });
});

it('deviceTimeZone returns an IANA zone', () => {
  expect(deviceTimeZone()).toMatch(/\w+/);
});
