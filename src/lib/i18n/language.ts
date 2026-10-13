import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './index';
import { isSupportedLanguage, type LanguageCode } from './languages';
import { updateUserProfile } from '@/lib/user-service';
import { regenerateIncompleteGeneratedWorkouts } from '@/lib/workout-service';

const STORAGE_KEY = 'athlethium.language';

/** Applies a language on this device and remembers it for the next launch. */
export async function applyLanguage(code: LanguageCode): Promise<void> {
  if (i18n.language !== code) {
    await i18n.changeLanguage(code);
  }
  try {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } catch {
    // storage unavailable: the choice still applies for this session
  }
}

/** On launch: use the language chosen on this device before, if any. */
export async function restoreLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (isSupportedLanguage(saved) && saved !== i18n.language) {
      await i18n.changeLanguage(saved);
    }
  } catch {
    // keep the phone's language
  }
}

/**
 * The athlete picked a language in Settings: switch the app, save it on their profile (so other
 * devices and the coach notes follow), and rewrite upcoming unfinished sessions in that language.
 */
export async function changeAppLanguage(
  code: LanguageCode,
  user?: { uid: string } | null,
  scheduleDaysAhead?: number
): Promise<void> {
  await applyLanguage(code);
  if (!user) return;
  await updateUserProfile(user.uid, { language: code });
  try {
    await regenerateIncompleteGeneratedWorkouts(user.uid, scheduleDaysAhead || 1);
  } catch (err) {
    console.warn('Could not regenerate sessions in the new language:', err);
  }
}
