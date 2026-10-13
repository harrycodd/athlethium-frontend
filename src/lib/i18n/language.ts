import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './index';
import { deviceLanguage, isSupportedLanguage, type LanguageCode } from './languages';
import { updateUserProfile } from '@/lib/user-service';
import { regenerateIncompleteGeneratedWorkouts } from '@/lib/workout-service';

const STORAGE_KEY = 'athlethium.language';

/** What the athlete chose in Settings: a fixed language, or whatever the phone is set to. */
export const DEVICE_LANGUAGE = 'device';
export type LanguageChoice = LanguageCode | typeof DEVICE_LANGUAGE;

// Until the athlete picks a language on this device, the app follows the phone.
let choice: LanguageChoice = DEVICE_LANGUAGE;
let restored: Promise<void> | undefined;
// The language being written to the profile, so a second snapshot doesn't write it again.
let writing: LanguageCode | undefined;

/** True when this device uses the phone's language rather than a fixed choice. */
export function followsDeviceLanguage(): boolean {
  return choice === DEVICE_LANGUAGE;
}

/** Applies a language on this device and remembers the choice for the next launch. */
export async function applyLanguage(next: LanguageChoice): Promise<void> {
  choice = next;
  const code = next === DEVICE_LANGUAGE ? deviceLanguage() : next;
  if (i18n.language !== code) {
    await i18n.changeLanguage(code);
  }
  try {
    await AsyncStorage.setItem(STORAGE_KEY, next);
  } catch {
    // storage unavailable: the choice still applies for this session
  }
}

/** On launch: use the language chosen on this device before, if any. Runs once. */
export function restoreLanguage(): Promise<void> {
  restored ??= (async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (isSupportedLanguage(saved)) {
        choice = saved;
        if (saved !== i18n.language) await i18n.changeLanguage(saved);
      }
    } catch {
      // keep the phone's language
    }
  })();
  return restored;
}

/**
 * The profile loaded. A device that follows the phone writes the phone's language to the profile
 * (so the plan is written in it); otherwise the profile's language follows the athlete across
 * devices, and older profiles adopt the language this device is using.
 */
export async function syncProfileLanguage(
  uid: string,
  profile: { language?: unknown; scheduleDaysAhead?: number }
): Promise<void> {
  await restoreLanguage();
  if (followsDeviceLanguage() || !isSupportedLanguage(profile.language)) {
    const code = followsDeviceLanguage() ? deviceLanguage() : (i18n.language as LanguageCode);
    if (i18n.language !== code) await i18n.changeLanguage(code);
    if (profile.language === code || writing === code) return;
    writing = code;
    try {
      await updateUserProfile(uid, { language: code });
      if (isSupportedLanguage(profile.language)) {
        // The phone's language changed since the plan was written.
        await regenerateIncompleteGeneratedWorkouts(uid, profile.scheduleDaysAhead || 1);
      }
    } finally {
      writing = undefined;
    }
  } else if (profile.language !== i18n.language) {
    await applyLanguage(profile.language);
  }
}

/**
 * The athlete picked a language in Settings: switch the app, save it on their profile (so other
 * devices and the coach notes follow), and rewrite upcoming unfinished sessions in that language.
 */
export async function changeAppLanguage(
  next: LanguageChoice,
  user?: { uid: string } | null,
  scheduleDaysAhead?: number
): Promise<void> {
  const before = i18n.language;
  await applyLanguage(next);
  if (!user) return;
  const code = i18n.language as LanguageCode;
  await updateUserProfile(user.uid, { language: code });
  if (code === before) return;
  try {
    await regenerateIncompleteGeneratedWorkouts(user.uid, scheduleDaysAhead || 1);
  } catch (err) {
    console.warn('Could not regenerate sessions in the new language:', err);
  }
}
