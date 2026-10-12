/**
 * Translation integrity: every language has every English key (with the plural forms it needs),
 * the same {{placeholders}}, no empty strings, and every key the code uses exists.
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { resources, NAMESPACES } from '@/lib/i18n/locales';
import { LANGUAGES } from '@/lib/i18n/languages';

type Tree = { [k: string]: string | Tree };
const PLURAL = /_(zero|one|two|few|many|other)$/;

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flatten(v, key) };
  }, {});
}

const flat = (lang: string, ns: string) => flatten(((resources as any)[lang][ns] ?? {}) as Tree);
const baseKeys = (entries: Record<string, string>) => new Set(Object.keys(entries).map((k) => k.replace(PLURAL, '')));
const placeholders = (text: string) => new Set([...text.matchAll(/{{\s*([\w.]+)[^}]*}}/g)].map((m) => m[1]));

const others = LANGUAGES.map((l) => l.code).filter((c) => c !== 'en');

describe.each(NAMESPACES)('namespace %s', (ns) => {
  const en = flat('en', ns);

  it('English has no empty strings', () => {
    expect(Object.entries(en).filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([]);
  });

  it.each(others)('%s has exactly the English keys', (lang) => {
    const theirs = flat(lang, ns);
    const mine = baseKeys(en);
    const got = baseKeys(theirs);
    expect({ missing: [...mine].filter((k) => !got.has(k)), extra: [...got].filter((k) => !mine.has(k)) })
      .toEqual({ missing: [], extra: [] });
    expect(Object.entries(theirs).filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([]);
  });

  it.each(others)('%s has the plural forms its grammar needs', (lang) => {
    const theirs = flat(lang, ns);
    const needed = new Intl.PluralRules(lang).resolvedOptions().pluralCategories
      .filter((c) => c !== 'many'); // "many" only applies to numbers in the millions here
    const pluralBases = [...new Set(Object.keys(en).filter((k) => PLURAL.test(k)).map((k) => k.replace(PLURAL, '')))];
    const missing = pluralBases.flatMap((base) => needed.filter((c) => !(`${base}_${c}` in theirs)).map((c) => `${base}_${c}`));
    expect(missing).toEqual([]);
  });

  it.each(others)('%s keeps every {{placeholder}}', (lang) => {
    const theirs = flat(lang, ns);
    const problems: string[] = [];
    for (const base of baseKeys(en)) {
      const enVars = new Set(Object.entries(en).filter(([k]) => k.replace(PLURAL, '') === base)
        .flatMap(([, v]) => [...placeholders(v)]));
      const forms = Object.entries(theirs).filter(([k]) => k.replace(PLURAL, '') === base);
      const used = new Set(forms.flatMap(([, v]) => [...placeholders(v)]));
      for (const v of used) if (!enVars.has(v)) problems.push(`${base}: unknown {{${v}}}`);
      for (const v of enVars) if (v !== 'count' && !used.has(v)) problems.push(`${base}: lost {{${v}}}`);
    }
    expect(problems).toEqual([]);
  });
});

describe('keys used in code', () => {
  const root = path.join(__dirname, '..', '..', 'src');
  const files = (dir: string): string[] => fs.readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return fs.statSync(p).isDirectory() ? files(p) : /\.(tsx?|jsx?)$/.test(f) ? [p] : [];
  });

  it('every literal t() key exists in English', () => {
    const missing: string[] = [];
    for (const file of files(root)) {
      const src = fs.readFileSync(file, 'utf8');
      if (!/\bt\(|i18n\.t\(/.test(src)) continue;
      const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      let fileNs = ['common'];
      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) && node.expression.getText(sf) === 'useTranslation' && node.arguments[0]) {
          const a = node.arguments[0];
          if (ts.isStringLiteral(a)) fileNs = [a.text];
          if (ts.isArrayLiteralExpression(a)) fileNs = a.elements.filter(ts.isStringLiteral).map((e) => e.text);
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
      const check = (node: ts.Node) => {
        if (ts.isCallExpression(node) && /^(t|i18n\.t)$/.test(node.expression.getText(sf))
            && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
          const key = node.arguments[0].text;
          const opts = node.arguments[1];
          const nsOpt = opts && ts.isObjectLiteralExpression(opts) ? opts.properties.find(
            (p) => ts.isPropertyAssignment(p) && p.name.getText(sf) === 'ns') as ts.PropertyAssignment | undefined : undefined;
          const [ns, k] = key.includes(':') ? key.split(':') as [string, string]
            : [nsOpt && ts.isStringLiteral(nsOpt.initializer) ? nsOpt.initializer.text : fileNs[0], key];
          const en = flat('en', ns);
          const found = k in en || Object.keys(en).some((x) => x.replace(PLURAL, '') === k)
            || Object.keys(en).some((x) => x.startsWith(`${k}.`)); // returnObjects on a subtree
          if (!found) missing.push(`${path.relative(root, file)}: ${ns}:${k}`);
        }
        ts.forEachChild(node, check);
      };
      check(sf);
    }
    expect(missing).toEqual([]);
  });
});
