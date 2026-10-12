#!/usr/bin/env node
/**
 * Lists user-visible text that is hard-coded instead of going through i18n `t()`.
 *
 *   node scripts/find-untranslated.js            # all of src/
 *   node scripts/find-untranslated.js src/app/settings.tsx
 *
 * Flags: JSX text, text-like props (placeholder, label, title, ...), Alert.alert arguments, and
 * capitalised/multi-word string literals inside JSX expressions. Brand names, units and symbols in
 * ALLOWED are fine. Silence a deliberate exception with a `// i18n-ignore` comment on that line.
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const TEXT_PROPS = new Set(['placeholder', 'label', 'title', 'subtitle', 'accessibilityLabel',
  'message', 'text', 'description', 'headerTitle', 'tabBarLabel', 'emptyText', 'confirmText', 'cancelText']);
// Words that read the same in every language.
const ALLOWED = new Set(['Athlethium', 'Strava', 'Wahoo', 'Garmin', 'FIT', 'TSS', 'CTL', 'ATL', 'TSB', 'FTP',
  'FTHR', 'CSS', 'RPE', 'HR', 'W', 'kg', 'lb', 'km', 'mi', 'm', 'yd', 'h', 'min', 's', 'bpm', 'rpm', 'kcal',
  'Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'VO2max', 'VO2', 'IF', 'NP', 'OK', 'AM', 'PM', '•', '·', '—', '-', '/']);
const NON_TEXT_CALLS = new Set(['t', 'require', 'format', 'formatDate', 'parseISO', 'StyleSheet.create',
  'console.log', 'console.warn', 'console.error', 'router.push', 'router.replace', 'cn', 'clsx', 'twMerge',
  'Error', 'callFunction', 'doc', 'collection', 'where', 'Date']);

function hasWords(text) {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed || !/[A-Za-z]/.test(trimmed)) return false;
  const words = trimmed.split(/[\s,.:;!?()+%/\-–—·•]+/).filter(Boolean);
  return words.some((w) => /[A-Za-z]/.test(w) && !ALLOWED.has(w) && !/^\d/.test(w));
}

function calleeName(call) {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return `${e.expression.getText()}.${e.name.text}`;
  return '';
}

function scan(file) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = [];
  const report = (node, text) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
    if (/i18n-ignore/.test(lines[line] || '') || /i18n-ignore/.test(lines[line - 1] || '')) return;
    out.push(`${file}:${line + 1}: ${JSON.stringify(text.replace(/\s+/g, ' ').trim()).slice(0, 90)}`);
  };
  const insideNonTextCall = (node) => {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isCallExpression(p)) return NON_TEXT_CALLS.has(calleeName(p)) || NON_TEXT_CALLS.has(calleeName(p).split('.').pop());
      if (ts.isJsxAttribute(p)) return ['style', 'className', 'key', 'testID', 'variant', 'size', 'shape', 'name'].includes(p.name.getText());
      if (ts.isBinaryExpression(p) && /^(===|!==|==|!=)$/.test(p.operatorToken.getText())) return true;
      if (ts.isCaseClause(p) || ts.isElementAccessExpression(p) || ts.isPropertyAssignment(p) && p.name.getText() === 'pathname') return true;
      if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isFunctionLike(p)) return false;
    }
    return false;
  };
  const visit = (node) => {
    if (ts.isJsxText(node) && hasWords(node.getText())) report(node, node.getText());
    if (ts.isJsxAttribute(node) && TEXT_PROPS.has(node.name.getText()) && node.initializer
        && ts.isStringLiteral(node.initializer) && hasWords(node.initializer.text)) report(node, node.initializer.text);
    if (ts.isCallExpression(node) && calleeName(node) === 'Alert.alert') {
      node.arguments.slice(0, 2).forEach((a) => {
        if ((ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) && hasWords(a.text)) report(a, a.text);
        if (ts.isTemplateExpression(a) && hasWords(a.head.text)) report(a, a.getText());
      });
    }
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node))
        && !ts.isJsxAttribute(node.parent) && !ts.isImportDeclaration(node.parent)) {
      const text = ts.isTemplateExpression(node) ? node.head.text + node.templateSpans.map((s) => s.literal.text).join(' ') : node.text;
      let inJsx = false;
      for (let p = node.parent; p; p = p.parent) {
        if (ts.isJsxExpression(p)) { inJsx = true; break; }
        if (ts.isFunctionLike(p) || ts.isSourceFile(p)) break;
      }
      if (inJsx && /[A-Z]|\s\S/.test(text) && hasWords(text) && !insideNonTextCall(node)) report(node, text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

function walk(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return /\.tsx$/.test(target) ? [target] : [];
  return fs.readdirSync(target).flatMap((f) => walk(path.join(target, f)));
}

if (require.main === module) {
  const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['src'];
  const found = targets.flatMap(walk).flatMap(scan);
  found.forEach((l) => console.log(l));
  console.log(`\n${found.length} untranslated string(s)`);
  process.exitCode = found.length ? 1 : 0;
}

module.exports = { scan, walk };
