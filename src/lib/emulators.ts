/**
 * Local development against the Firebase Emulator Suite (see README).
 * Off unless EXPO_PUBLIC_USE_EMULATORS=true, so production builds always use athlethium-app.
 */
export const USE_EMULATORS = process.env.EXPO_PUBLIC_USE_EMULATORS === 'true';

/** 127.0.0.1 for iOS simulator/web; 10.0.2.2 for the Android emulator; a LAN IP for a device. */
export const EMULATOR_HOST = process.env.EXPO_PUBLIC_EMULATOR_HOST || '127.0.0.1';

/** demo-* projects can never reach real Firebase resources. */
export const EMULATOR_PROJECT_ID = 'demo-athlethium';
