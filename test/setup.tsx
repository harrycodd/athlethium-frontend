/**
 * Global test doubles. Nothing here talks to Firebase or the network:
 *  - '@/lib/firebase' exports fake auth/db objects (tests set `auth.currentUser`).
 *  - expo-router's navigation is captured in `mockRouter` so tests can assert on routes.
 *  - Alert.alert is a spy so tests can assert on messages and press its buttons.
 */
import React from 'react';
import { Alert, Text } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
  db: { __fake: 'firestore' },
  app: {},
  default: {},
}));

jest.mock('firebase/firestore', () => require('./fake-firestore'));

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(() => () => {}),
  getAuth: jest.fn(),
  initializeAuth: jest.fn(),
  getReactNativePersistence: jest.fn(),
}));

// Real translations, in English: screens render exactly what an English-speaking user sees.
import i18n from '@/lib/i18n';

const missingKeys: string[] = [];
i18n.options.saveMissing = true;
i18n.options.missingKeyHandler = (_lngs, ns, key) => {
  missingKeys.push(`${ns}:${key}`);
};

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

afterEach(() => {
  // a screen asked for a translation that doesn't exist (it would show the raw key to users)
  const missing = missingKeys.splice(0);
  if (missing.length) throw new Error(`Missing translation keys: ${[...new Set(missing)].join(', ')}`);
});

export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
};

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual('react');
  const { Text: RNText } = jest.requireActual('react-native');
  return {
    useRouter: () => mockRouter,
    router: mockRouter,
    useLocalSearchParams: () => ({}),
    useSegments: () => [],
    useFocusEffect: (cb: () => void) => ReactActual.useEffect(cb, [cb]),
    Redirect: ({ href }: { href: string }) => ReactActual.createElement(RNText, null, `redirect:${href}`),
    Link: ({ children }: { children: React.ReactNode }) => children,
    Stack: Object.assign(() => null, { Screen: () => null }),
    Tabs: Object.assign(() => null, { Screen: () => null }),
  };
});

jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn(), maybeCompleteAuthSession: jest.fn() }));

beforeEach(() => {
  require('./fake-firestore').fakeFirestore.reset();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllMocks();
});

// keep TS happy about the unused import in some environments
void Text;
