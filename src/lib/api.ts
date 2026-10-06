import { auth } from './firebase';

/**
 * Authenticated client for Athlethium Cloud Functions.
 * Every call carries the signed-in user's Firebase ID token; the backend derives the user
 * from the token and rejects requests without one.
 */
export const FUNCTIONS_BASE_URL =
  process.env.EXPO_PUBLIC_FUNCTIONS_BASE_URL ?? 'https://europe-west2-athlethium-app.cloudfunctions.net';

export const functionUrl = (name: string) => `${FUNCTIONS_BASE_URL}/${name}`;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function getIdTokenOrThrow(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new ApiError('You need to be signed in.', 401);
  }
  return user.getIdToken();
}

export async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  return { ...extra, Authorization: `Bearer ${await getIdTokenOrThrow()}` };
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    if (parsed?.error) return String(parsed.error);
  } catch {
    // not JSON
  }
  return text || `Request failed (${response.status})`;
}

/** POSTs JSON to a Cloud Function and returns the parsed JSON response. */
export async function callFunction<T = any>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(functionUrl(name), {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }
  return response.json() as Promise<T>;
}

/** The device's IANA time zone, e.g. "Europe/London". */
export function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}
