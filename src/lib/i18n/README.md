# Translations

The app ships in English, Spanish, French, German, Italian and Japanese (`languages.ts`).

- **Default language:** the phone's language, if supported; otherwise English.
- **Changing language:** in Settings. The choice is saved on the device and on the athlete's
  profile (`users/{uid}.language`), so every device follows it.
- **Generated plan text:** the backend writes session names, steps and coach notes in the
  profile's language. After a change, upcoming unfinished sessions are regenerated.

## Files

`locales/<language>/<namespace>.json`. Each area of the app has its own namespace:

| Namespace | Used by |
|---|---|
| `common` | words shared everywhere (Save, Cancel, sport names, ...) |
| `auth` | login, sign-up, password reset |
| `tabs` | tab bar |
| `home`, `plan`, `progress` | the three tabs |
| `readiness` | daily readiness check-in |
| `session`, `activity` | session details and analysis; live activity recording |
| `addTraining`, `goal` | logging extra training; goal countdown |
| `settings`, `wizard` | settings; onboarding |

`locales/index.ts` imports every file statically (Metro can't load dynamic paths). If you add a
namespace, add it there for every language.

## Writing UI text

```tsx
const { t } = useTranslation('plan');
<Text>{t('emptyDay')}</Text>                                      // plan.json: "emptyDay": "..."
<Text>{t('common:cancel')}</Text>                                 // shared words
<Text>{t('sessionsLeft', { count: n })}</Text>                    // "sessionsLeft_one" / "_other"
<Text>{t('greeting', { name })}</Text>                            // "Good morning, {{name}}"
<Text>{formatDate(day, 'EEEE, MMMM do')}</Text>                  // localized dates
```

- **Whole sentences:** translate whole sentences with `{{placeholders}}`. Never glue fragments
  together, because word order differs between languages.
- **Plurals:** use `count` with `_one` / `_other` keys. Japanese only needs `_other`.
- **Stored values stay in English:** never translate values saved to Firestore or sent to the
  backend (sport codes, `units`, goal types). Translate only the label shown for them.
- **Tables of labels:** module-level tables should hold keys, not text. Call `t()` when rendering,
  so a language change takes effect immediately.
- **Dates:** use `formatDate` (in `format.ts`) for display. Keep `format(d, 'yyyy-MM-dd')` for
  storage keys.

## Checks

- **`npm test`:**
  - fails if a language is missing a key, a plural form or a `{{placeholder}}`;
  - fails if code uses a key that doesn't exist;
  - fails if a rendered screen asks for an unknown key.
- **`node scripts/find-untranslated.js [files]`:** lists hard-coded user-visible text. Mark a
  deliberate exception with `// i18n-ignore`.
