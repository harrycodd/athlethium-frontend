/** Following the phone's language, and keeping the profile (which the plan is written in) in step. */
/* eslint-disable @typescript-eslint/no-require-imports -- modules are loaded per test in isolation */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@/lib/user-service', () => ({ updateUserProfile: jest.fn(async () => {}) }));
jest.mock('@/lib/workout-service', () => ({ regenerateIncompleteGeneratedWorkouts: jest.fn(async () => {}) }));

// language.ts keeps the restored choice in module state, so each test loads it (and the modules
// it shares state with) afresh, with the phone set to `tag`.
const load = (tag: string) => {
  let mods!: {
    language: typeof import('@/lib/i18n/language');
    i18n: typeof import('@/lib/i18n').default;
    updateUserProfile: jest.Mock;
    regenerate: jest.Mock;
  };
  // The phone languages are read lazily, after isolation ends, so spy on the shared module.
  jest
    .spyOn(require('expo-localization'), 'getLocales')
    .mockReturnValue([{ languageTag: tag, languageCode: tag.split('-')[0] }]);
  jest.isolateModules(() => {
    mods = {
      language: require('@/lib/i18n/language'),
      i18n: require('@/lib/i18n').default,
      updateUserProfile: require('@/lib/user-service').updateUserProfile,
      regenerate: require('@/lib/workout-service').regenerateIncompleteGeneratedWorkouts,
    };
  });
  return mods;
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(() => jest.restoreAllMocks());

it('follows the phone and writes its language to the profile', async () => {
  const { language, i18n, updateUserProfile, regenerate } = load('fr-FR');

  await language.syncProfileLanguage('u1', { language: 'en', scheduleDaysAhead: 3 });

  expect(language.followsDeviceLanguage()).toBe(true);
  expect(i18n.language).toBe('fr');
  expect(updateUserProfile).toHaveBeenCalledWith('u1', { language: 'fr' });
  expect(regenerate).toHaveBeenCalledWith('u1', 3);
});

it('does nothing when the profile already matches the phone', async () => {
  const { language, i18n, updateUserProfile } = load('de-DE');

  await language.syncProfileLanguage('u1', { language: 'de' });

  expect(i18n.language).toBe('de');
  expect(updateUserProfile).not.toHaveBeenCalled();
});

it('writes the language once when two snapshots arrive together', async () => {
  const { language, updateUserProfile, regenerate } = load('es-ES');

  await Promise.all([
    language.syncProfileLanguage('u1', { language: 'en' }),
    language.syncProfileLanguage('u1', { language: 'en' }),
  ]);

  expect(updateUserProfile).toHaveBeenCalledTimes(1);
  expect(regenerate).toHaveBeenCalledTimes(1);
});

it('uses the profile language when one was picked on this device', async () => {
  await AsyncStorage.setItem('athlethium.language', 'it');
  const { language, i18n, updateUserProfile } = load('fr-FR');

  await language.syncProfileLanguage('u1', { language: 'ja' });

  expect(language.followsDeviceLanguage()).toBe(false);
  expect(i18n.language).toBe('ja');
  expect(updateUserProfile).not.toHaveBeenCalled();
});

it('switches back to the phone language from Settings', async () => {
  await AsyncStorage.setItem('athlethium.language', 'en');
  const { language, i18n, updateUserProfile, regenerate } = load('it-IT');
  await language.restoreLanguage();

  await language.changeAppLanguage('device', { uid: 'u1' }, 2);

  expect(language.followsDeviceLanguage()).toBe(true);
  expect(i18n.language).toBe('it');
  expect(await AsyncStorage.getItem('athlethium.language')).toBe('device');
  expect(updateUserProfile).toHaveBeenCalledWith('u1', { language: 'it' });
  expect(regenerate).toHaveBeenCalledWith('u1', 2);
});
