/**
 * Every user-visible string goes through i18n. Uses scripts/find-untranslated.js; mark a deliberate
 * exception with `// i18n-ignore` on that line.
 */
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { scan, walk } = require('../../scripts/find-untranslated.js');

it('no hard-coded user-visible text in the app', () => {
  const root = path.join(__dirname, '..', '..', 'src');
  const found: string[] = walk(root).flatMap((file: string) => scan(file))
    .map((line: string) => path.relative(root, line));
  expect(found).toEqual([]);
});
